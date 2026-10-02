import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temporary = mkdtempSync(join(tmpdir(), 'workbench-verified-tests-'));
const reportPath = join(temporary, 'vitest-report.json');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
}

try {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error('Run through pnpm test:verified');

  if (
    run(process.execPath, ['--test', '.codex/hooks/validation-scope.test.mjs']) &&
    run(process.execPath, [
      pnpm,
      'exec',
      'vitest',
      'run',
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${reportPath}`,
    ])
  ) {
    run(process.execPath, ['scripts/check-verification-units.mjs', reportPath]);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
