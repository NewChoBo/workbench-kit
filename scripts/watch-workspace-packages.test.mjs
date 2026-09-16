import assert from 'node:assert/strict';
import { onTestFinished, test } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createBuildQueue, watchWorkspacePackages } from './watch-workspace-packages.mjs';

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

test(
  'filesystem watch ignores unchanged content and publishes only successful builds',
  { timeout: 15_000 },
  async () => {
    const repository = mkdtempSync(join(tmpdir(), 'kit-watch-'));
    const source = join(repository, 'packages/example/src/index.ts');
    const marker = join(repository, '.cache/workspace-build.json');
    mkdirSync(join(repository, 'packages/example/src'), { recursive: true });
    mkdirSync(join(repository, 'scripts'));
    writeFileSync(source, 'initial');
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
  },
);
