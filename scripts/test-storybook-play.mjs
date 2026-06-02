import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const runnerName = '@storybook/test-runner';
const runnerPath = path.join(process.cwd(), 'node_modules', runnerName, 'package.json');
const required = process.argv.includes('--required');
const runAll = process.argv.includes('--all-stories');
const requiredTag = 'storybook-play-baseline';
const storybookPort = process.env.STORYBOOK_PLAY_PORT || '6010';
const storybookUrl = process.env.TARGET_URL || `http://127.0.0.1:${storybookPort}/`;
const pnpmCommand = 'pnpm';

function logSkip(reason) {
  console.log(`[storybook-play] Skipped: ${reason}`);
  if (required) process.exit(1);
  process.exit(0);
}

function resolveUrl(urlLike) {
  try {
    return new URL(urlLike.endsWith('/') ? urlLike : `${urlLike}/`);
  } catch {
    return null;
  }
}

function removeTrailingSlash(urlLike) {
  return urlLike.endsWith('/') ? urlLike.slice(0, -1) : urlLike;
}

function getPortFromUrl(urlLike) {
  const parsed = resolveUrl(urlLike);
  return parsed ? parsed.port || '6006' : '6006';
}

async function isStorybookReachable(urlLike) {
  try {
    const response = await fetch(urlLike, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function waitForStorybook(urlLike, timeoutMs = 90_000, intervalMs = 500) {
  const startedAt = Date.now();
  const healthUrl = `${removeTrailingSlash(urlLike)}/index.json`;
  while (Date.now() - startedAt < timeoutMs) {
    if (await isStorybookReachable(healthUrl)) return true;
    await sleep(intervalMs);
  }
  return false;
}

function runCommand(name, args) {
  const commandArgs =
    process.platform === 'win32' ? ['/c', 'pnpm', 'exec', name, ...args] : ['exec', name, ...args];
  const command = process.platform === 'win32' ? 'cmd' : pnpmCommand;
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: { ...process.env, CI: process.env.CI ?? '1' },
    });

    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function startStorybook(port) {
  const commandArgs =
    process.platform === 'win32'
      ? [
          '/c',
          'pnpm',
          'exec',
          'storybook',
          'dev',
          '--port',
          String(port),
          '--host',
          '127.0.0.1',
          '--no-open',
        ]
      : ['exec', 'storybook', 'dev', '--port', String(port), '--host', '127.0.0.1', '--no-open'];
  const command = process.platform === 'win32' ? 'cmd' : pnpmCommand;
  const child = spawn(command, commandArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', FORCE_COLOR: '0' },
  });

  return child;
}

if (!fs.existsSync(runnerPath)) {
  logSkip(
    '@storybook/test-runner is not installed. Add it when story play tests are ready.\n' +
      'Run: pnpm add -D @storybook/test-runner',
  );
}

try {
  execSync('pnpm exec test-storybook --help', { stdio: 'pipe' });
} catch {
  try {
    execSync('pnpm exec storybook test --help', { stdio: 'pipe' });
    logSkip('test-storybook command is not available in this environment.');
  } catch {
    logSkip('storybook test command is not available in this environment.');
  }
}

const baselineMode = required || !runAll;
const runArgs = [
  '--ci',
  '--maxWorkers=1',
  '--disable-telemetry',
  '--browsers=chromium',
  `--url=${removeTrailingSlash(storybookUrl)}`,
];

if (baselineMode) {
  runArgs.push(`--includeTags=${requiredTag}`);
}

const port = getPortFromUrl(storybookUrl);
let childStorybook = null;

const alreadyRunning = await isStorybookReachable(removeTrailingSlash(storybookUrl));
if (!alreadyRunning) {
  console.log(
    `[storybook-play] Storybook is not running on ${removeTrailingSlash(storybookUrl)}; launching temporary server.`,
  );
  childStorybook = startStorybook(port);

  const ready = await waitForStorybook(storybookUrl);
  if (!ready) {
    childStorybook?.kill('SIGTERM');
    logSkip(
      `Timed out waiting for Storybook to become ready at ${removeTrailingSlash(storybookUrl)}.`,
    );
  }
}

console.log(
  `[storybook-play] Running Storybook interaction tests${baselineMode ? ' (baseline mode)' : ''}.`,
);

const runnerCode = await runCommand('test-storybook', runArgs);
if (childStorybook) childStorybook.kill('SIGTERM');

if (runnerCode !== 0) {
  process.exit(1);
}

if (!required) {
  console.log('[storybook-play] Marked as optional smoke run.');
}

process.exit(0);
