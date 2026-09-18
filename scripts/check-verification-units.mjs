import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateRegistry, verifyReport } from './verification-units.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registry = validateRegistry(
  JSON.parse(readFileSync(join(root, 'verification/units.json'), 'utf8')),
  root,
);
const temporary = mkdtempSync(join(tmpdir(), 'workbench-units-'));
try {
  if (!process.env.npm_execpath) throw new Error('Run through pnpm check:verification-units');
  const files = [...new Set(registry.units.flatMap((unit) => unit.tests.map((test) => test.file)))];
  const reportPath = join(temporary, 'report.json');
  const result = spawnSync(
    process.execPath,
    [
      process.env.npm_execpath,
      'exec',
      'vitest',
      'run',
      ...files,
      '--reporter=json',
      `--outputFile=${reportPath}`,
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Required unit tests failed: ${result.status ?? result.signal}`);
  verifyReport(registry, JSON.parse(readFileSync(reportPath, 'utf8')), root);
  console.log(
    `Verified ${registry.units.length} registered units; this is a partial capability inventory.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
