import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NPM_PUBLISH_ORDER } from './npm-publish-config.mjs';

const shared = vi.hoisted(() => ({
  events: [] as string[],
  fixtureSources: [] as string[],
  runCommand: vi.fn(),
  buildFreshWorkspaceArtifacts: vi.fn(),
  failCommand: null as null | ((command: string, args: string[]) => boolean),
}));

vi.mock('./lib/run-command.mjs', () => ({ runCommand: shared.runCommand }));
vi.mock('./lib/workspace-export-targets.mjs', () => ({
  buildFreshWorkspaceArtifacts: shared.buildFreshWorkspaceArtifacts,
}));
vi.mock('node:module', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createRequire: () => () => ({ shouldHideOnClose: () => true }),
  };
});

function captureNextPlatformFixture() {
  let root: string | undefined;
  const originalMkdtemp = fs.mkdtempSync;
  const spy = vi.spyOn(fs, 'mkdtempSync').mockImplementation((prefix, options) => {
    const created = originalMkdtemp(prefix, options);
    if (String(prefix).includes('wbk-platform-cjs-')) root = String(created);
    return created;
  });
  return {
    get root() {
      return root;
    },
    restore() {
      spy.mockRestore();
    },
  };
}

function writeExtractedLeaves(packDir: string) {
  const platform = packDir.includes('wbk-platform-cjs-');
  const leaves = platform
    ? [
        'allowlisted-https-fetch.cjs',
        'atomic-write.cjs',
        'node.cjs',
        'tray-close-policy.cjs',
        'window-bounds-persistence.cjs',
        'window-geometry.cjs',
        'window-residency.cjs',
      ]
    : [
        'assets/privileged-asset-protocol.js',
        'launch/host-launch.js',
        'lifecycle/application-quit-guard.js',
        'security/open-allowlisted-external-link.js',
        'security/require-owned-window-for-sender.js',
        'secrets/encrypted-secret-vault.js',
        'wallpaper/wallpaper-crop.js',
        'window/window-controls.js',
      ];
  for (const leaf of leaves) {
    const leafPath = path.join(packDir, 'package', 'dist', leaf);
    fs.mkdirSync(path.dirname(leafPath), { recursive: true });
    fs.writeFileSync(leafPath, '');
  }
}

function createParentFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-packed-consumer-test-'));
}

