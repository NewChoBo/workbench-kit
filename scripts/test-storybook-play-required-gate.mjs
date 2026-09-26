import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repoRoot, 'scripts', 'test-storybook-play.mjs');
const fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'storybook-required-gate-'));
const toolDirectory = path.join(fixtureDirectory, 'tools');
const runnerLogPath = path.join(fixtureDirectory, 'test-runner-invocations.log');
const requestPaths = [];
const server = http.createServer((request, response) => {
  requestPaths.push(request.url);
  if (request.url === '/index.json') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ v: 5, entries: {} }));
    return;
  }
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end('<!doctype html><title>Fake Storybook</title>');
});

function listen(target) {
  return new Promise((resolve, reject) => {
    target.once('error', reject);
    target.listen(0, '127.0.0.1', () => {
      target.removeListener('error', reject);
      resolve(target.address().port);
    });
  });
}

function close(target) {
  return new Promise((resolve, reject) => {
    target.close((error) => (error ? reject(error) : resolve()));
  });
}

async function removeFixtureSafely() {
  const tempRoot = await fs.realpath(os.tmpdir());
  const resolvedFixture = await fs.realpath(fixtureDirectory);
  const relativeFixture = path.relative(tempRoot, resolvedFixture);
  if (
    path.dirname(resolvedFixture) !== tempRoot ||
    !path.basename(resolvedFixture).startsWith('storybook-required-gate-') ||
    relativeFixture.startsWith('..') ||
    path.isAbsolute(relativeFixture)
  ) {
    return new Error(`Refusing to remove unexpected fixture path: ${resolvedFixture}`);
  }
  await fs.rm(resolvedFixture, { recursive: true, force: true });
  return null;
}

function runRequired(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, '--required'], {
      cwd: repoRoot,
      env: { ...env, CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, output }));
  });
}

let cleanupError;
try {
  await fs.mkdir(toolDirectory, { recursive: true });
  if (process.platform === 'win32') {
    await fs.writeFile(
      path.join(toolDirectory, 'pnpm.cmd'),
      '@echo off\r\nif "%3"=="--help" exit /b 0\r\necho %*>>"%STORYBOOK_PLAY_TEST_RUNNER_LOG%"\r\nexit /b 0\r\n',
    );
  } else {
    const shimPath = path.join(toolDirectory, 'pnpm');
    await fs.writeFile(
      shimPath,
      '#!/bin/sh\nif [ "$3" = "--help" ]; then exit 0; fi\nprintf "%s\\n" "$*" >> "$STORYBOOK_PLAY_TEST_RUNNER_LOG"\nexit 0\n',
    );
    await fs.chmod(shimPath, 0o755);
  }

  const occupiedPort = await listen(server);
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const inheritedEnv = { ...process.env };
  delete inheritedEnv.TARGET_URL;
  const commonEnv = {
    ...inheritedEnv,
    PATH: `${toolDirectory}${pathSeparator}${process.env.PATH ?? ''}`,
    STORYBOOK_PLAY_PORT: String(occupiedPort),
    STORYBOOK_PLAY_TEST_RUNNER_LOG: runnerLogPath,
  };

  const occupiedResult = await runRequired(commonEnv);
  assert.equal(occupiedResult.code, 1, occupiedResult.output);
  assert.match(occupiedResult.output, /refuses to use occupied Storybook port/);
  assert.deepEqual(requestPaths, [], 'the occupied external server must not be queried');
  await assert.rejects(fs.access(runnerLogPath), 'the test runner must not be invoked');

  const targetUrlResult = await runRequired({
    ...commonEnv,
    STORYBOOK_PLAY_PORT: '61010',
    TARGET_URL: `http://127.0.0.1:${occupiedPort}/`,
  });
  assert.equal(targetUrlResult.code, 1, targetUrlResult.output);
  assert.match(targetUrlResult.output, /does not accept TARGET_URL/);
  assert.deepEqual(requestPaths, [], 'required mode must not contact TARGET_URL');
  await assert.rejects(fs.access(runnerLogPath), 'TARGET_URL must not reach the test runner');

  console.log('[storybook-play-required-gate] occupied server and TARGET_URL guards passed.');
} finally {
  await close(server);
  cleanupError = await removeFixtureSafely();
}
if (cleanupError) throw cleanupError;
