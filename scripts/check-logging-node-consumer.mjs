import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './lib/run-command.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'wbk-logging-consumer-'));
const run = (command, args, cwd = root) => runCommand(command, args, { cwd, stdio: 'inherit' });
try {
  run('pnpm', ['--filter', '@workbench-kit/logging', 'build']);
  const archiveDir = path.join(fixture, 'archives');
  fs.mkdirSync(archiveDir);
  run('pnpm', ['pack', '--pack-destination', archiveDir], path.join(root, 'packages/logging'));
  const archives = fs.readdirSync(archiveDir).filter((file) => file.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const scope = path.join(fixture, 'node_modules/@workbench-kit');
  fs.mkdirSync(scope, { recursive: true });
  run('tar', ['-xzf', path.join(archiveDir, archives[0]), '-C', scope], fixture);
  fs.renameSync(path.join(scope, 'package'), path.join(scope, 'logging'));
  for (const mode of ['cjs', 'mjs']) {
    const source =
      mode === 'cjs'
        ? "const { createWorkbenchFileLogSink } = require('@workbench-kit/logging/node');"
        : "import { createWorkbenchFileLogSink } from '@workbench-kit/logging/node';";
    const entry = path.join(fixture, `probe.${mode}`);
    fs.writeFileSync(
      entry,
      `${source}\nif (typeof createWorkbenchFileLogSink !== 'function') throw new Error('Missing public export');\n`,
    );
    run(process.execPath, [entry], fixture);
  }
  for (const [extension, moduleResolution, module] of [
    ['ts', 'Node', 'CommonJS'],
    ['mts', 'NodeNext', 'NodeNext'],
    ['cts', 'NodeNext', 'NodeNext'],
  ]) {
    const entry = path.join(fixture, `types.${extension}`);
    fs.writeFileSync(
      entry,
      "import { createWorkbenchFileLogSink, type WorkbenchFileLogSinkOptions } from '@workbench-kit/logging/node';\nimport type { WorkbenchLogSink } from '@workbench-kit/logging';\nconst options: WorkbenchFileLogSinkOptions = { directory: '/owned/logs', onFailure(reason) { const code: 'serialize' | 'oversize' | 'rotate' | 'append' = reason; void code; } };\nconst sink: WorkbenchLogSink = createWorkbenchFileLogSink(options); void sink;\n",
    );
    const config = path.join(fixture, `tsconfig-${extension}.json`);
    fs.writeFileSync(
      config,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module,
          moduleResolution,
          target: 'ES2022',
          types: [],
        },
        files: [entry],
      }),
    );
    run('pnpm', ['exec', 'tsc', '-p', config]);
  }
  const browserEntry = path.join(fixture, 'browser.mjs');
  fs.writeFileSync(
    browserEntry,
    "import { createWorkbenchLogger } from '@workbench-kit/logging'; globalThis.consumerLogger = createWorkbenchLogger('browser');\n",
  );
  const output = path.join(fixture, 'browser.js');
  const config = path.join(fixture, 'vite.config.mjs');
  fs.writeFileSync(
    config,
    `export default ${JSON.stringify({ build: { lib: { entry: browserEntry, formats: ['es'], fileName: 'browser' }, outDir: path.join(fixture, 'browser-output'), emptyOutDir: true, minify: false } })};`,
  );
  run('pnpm', ['exec', 'vite', 'build', '--config', config]);
  const browserOutput = fs
    .readdirSync(path.join(fixture, 'browser-output'))
    .find((file) => /\.m?js$/u.test(file));
  assert.ok(browserOutput);
  fs.copyFileSync(path.join(fixture, 'browser-output', browserOutput), output);
  assert.doesNotMatch(
    fs.readFileSync(output, 'utf8'),
    /node:fs|node:path|createWorkbenchFileLogSink/u,
  );
  console.log('[check-logging-node-consumer] Passed archived CJS/ESM/types/browser-root probes.');
  fs.rmSync(fixture, { recursive: true, force: true });
} catch (error) {
  console.error(`[check-logging-node-consumer] Preserved failed fixture: ${fixture}`);
  throw error;
}
