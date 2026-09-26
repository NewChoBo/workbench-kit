import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const runnerName = '@storybook/test-runner';
const runnerPath = path.join(process.cwd(), 'node_modules', runnerName, 'package.json');
const required = process.argv.includes('--required');
const runSample = process.argv.includes('--sample');
const runAll = process.argv.includes('--all-stories');
const baselineTag = 'storybook-play-baseline';
const requiredTag = 'storybook-play-required';
const sampleTag = 'storybook-play-sample';
const storybookPort = process.env.STORYBOOK_PLAY_PORT || '61009';
const storybookHost = '127.0.0.1';
const storybookUrl = process.env.TARGET_URL || `http://${storybookHost}:${storybookPort}/`;

function logSkip(reason) {
  console.log(`[storybook-play] Skipped: ${reason}`);
  process.exitCode = required || runSample ? 1 : 0;
}

function logFailure(reason) {
  console.error(`[storybook-play] Failed: ${reason}`);
  process.exitCode = 1;
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
  return Number(parsed ? parsed.port || '6006' : '6006');
}

function getHostFromUrl(urlLike) {
  return resolveUrl(urlLike)?.hostname || storybookHost;
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

async function isPortAvailable(host, port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false);
      } else {
        reject(error);
      }
    });
    server.listen(port, host, () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });
  });
}

async function waitForStorybook(urlLike, child, timeoutMs = 90_000, intervalMs = 500) {
  const startedAt = Date.now();
  const healthUrl = `${removeTrailingSlash(urlLike)}/index.json`;
  while (Date.now() - startedAt < timeoutMs) {
    if (child.startupError || child.exitCode !== null || child.signalCode !== null) return false;
    if (await isStorybookReachable(healthUrl)) return true;
    await sleep(intervalMs);
  }
  return false;
}

function runCommand(name, args) {
  const commandArgs =
    process.platform === 'win32' ? ['/c', 'pnpm', 'exec', name, ...args] : ['exec', name, ...args];
  const command = process.platform === 'win32' ? 'cmd' : 'pnpm';
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: { ...process.env, CI: process.env.CI ?? '1' },
    });

    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function runPnpmHelp(args) {
  try {
    execSync(`pnpm ${args.join(' ')}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function startStorybook(port) {
  const storybookEntrypoint = path.join(
    process.cwd(),
    'node_modules',
    'storybook',
    'dist',
    'bin',
    'dispatcher.js',
  );
  if (!fs.existsSync(storybookEntrypoint)) {
    throw new Error(`Storybook CLI entrypoint is missing: ${storybookEntrypoint}`);
  }

  const child = spawn(
    process.execPath,
    [storybookEntrypoint, 'dev', '--port', String(port), '--host', storybookHost, '--no-open'],
    {
      cwd: process.cwd(),
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', FORCE_COLOR: '0' },
    },
  );
  child.startupError = null;
  child.once('error', (error) => {
    child.startupError = error;
  });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  return child;
}

async function waitForChildClose(child, timeoutMs = 10_000) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    child.once('close', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

async function stopStorybook(child, host, port) {
  if (child.exitCode === null && child.signalCode === null && child.pid) {
    if (process.platform === 'win32') {
      // Storybook is launched as a direct Node process; terminate its process tree as a backstop.
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }

    if (!(await waitForChildClose(child))) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
      if (!(await waitForChildClose(child))) return false;
    }
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if (await isPortAvailable(host, port)) return true;
    await sleep(100);
  }
  return false;
}

async function main() {
  if (required && process.env.TARGET_URL) {
    logFailure("--required does not accept TARGET_URL; it must test this checkout's Storybook.");
    return;
  }

  const port = getPortFromUrl(storybookUrl);
  const host = getHostFromUrl(storybookUrl);
  if (required && !(await isPortAvailable(host, port))) {
    logFailure(
      `Required gate refuses to use occupied Storybook port ${host}:${port}. Close the existing server and retry.`,
    );
    return;
  }

  if (!fs.existsSync(runnerPath)) {
    logSkip(
      '@storybook/test-runner is not installed. Add it when story play tests are ready.\n' +
        'Run: pnpm add -D @storybook/test-runner',
    );
    return;
  }

  try {
    if (!runPnpmHelp(['exec', 'test-storybook', '--help'])) {
      if (runPnpmHelp(['exec', 'storybook', 'test', '--help'])) {
        logSkip('test-storybook command is not available in this environment.');
      } else {
        logSkip('storybook test command is not available in this environment.');
      }
      return;
    }
  } catch (error) {
    logFailure(`Could not run the Storybook test command preflight: ${error.message}`);
    return;
  }

  const baselineMode = required || runSample || !runAll;
  const runArgs = [
    '--ci',
    '--maxWorkers=1',
    '--testTimeout=90000',
    '--disable-telemetry',
    '--browsers=chromium',
    `--url=${removeTrailingSlash(storybookUrl)}`,
  ];

  if (baselineMode) {
    const includeTag = runSample ? sampleTag : required ? requiredTag : baselineTag;
    runArgs.push(`--includeTags=${includeTag}`);
  }

  const alreadyRunning = required
    ? false
    : await isStorybookReachable(removeTrailingSlash(storybookUrl));
  let childStorybook = null;
  if (!alreadyRunning) {
    console.log(
      `[storybook-play] Storybook is not running on ${removeTrailingSlash(storybookUrl)}; launching temporary server.`,
    );
    try {
      childStorybook = startStorybook(port);
    } catch (error) {
      logFailure(error.message);
      return;
    }

    const ready = await waitForStorybook(storybookUrl, childStorybook);
    if (!ready) {
      const startupError = childStorybook.startupError;
      const cleaned = await stopStorybook(childStorybook, host, port);
      const reason = startupError
        ? `Could not start Storybook: ${startupError.message}.`
        : `Timed out waiting for this checkout's Storybook at ${removeTrailingSlash(storybookUrl)}`;
      logFailure(`${reason}${cleaned ? '' : ' Its port could not be released.'}`);
      return;
    }
  }

  console.log(
    `[storybook-play] Running Storybook interaction tests${baselineMode ? ' (baseline mode)' : ''}.`,
  );

  let runnerCode;
  let serverStopped = true;
  try {
    runnerCode = await runCommand('test-storybook', runArgs);
  } finally {
    if (childStorybook) {
      serverStopped = await stopStorybook(childStorybook, host, port);
    }
  }

  if (!serverStopped) {
    logFailure(`Temporary Storybook did not release ${host}:${port} after the run.`);
    return;
  }
  if (runnerCode !== 0) {
    process.exitCode = 1;
    return;
  }

  if (!required) {
    console.log('[storybook-play] Marked as optional smoke run.');
  }
}

await main();
