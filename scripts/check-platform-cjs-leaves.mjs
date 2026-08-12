import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from './lib/run-command.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function packWorkspacePackage(packageName, directoryName, fixturePrefix) {
  const packageDir = path.join(repoRoot, 'packages', directoryName);
  console.log(`[check-platform-cjs-leaves] Building ${packageName}…`);
  runCommand('pnpm', ['--filter', packageName, 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), fixturePrefix));
  const packDir = path.join(fixtureRoot, 'pack');
  const consumerDir = path.join(fixtureRoot, 'consumer');
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(consumerDir, { recursive: true });

  console.log(`[check-platform-cjs-leaves] Packing ${packageName}…`);
  const packOutput = runCommand('npm', ['pack', '--pack-destination', packDir], {
    cwd: packageDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const tarballName = packOutput.trim().split(/\r?\n/u).filter(Boolean).at(-1);
  if (!tarballName) {
    throw new Error(`npm pack did not print a tarball name for ${packageName}.`);
  }

  runCommand('tar', ['-xzf', path.join(packDir, tarballName), '-C', packDir], {
    stdio: 'inherit',
  });
  return {
    consumerDir,
    fixtureRoot,
    packedRoot: path.join(packDir, 'package'),
  };
}

function linkPackedPackage(consumerDir, packedRoot, directoryName) {
  const scopedDir = path.join(consumerDir, 'node_modules', '@workbench-kit');
  fs.mkdirSync(scopedDir, { recursive: true });
  fs.symlinkSync(packedRoot, path.join(scopedDir, directoryName), 'dir');
}

function verifyPlatformLeaves() {
  const fixture = packWorkspacePackage('@workbench-kit/platform', 'platform', 'wbk-platform-cjs-');
  try {
    for (const leaf of [
      'allowlisted-https-fetch.cjs',
      'atomic-write.cjs',
      'node.cjs',
      'tray-close-policy.cjs',
      'window-bounds-persistence.cjs',
    ]) {
      const leafPath = path.join(fixture.packedRoot, 'dist', leaf);
      if (!fs.existsSync(leafPath)) {
        throw new Error(`Packed platform tarball missing dist/${leaf}`);
      }
    }

    linkPackedPackage(fixture.consumerDir, fixture.packedRoot, 'platform');
    verifyLegacyTypeScriptSubpaths(
      fixture.consumerDir,
      [
        "import { createAllowlistedHttpsFetch } from '@workbench-kit/platform/allowlisted-https-fetch';",
        "import { atomicWriteBytes, atomicWriteText } from '@workbench-kit/platform/atomic-write';",
        "import { assertPathInsideRoot, quarantineFileUnderRoot, resolvePathUnderRoot } from '@workbench-kit/platform/node';",
        "import { shouldHideOnClose, shouldQuitWhenAllWindowsClosed } from '@workbench-kit/platform/tray-close-policy';",
        "import { bindSecondaryWindowBoundsPersistence, bindWindowBoundsPersistence } from '@workbench-kit/platform/window-bounds-persistence';",
      ],
      [
        'atomicWriteBytes',
        'atomicWriteText',
        'assertPathInsideRoot',
        'bindSecondaryWindowBoundsPersistence',
        'bindWindowBoundsPersistence',
        'createAllowlistedHttpsFetch',
        'quarantineFileUnderRoot',
        'resolvePathUnderRoot',
        'shouldHideOnClose',
        'shouldQuitWhenAllWindowsClosed',
      ],
    );
    const consumerEntry = path.join(fixture.consumerDir, 'smoke.cjs');
    fs.writeFileSync(
      consumerEntry,
      [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const fs = require('node:fs');",
        "const os = require('node:os');",
        "const path = require('node:path');",
        'const { createAllowlistedHttpsFetch } =',
        "  require('@workbench-kit/platform/allowlisted-https-fetch');",
        "const { atomicWriteBytes, atomicWriteText } = require('@workbench-kit/platform/atomic-write');",
        "const { assertPathInsideRoot, quarantineFileUnderRoot, resolvePathUnderRoot } = require('@workbench-kit/platform/node');",
        'const { shouldHideOnClose, shouldQuitWhenAllWindowsClosed } =',
        "  require('@workbench-kit/platform/tray-close-policy');",
        'const { bindSecondaryWindowBoundsPersistence, bindWindowBoundsPersistence } =',
        "  require('@workbench-kit/platform/window-bounds-persistence');",
        'assert.equal(typeof atomicWriteText, "function");',
        'assert.equal(typeof atomicWriteBytes, "function");',
        'assert.equal(typeof createAllowlistedHttpsFetch, "function");',
        'assert.equal(typeof assertPathInsideRoot, "function");',
        'assert.equal(typeof quarantineFileUnderRoot, "function");',
        'assert.equal(typeof resolvePathUnderRoot, "function");',
        'assert.equal(typeof bindSecondaryWindowBoundsPersistence, "function");',
        'assert.equal(typeof bindWindowBoundsPersistence, "function");',
        'assert.equal(shouldHideOnClose({ trayEnabled: true }), true);',
        'assert.equal(',
        "  shouldQuitWhenAllWindowsClosed({ platform: 'darwin', trayEnabled: false }),",
        '  false,',
        ');',
        '(async () => {',
        '  const fetchHttps = createAllowlistedHttpsFetch({',
        "    allowedHosts: ['api.example.com'],",
        '    fetch: async (input) => ({ input }),',
        '  });',
        "  assert.equal((await fetchHttps('https://api.example.com/items')).input, 'https://api.example.com/items');",
        "  await assert.rejects(fetchHttps('https://blocked.example.com/items'), /allowlist/);",
        "  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-atomic-cjs-'));",
        "  assert.equal(resolvePathUnderRoot(dir, 'nested'), path.join(dir, 'nested'));",
        "  assert.throws(() => assertPathInsideRoot(dir, path.join(dir, '..', 'escape')), /escapes/);",
        "  const filePath = path.join(dir, 'nested', 'doc.txt');",
        "  await atomicWriteText(filePath, 'hello-cjs');",
        "  assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello-cjs');",
        "  const binaryPath = path.join(dir, 'asset.bin');",
        '  await atomicWriteBytes(binaryPath, Uint8Array.from([0, 128, 255]));',
        '  assert.deepEqual(fs.readFileSync(binaryPath), Buffer.from([0, 128, 255]));',
        '  fs.rmSync(dir, { recursive: true, force: true });',
        '})().catch((error) => { console.error(error); process.exit(1); });',
        '',
      ].join('\n'),
    );

    const requireFromConsumer = createRequire(consumerEntry);
    const tray = requireFromConsumer('@workbench-kit/platform/tray-close-policy');
    if (typeof tray.shouldHideOnClose !== 'function') {
      throw new Error('createRequire failed to load tray-close-policy exports.');
    }
    runCommand(process.execPath, [consumerEntry], {
      cwd: fixture.consumerDir,
      stdio: 'inherit',
    });
  } finally {
    fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

function verifyLegacyTypeScriptSubpaths(consumerDir, imports, referencedNames) {
  const typeEntry = path.join(consumerDir, 'smoke.ts');
  const tsconfigPath = path.join(consumerDir, 'tsconfig.json');
  fs.writeFileSync(
    typeEntry,
    [...imports, '', ...referencedNames.map((name) => `void ${name};`), ''].join('\n'),
  );
  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          esModuleInterop: true,
          module: 'CommonJS',
          moduleResolution: 'Node',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
          typeRoots: [path.join(repoRoot, 'packages', 'platform', 'node_modules', '@types')],
          types: ['node'],
        },
        include: ['smoke.ts'],
      },
      null,
      2,
    ) + '\n',
  );
  runCommand('pnpm', ['exec', 'tsc', '-p', tsconfigPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function verifyElectronShellLeaves() {
  const fixture = packWorkspacePackage(
    '@workbench-kit/electron-shell',
    'electron-shell',
    'wbk-electron-shell-cjs-',
  );
  try {
    for (const leaf of [
      'assets/privileged-asset-protocol.js',
      'lifecycle/application-quit-guard.js',
      'security/open-allowlisted-external-link.js',
      'security/require-owned-window-for-sender.js',
      'window/window-controls.js',
    ]) {
      if (!fs.existsSync(path.join(fixture.packedRoot, 'dist', leaf))) {
        throw new Error(`Packed electron-shell tarball missing dist/${leaf}`);
      }
    }

    linkPackedPackage(fixture.consumerDir, fixture.packedRoot, 'electron-shell');
    verifyLegacyTypeScriptSubpaths(
      fixture.consumerDir,
      [
        "import { createApplicationQuitGuard } from '@workbench-kit/electron-shell/application-quit-guard';",
        "import { registerPrivilegedAssetProtocolScheme } from '@workbench-kit/electron-shell/asset-protocol';",
        "import { openAllowlistedExternalLink } from '@workbench-kit/electron-shell/external-links';",
        "import { createAllowlistedInvoke } from '@workbench-kit/electron-shell/preload';",
        "import { requireOwnedWindowForSender } from '@workbench-kit/electron-shell/sender-security';",
        "import { createWindowControlsBridge } from '@workbench-kit/electron-shell/window-controls';",
      ],
      [
        'createApplicationQuitGuard',
        'registerPrivilegedAssetProtocolScheme',
        'openAllowlistedExternalLink',
        'createAllowlistedInvoke',
        'requireOwnedWindowForSender',
        'createWindowControlsBridge',
      ],
    );

    const consumerEntry = path.join(fixture.consumerDir, 'smoke.cjs');
    fs.writeFileSync(
      consumerEntry,
      [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const { createApplicationQuitGuard } = require('@workbench-kit/electron-shell/application-quit-guard');",
        "const { registerPrivilegedAssetProtocolScheme } = require('@workbench-kit/electron-shell/asset-protocol');",
        "const { openAllowlistedExternalLink } = require('@workbench-kit/electron-shell/external-links');",
        "const { requireOwnedWindowForSender } = require('@workbench-kit/electron-shell/sender-security');",
        "const { registerWindowControlIpc } = require('@workbench-kit/electron-shell/window-controls');",
        'assert.equal(typeof createApplicationQuitGuard, "function");',
        'assert.equal(typeof registerPrivilegedAssetProtocolScheme, "function");',
        'assert.equal(typeof openAllowlistedExternalLink, "function");',
        'assert.equal(typeof requireOwnedWindowForSender, "function");',
        'assert.equal(typeof registerWindowControlIpc, "function");',
        'const handlers = new Map();',
        'let maximized = false;',
        'registerWindowControlIpc({',
        '  channels: { close: "close", isMaximized: "state", maximizedChanged: "changed", minimize: "min", toggleMaximized: "toggle" },',
        '  ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },',
        '  resolveWindow: () => ({ close() {}, isMaximized: () => maximized, maximize() { maximized = true; }, minimize() {}, unmaximize() { maximized = false; } }),',
        '});',
        'assert.equal(handlers.get("toggle")({ sender: {} }), true);',
        '',
      ].join('\n'),
    );
    runCommand(process.execPath, [consumerEntry], {
      cwd: fixture.consumerDir,
      stdio: 'inherit',
    });
  } finally {
    fs.rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

verifyPlatformLeaves();
verifyElectronShellLeaves();
console.log('[check-platform-cjs-leaves] OK');
