import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guardPath = join(repositoryRoot, 'scripts/require-pnpm.mjs');

function runGuard(executablePath?: string) {
  const env = { ...process.env };
  if (executablePath === undefined) delete env.npm_execpath;
  else env.npm_execpath = executablePath;
  return spawnSync(process.execPath, [guardPath], { env, encoding: 'utf8' });
}

describe('pnpm-only installation guard', () => {
  it.each(['/tools/pnpm/bin/pnpm.cjs', 'C:\\tools\\pnpm\\pnpm.cjs'])(
    'accepts pnpm execution at %s without output',
    (executablePath) => {
      const result = runGuard(executablePath);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    },
  );

  it.each(['/tools/npm/bin/npm-cli.js', undefined])(
    'rejects unsupported or missing package manager %s with a useful command',
    (executablePath) => {
      const result = runGuard(executablePath);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('This repository requires pnpm. Please run `pnpm install`.');
    },
  );

  it.skipIf(process.platform === 'win32')(
    'runs the package preinstall through a POSIX shell without starting another install',
    () => {
      const directory = mkdtempSync(join(tmpdir(), 'pnpm-guard-'));
      const marker = join(directory, 'unexpected-install');
      const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
      writeFileSync(join(directory, 'pnpm'), '#!/bin/sh\nprintf called > "$PNPM_GUARD_MARKER"\n', {
        mode: 0o755,
      });
      try {
        const result = spawnSync('/bin/sh', ['-c', manifest.scripts.preinstall], {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            npm_execpath: '/tools/pnpm/bin/pnpm.cjs',
            PATH: `${directory}:${process.env.PATH ?? ''}`,
            PNPM_GUARD_MARKER: marker,
          },
          encoding: 'utf8',
          timeout: 5_000,
        });
        expect(result.status).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
        expect(existsSync(marker)).toBe(false);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
