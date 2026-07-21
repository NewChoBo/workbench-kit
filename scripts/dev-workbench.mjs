import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const binRoot = path.join(repoRoot, 'node_modules', '.bin');
const sampleRoot = path.join(repoRoot, 'examples', 'workbench-sample');
const host = process.env.WORKBENCH_DEV_HOST || '127.0.0.1';
const samplePort = process.env.WORKBENCH_SAMPLE_PORT || '65173';
const storybookPort = process.env.STORYBOOK_PORT || '61009';
const storybookBasePath = process.env.STORYBOOK_BASE_PATH || '/storybook/';
const sampleUrl = `http://${host}:${samplePort}/`;
const storybookDirectUrl = `http://${host}:${storybookPort}/`;
const mode = process.argv[2] ?? 'sample';

function localBin(name) {
  return path.join(binRoot, isWindows ? `${name}.CMD` : name);
}

function createSampleProcess({ withStorybookProxy = false } = {}) {
  const env = {};

  if (withStorybookProxy) {
    env.WORKBENCH_SAMPLE_STORYBOOK_PROXY_TARGET = `http://${host}:${storybookPort}`;
  }

  return {
    name: 'workbench sample',
    command: localBin('vite'),
    args: ['--host', host, '--port', samplePort, '--strictPort'],
    cwd: sampleRoot,
    env,
    url: sampleUrl,
  };
}

const storybookProcess = {
  name: 'storybook',
  command: localBin('storybook'),
  args: ['dev', '--port', storybookPort, '--host', host, '--no-open'],
  cwd: repoRoot,
  env: {
    STORYBOOK_BASE_PATH: storybookBasePath,
  },
  url: storybookDirectUrl,
};

const processesByMode = {
  sample: [createSampleProcess()],
  storybook: [storybookProcess],
  all: [createSampleProcess({ withStorybookProxy: true }), storybookProcess],
};

const processes = processesByMode[mode];

if (!processes) {
  console.error(`Unknown dev mode: ${mode}. Use sample, storybook, or all.`);
  process.exit(1);
}

const children = new Set();
let stopping = false;

function stopChildren(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) {
      stopChild(child, signal);
    }
  }
}

function stopChild(child, signal) {
  if (isWindows) {
    const taskkill = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    taskkill.on('error', () => child.kill(signal));
    return;
  }

  child.kill(signal);
}

function startProcess(processInfo) {
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : processInfo.command;
  const args = isWindows
    ? ['/d', '/s', '/c', processInfo.command, ...processInfo.args]
    : processInfo.args;
  const child = spawn(command, args, {
    cwd: processInfo.cwd,
    env: {
      ...process.env,
      ...processInfo.env,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (stopping) {
      if (children.size === 0) {
        process.exit(0);
      }
      return;
    }

    stopChildren();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

const modeLabel =
  mode === 'all'
    ? 'workbench sample + storybook'
    : mode === 'storybook'
      ? 'storybook'
      : 'workbench sample';

console.log(`Starting Workbench Kit dev (${modeLabel}):`);
for (const processInfo of processes) {
  console.log(`- ${processInfo.name}: ${processInfo.url}`);
  startProcess(processInfo);
}

process.on('SIGINT', () => {
  stopChildren('SIGINT');
});

process.on('SIGTERM', () => {
  stopChildren('SIGTERM');
});
