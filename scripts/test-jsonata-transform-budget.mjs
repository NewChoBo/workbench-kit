// Linux / Node 24 regression: CPU-bound evaluation runs only in an owned child.
// Usage: node scripts/test-jsonata-transform-budget.mjs [transform.ts] [expected-sha256]
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const self = fileURLToPath(import.meta.url);
const defaultTransform = fileURLToPath(
  new URL('../packages/shell-react/src/field-remap/jsonata-transform.ts', import.meta.url),
);
const evaluationBudgetMs = 20;
const parentDeadlineMs = 300;
const startupDeadlineMs = 5_000;
const killGraceMs = 200;
const expression = '($loop := function() { $loop() }; $loop())';

function digest(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function identity(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat
      .slice(stat.lastIndexOf(')') + 2)
      .trim()
      .split(/\s+/);
    return {
      pid,
      parent: Number(fields[1]),
      group: Number(fields[2]),
      session: Number(fields[3]),
      start: fields[19],
      state: fields[0],
    };
  } catch {
    return null;
  }
}

async function runChild(transformFile) {
  const { createJsonataValueTransform, JsonataTransformTimeoutError } = await import(
    pathToFileURL(transformFile).href
  );
  const go = new Promise((resolve) => process.once('message', resolve));
  process.send({ kind: 'ready' });
  await go;

  const transform = createJsonataValueTransform({ timeoutMs: evaluationBudgetMs });
  assert.equal(await transform.apply({ value: 7 }, { options: { expression: 'value * 6' } }), 42);

  const start = performance.now();
  const heartbeat = new Promise((resolve) => {
    setTimeout(() => {
      process.send({ kind: 'heartbeat' });
      resolve();
    }, 10);
  });
  await assert.rejects(
    transform.apply(null, { options: { expression } }),
    (error) =>
      error instanceof JsonataTransformTimeoutError &&
      error.message === `JSONata evaluation timed out after ${evaluationBudgetMs}ms.`,
  );
  process.send({ kind: 'bounded', elapsedMs: performance.now() - start });
  await heartbeat;

  const reason = new Error('Synthetic preview cancellation');
  const controller = new AbortController();
  controller.abort(reason);
  await assert.rejects(
    transform.apply(null, { options: { expression }, signal: controller.signal }),
    (error) => error === reason,
  );
  process.send({ kind: 'complete' });
  process.disconnect();
}

async function runParent() {
  assert.equal(process.platform, 'linux', 'Owned-child identity checks require Linux /proc.');
  const transformFile = realpathSync(process.argv[2] ?? defaultTransform);
  const sourceSha256 = digest(transformFile);
  if (process.argv[3]) {
    assert.equal(sourceSha256, process.argv[3], 'Transform differs from the reviewed source.');
  }

  const child = fork(self, ['--child', transformFile], {
    execArgv: [...process.execArgv, '--experimental-strip-types', '--max-old-space-size=64'],
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { PATH: process.env.PATH, LANG: 'C.UTF-8' },
  });
  const events = [];
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  child.on('message', (message) => {
    events.push(message);
    if (message.kind === 'ready') resolveReady();
  });
  const exited = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  const owned = identity(child.pid);
  assert.ok(
    owned &&
      owned.parent === process.pid &&
      owned.group === child.pid &&
      owned.session === child.pid,
    'Cannot establish the owned child identity.',
  );

  let stderr = '';
  let stopReason = null;
  let hardTimer;
  let evaluationTimer;
  let startupTimer;
  const signalAttempts = [];
  const killExact = (signal) => {
    const current = identity(child.pid);
    if (
      current &&
      current.parent === process.pid &&
      current.start === owned.start &&
      current.group === owned.group &&
      current.session === owned.session &&
      current.state !== 'Z'
    ) {
      signalAttempts.push({ signal, sent: child.kill(signal) });
    }
  };
  const requestStop = (reason) => {
    stopReason ??= reason;
    killExact('SIGTERM');
    hardTimer ??= setTimeout(() => killExact('SIGKILL'), killGraceMs);
  };
  const onInterrupt = () => requestStop('parent-interrupt');
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onInterrupt);
  child.stderr.on('data', (chunk) => {
    if (stderr.length < 8_192) stderr += chunk.toString().slice(0, 8_192 - stderr.length);
  });
  void ready.then(() => {
    if (child.exitCode === null && child.signalCode === null && !stopReason) {
      clearTimeout(startupTimer);
      evaluationTimer = setTimeout(
        () => requestStop('evaluation-parent-deadline'),
        parentDeadlineMs,
      );
      child.send({ kind: 'go' });
    }
  });
  startupTimer = setTimeout(() => requestStop('startup-parent-deadline'), startupDeadlineMs);

  let exit;
  try {
    exit = await exited;
  } finally {
    clearTimeout(startupTimer);
    clearTimeout(evaluationTimer);
    clearTimeout(hardTimer);
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onInterrupt);
    killExact('SIGKILL');
  }

  const current = identity(child.pid);
  const ownedChildGone = !current || current.start !== owned.start || current.state === 'Z';
  const sourceUnchanged = digest(transformFile) === sourceSha256;
  const passed =
    exit.code === 0 &&
    exit.signal === null &&
    stopReason === null &&
    events.some((event) => event.kind === 'bounded') &&
    events.some((event) => event.kind === 'heartbeat') &&
    events.some((event) => event.kind === 'complete') &&
    ownedChildGone &&
    sourceUnchanged;
  console.log(
    JSON.stringify({
      passed,
      sourceSha256,
      sourceUnchanged,
      evaluationBudgetMs,
      parentDeadlineMs,
      startupDeadlineMs,
      killGraceMs,
      events,
      exit,
      stopReason,
      signalAttempts,
      ownedChildGone,
      stderr,
    }),
  );
  assert.ok(passed, 'The actual transform failed the externally bounded CPU-loop regression.');
}

if (process.argv[2] === '--child') {
  await runChild(process.argv[3]);
} else {
  await runParent();
}