describe('same-run platform CJS checks', () => {
  beforeEach(() => {
    shared.events.length = 0;
    shared.fixtureSources.length = 0;
    shared.failCommand = null;
    shared.runCommand.mockReset();
    shared.runCommand.mockImplementation((command, args) => {
      shared.events.push(`${command} ${args.join(' ')}`);
      if (shared.failCommand?.(command, args)) throw new Error(`${command} failed`);
      if (command === 'npm') return 'fake-package.tgz\n';
      if (command === 'tar') writeExtractedLeaves(args.at(-1)!);
      if (command === 'pnpm' && args.includes('tsc')) {
        const config = args.at(-1)!;
        shared.fixtureSources.push(
          fs.readFileSync(path.join(path.dirname(config), 'smoke.ts'), 'utf8'),
        );
      }
      if (command === process.execPath && String(args[0]).endsWith('smoke.cjs')) {
        shared.fixtureSources.push(fs.readFileSync(args[0], 'utf8'));
      }
      return '';
    });
    shared.buildFreshWorkspaceArtifacts.mockReset();
    shared.buildFreshWorkspaceArtifacts.mockImplementation(() => {
      shared.events.push('workspace build');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('imports without work and makes its prepared closure one-shot', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    expect(shared.buildFreshWorkspaceArtifacts).not.toHaveBeenCalled();
    expect(shared.runCommand).not.toHaveBeenCalled();

    const owned = captureNextPlatformFixture();
    try {
      const runChecks = module.prepareSameRunPlatformCjsChecks();
      expect(shared.events).toEqual(['workspace build']);
      runChecks();
      expect(shared.events[0]).toBe('workspace build');
      expect(shared.events.filter((event) => event.startsWith('npm pack '))).toHaveLength(2);
      expect(shared.runCommand).toHaveBeenCalledTimes(8);
      expect(owned.root).toBeDefined();
      expect(fs.existsSync(owned.root!)).toBe(false);
      expect(() => runChecks()).toThrow(/only run once/u);
    } finally {
      owned.restore();
    }
  });

  it('probes public residency resolver types and real packed CJS fallback semantics', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    module.prepareSameRunPlatformCjsChecks()();
    const typeProbe = shared.fixtureSources.find((source) =>
      source.includes('const zOrderPolicyInput:'),
    );
    const runtimeProbe = shared.fixtureSources.find((source) =>
      source.includes('assert.deepEqual(resolveWindowZOrderPolicy'),
    );
    expect(typeProbe).toContain('type ResolveWindowZOrderPolicyInput, type WindowZOrderPolicy');
    expect(typeProbe).toContain(
      'const zOrderPolicy: WindowZOrderPolicy = resolveWindowZOrderPolicy(zOrderPolicyInput)',
    );
    expect(runtimeProbe).toContain(
      'effectiveZOrder: "default", focusable: true, reason: "back-unavailable"',
    );
    expect(runtimeProbe).toContain('"back-approximation"');
  });

  it('does not pack when the fresh workspace build fails', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    shared.buildFreshWorkspaceArtifacts.mockImplementation(() => {
      throw new Error('build failed');
    });

    expect(() => module.prepareSameRunPlatformCjsChecks()).toThrow('build failed');
    expect(shared.runCommand).not.toHaveBeenCalled();
  });

  it('probes host-launch types and canonical no-shell dispatch with injected ports', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    module.prepareSameRunPlatformCjsChecks()();
    const typeProbe = shared.fixtureSources.find((source) =>
      source.includes('type HostLaunchService'),
    );
    const runtimeProbe = shared.fixtureSources.find((source) =>
      source.includes('const launchCalls = []'),
    );
    expect(typeProbe).toContain("from '@workbench-kit/electron-shell/host-launch'");
    expect(typeProbe).toContain('const hostLaunchFactory:');
    expect(runtimeProbe).toContain("require('@workbench-kit/electron-shell/host-launch')");
    expect(runtimeProbe).toContain('shell: false, detached: true, stdio: "ignore"');
    expect(runtimeProbe).toContain('"/opt/editor/bin/editor", []');
    expect(runtimeProbe).toContain('targetPresence: "unknown"');
  });

  it.each([
    ['first', 1],
    ['second', 2],
  ])('cleans its exact fixture when the %s directory setup fails', async (_label, failAt) => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    const owned = captureNextPlatformFixture();
    const originalMkdir = fs.mkdirSync;
    let calls = 0;
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation((directory, options) => {
      calls += 1;
      if (calls === failAt) throw new Error(`mkdir ${failAt} failed`);
      return originalMkdir(directory, options);
    });

    try {
      const runChecks = module.prepareSameRunPlatformCjsChecks();
      expect(() => runChecks()).toThrow(`mkdir ${failAt} failed`);
      expect(owned.root).toBeDefined();
      expect(fs.existsSync(owned.root!)).toBe(false);
      expect(shared.runCommand).not.toHaveBeenCalled();
    } finally {
      mkdirSpy.mockRestore();
      owned.restore();
    }
  });

  it.each([
    ['pack', (command: string) => command === 'npm'],
    ['extraction', (command: string) => command === 'tar'],
    ['typecheck', (command: string, args: string[]) => command === 'pnpm' && args.includes('tsc')],
    ['runtime', (command: string) => command === process.execPath],
  ])('cleans its exact fixture after a %s failure', async (_label, fails) => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    const owned = captureNextPlatformFixture();
    shared.failCommand = fails;

    try {
      const runChecks = module.prepareSameRunPlatformCjsChecks();
      expect(() => runChecks()).toThrow(/failed/u);
      expect(owned.root).toBeDefined();
      expect(fs.existsSync(owned.root!)).toBe(false);
    } finally {
      owned.restore();
    }
  });

  it('preserves setup errors and leaves a preexisting same-prefix fixture alone', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    const sentinel = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-platform-cjs-'));
    const owned = captureNextPlatformFixture();
    const originalRemove = fs.rmSync;
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('setup failed');
    });
    const removeSpy = vi.spyOn(fs, 'rmSync').mockImplementation((target, options) => {
      if (String(target) === owned.root) throw new Error('cleanup failed');
      return originalRemove(target, options);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const runChecks = module.prepareSameRunPlatformCjsChecks();
      expect(() => runChecks()).toThrow('setup failed');
      expect(owned.root).toBeDefined();
      expect(fs.existsSync(sentinel)).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        '[check-platform-cjs-leaves] Fixture cleanup also failed:',
        expect.any(Error),
      );
    } finally {
      mkdirSpy.mockRestore();
      removeSpy.mockRestore();
      owned.restore();
      if (owned.root) originalRemove(owned.root, { force: true, recursive: true });
      originalRemove(sentinel, { force: true, recursive: true });
    }
  });

  it('orders one build, 19 pnpm packs, consumer checks, and two npm packs', async () => {
    const module = await import('./check-platform-cjs-leaves.mjs');
    const parentFixture = createParentFixture();

    try {
      await module.runSameRunPackedAggregate({
        assertFixture: () => shared.events.push('assert parent fixture'),
        runPackedConsumer: () => {
          for (const name of NPM_PUBLISH_ORDER) shared.events.push(`pnpm pack ${name}`);
          shared.events.push('consumer checks complete');
        },
        cleanupParent: () => {
          shared.events.push('cleanup parent fixture');
          fs.rmSync(parentFixture, { force: true, recursive: true });
        },
      });

      const firstPack = shared.events.findIndex((event) => event.startsWith('pnpm pack '));
      const finalPack = shared.events.findLastIndex((event) => event.startsWith('pnpm pack '));
      const consumerChecks = shared.events.indexOf('consumer checks complete');
      const firstNpmPack = shared.events.findIndex((event) => event.startsWith('npm pack '));
      expect(shared.events.indexOf('workspace build')).toBeLessThan(firstPack);
      expect(finalPack - firstPack + 1).toBe(19);
      expect(consumerChecks).toBeLessThan(firstNpmPack);
      expect(shared.events.filter((event) => event.startsWith('npm pack '))).toHaveLength(2);
      expect(shared.events.at(-1)).toBe('cleanup parent fixture');
      expect(fs.existsSync(parentFixture)).toBe(false);
    } finally {
      fs.rmSync(parentFixture, { force: true, recursive: true });
    }
  });

  it.each(['build', 'consumer', 'cjs'])(
    'cleans the parent fixture after %s failure',
    async (stage) => {
      const module = await import('./check-platform-cjs-leaves.mjs');
      const parentFixture = createParentFixture();
      const cleanupParent = vi.fn(() => fs.rmSync(parentFixture, { force: true, recursive: true }));
      const runPackedConsumer = vi.fn(() => {
        for (const name of NPM_PUBLISH_ORDER) shared.events.push(`pnpm pack ${name}`);
        if (stage === 'consumer') throw new Error('consumer failed');
        shared.events.push('consumer checks complete');
      });
      if (stage === 'build') {
        shared.buildFreshWorkspaceArtifacts.mockImplementation(() => {
          throw new Error('build failed');
        });
      } else if (stage === 'cjs') {
        shared.failCommand = (command) => command === 'npm';
      }

      try {
        await expect(
          module.runSameRunPackedAggregate({
            assertFixture: () => {},
            runPackedConsumer,
            cleanupParent,
          }),
        ).rejects.toThrow(stage === 'consumer' ? 'consumer failed' : 'failed');
        expect(cleanupParent).toHaveBeenCalledOnce();
        expect(fs.existsSync(parentFixture)).toBe(false);
        if (stage === 'build') expect(runPackedConsumer).not.toHaveBeenCalled();
        if (stage === 'consumer') {
          expect(shared.events.filter((event) => event.startsWith('npm pack '))).toHaveLength(0);
        }
      } finally {
        fs.rmSync(parentFixture, { force: true, recursive: true });
      }
    },
  );

  it('rejects unknown aggregate arguments before entering the aggregate', () => {
    const scriptPath = fileURLToPath(
      new URL('./check-packed-consumer-bundle.mjs', import.meta.url),
    );
    const result = spawnSync(process.execPath, [scriptPath, '--unknown'], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unknown argument: --unknown');
  });
});
