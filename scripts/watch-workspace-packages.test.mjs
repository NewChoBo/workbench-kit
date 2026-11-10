import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createBuildQueue, watchWorkspacePackages } from './watch-workspace-packages.mjs';
import { spawnSync } from 'node:child_process';

test('edits during a build coalesce into one subsequent build without overlap', async () => {
  let finish;
  let calls = 0;
  let active = 0;
  const queue = createBuildQueue(async () => {
    assert.equal(++active, 1);
    calls++;
    if (calls === 1)
      await new Promise((resolve) => {
        finish = resolve;
      });
    active--;
  });
  const work = queue.request();
  await queue.request();
  await queue.request();
  finish();
  await work;
  assert.equal(calls, 2);
});

test('a failed build can recover on the next edit and stop drops queued work', async () => {
  let calls = 0;
  const errors = [];
  const queue = createBuildQueue(
    async () => {
      if (++calls === 1) throw new Error('invalid source');
    },
    (error) => errors.push(error),
  );
  await queue.request();
  await queue.request();
  queue.stop();
  await queue.request();
  assert.equal(calls, 2);
  assert.equal(errors.length, 1);
});

test('a prebuilt workspace skips the initial build but rebuilds on the next source edit', async () => {
  const repository = mkdtempSync(join(tmpdir(), 'kit-watch-prebuilt-'));
  const source = join(repository, 'packages/example/src/index.ts');
  const output = join(repository, 'output.txt');
  mkdirSync(join(repository, 'packages/example/src'), { recursive: true });
  mkdirSync(join(repository, 'scripts'));
  writeFileSync(source, 'initial');
  writeFileSync(
    join(repository, 'scripts/build-workspace-packages.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('output.txt', fs.readFileSync('packages/example/src/index.ts'));",
  );
  const stop = watchWorkspacePackages(repository, { initialBuild: false });
  onTestFinished(() => {
    stop();
    rmSync(repository, { recursive: true, force: true });
  });
  await delay(500);
  assert.equal(existsSync(output), false);
  writeFileSync(source, 'edited');
  const deadline = Date.now() + 5_000;
  while (!existsSync(output)) {
    assert.ok(Date.now() < deadline, 'the next edit did not build');
    await delay(25);
  }
  assert.equal(readFileSync(output, 'utf8'), 'edited');
});

test('watch builds retain compiled entries while full builds still clean stale output', () => {
  for (const packageName of ['json-widget', 'electron-shell']) {
    const repository = mkdtempSync(join(tmpdir(), 'kit-watch-output-'));
    onTestFinished(() => rmSync(repository, { recursive: true, force: true }));
    mkdirSync(join(repository, 'scripts'));
    mkdirSync(join(repository, 'dist'));
    const output = join(repository, 'dist/api.d.ts');
    writeFileSync(output, 'existing public declarations');
    const script = join(repository, 'scripts/clean-dist.mjs');
    writeFileSync(
      script,
      readFileSync(new URL(`../packages/${packageName}/scripts/clean-dist.mjs`, import.meta.url)),
    );
    const watching = spawnSync(process.execPath, [script], {
      env: { ...process.env, WORKBENCH_KIT_WATCH: '1' },
      encoding: 'utf8',
    });
    assert.equal(watching.status, 0, watching.stderr);
    assert.equal(readFileSync(output, 'utf8'), 'existing public declarations');
    const full = spawnSync(process.execPath, [script], {
      env: { ...process.env, WORKBENCH_KIT_WATCH: '0' },
      encoding: 'utf8',
    });
    assert.equal(full.status, 0, full.stderr);
    assert.equal(existsSync(output), false);
  }
});

test(
  'filesystem watch ignores unchanged content and publishes only successful builds',
  { timeout: 15_000 },
  async () => {
    const repository = mkdtempSync(join(tmpdir(), 'kit-watch-'));
    const source = join(repository, 'packages/example/src/index.ts');
    const browserConfig = join(repository, 'packages/example/tsup.browser.config.ts');
    const marker = join(repository, '.cache/workspace-build.json');
    mkdirSync(join(repository, 'packages/example/src'), { recursive: true });
    mkdirSync(join(repository, 'scripts'));
    writeFileSync(source, 'initial');
    writeFileSync(browserConfig, 'browser target initial');
    writeFileSync(
      join(repository, 'scripts/build-workspace-packages.mjs'),
      `
    import { readFileSync, writeFileSync } from 'node:fs';
    const content = readFileSync('packages/example/src/index.ts', 'utf8');
    writeFileSync('attempt.txt', content);
    if (content === 'invalid') process.exit(1);
    writeFileSync('output.txt', content);
  `,
    );
    const stop = watchWorkspacePackages(repository);
    onTestFinished(() => {
      stop();
      rmSync(repository, { recursive: true, force: true });
    });
    const until = async (condition) => {
      const deadline = Date.now() + 5_000;
      while (!condition()) {
        assert.ok(Date.now() < deadline, 'watcher did not reach expected state');
        await delay(25);
      }
    };
    await until(() => existsSync(marker));
    const initial = readFileSync(marker, 'utf8');
    writeFileSync(source, 'initial');
    await delay(500);
    assert.equal(readFileSync(marker, 'utf8'), initial);
    writeFileSync(source, 'invalid');
    await until(() => readFileSync(join(repository, 'attempt.txt'), 'utf8') === 'invalid');
    await delay(100);
    assert.equal(readFileSync(marker, 'utf8'), initial);
    assert.equal(readFileSync(join(repository, 'output.txt'), 'utf8'), 'initial');
    writeFileSync(source, 'recovered');
    await until(() => readFileSync(marker, 'utf8') !== initial);
    assert.equal(readFileSync(join(repository, 'output.txt'), 'utf8'), 'recovered');
    const beforeConfigChange = readFileSync(marker, 'utf8');
    writeFileSync(browserConfig, 'browser target updated');
    await until(() => readFileSync(marker, 'utf8') !== beforeConfigChange);
    const afterConfigChange = readFileSync(marker, 'utf8');
    writeFileSync(browserConfig, 'browser target updated');
    await delay(500);
    assert.equal(readFileSync(marker, 'utf8'), afterConfigChange);
  },
);
