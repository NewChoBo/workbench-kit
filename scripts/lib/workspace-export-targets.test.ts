import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildFreshWorkspaceArtifacts,
  collectExportTargets,
  ensureGeneratedWorkspaceExportTargets,
  findMissingGeneratedExportTargets,
} from './workspace-export-targets.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe('workspace export targets', () => {
  it('builds fresh workspace artifacts on demand', () => {
    const run = vi.fn();

    buildFreshWorkspaceArtifacts({
      logPrefix: 'test-fresh-artifacts',
      repoRoot: 'repo-root',
      run,
    });

    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith('pnpm', ['build:workspace'], {
      cwd: 'repo-root',
      stdio: 'inherit',
    });
  });

  it('collects nested conditional export targets', () => {
    expect(
      collectExportTargets({
        '.': {
          import: './dist/index.js',
          require: ['./dist/index.cjs', null],
        },
      }),
    ).toEqual(['./dist/index.js', './dist/index.cjs']);
  });

  it('finds only missing generated entry targets', () => {
    const directory = createTemporaryPackage();
    fs.mkdirSync(path.join(directory, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'dist', 'index.js'), 'export {};\n');

    expect(
      findMissingGeneratedExportTargets([
        {
          directory,
          packageJson: {
            exports: {
              '.': {
                import: './dist/index.js',
                require: './dist/index.cjs',
              },
              './source': './src/source.ts',
            },
            main: './dist/index.cjs',
            name: '@workbench-kit/example',
            types: './dist/index.d.ts',
          },
        },
      ]),
    ).toEqual([
      '@workbench-kit/example:./dist/index.cjs',
      '@workbench-kit/example:./dist/index.d.ts',
    ]);
  });

  it('builds once when generated targets are missing and verifies the result', () => {
    const directory = createTemporaryPackage();
    const run = vi.fn(() => {
      fs.mkdirSync(path.join(directory, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(directory, 'dist', 'index.js'), 'export {};\n');
    });

    expect(
      ensureGeneratedWorkspaceExportTargets({
        logPrefix: 'test-export-targets',
        repoRoot: directory,
        run,
        workspacePackages: [
          {
            directory,
            packageJson: {
              exports: './dist/index.js',
              name: '@workbench-kit/example',
            },
          },
        ],
      }),
    ).toEqual(['@workbench-kit/example:./dist/index.js']);
    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith('pnpm', ['build:workspace'], {
      cwd: directory,
      stdio: 'inherit',
    });
  });

  it('skips the build when generated targets already exist', () => {
    const directory = createTemporaryPackage();
    fs.mkdirSync(path.join(directory, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'dist', 'index.js'), 'export {};\n');
    const run = vi.fn();

    expect(
      ensureGeneratedWorkspaceExportTargets({
        logPrefix: 'test-export-targets',
        repoRoot: directory,
        run,
        workspacePackages: [
          {
            directory,
            packageJson: {
              exports: './dist/index.js',
              name: '@workbench-kit/example',
            },
          },
        ],
      }),
    ).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });
});

function createTemporaryPackage() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-export-targets-'));
  temporaryDirectories.push(directory);
  return directory;
}
