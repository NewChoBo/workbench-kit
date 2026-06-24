import { spawn } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const processes = [
  {
    name: 'workbench sample',
    args: ['workbench-sample'],
    env: {},
    url: 'http://127.0.0.1:5173/',
  },
  {
    name: 'storybook',
    args: ['storybook'],
    env: {},
    url: 'http://127.0.0.1:6010/',
  },
];

const children = new Set();
let stopping = false;

function stopChildren(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function startProcess(processInfo) {
  const child = spawn(pnpm, processInfo.args, {
    env: {
      ...process.env,
      ...processInfo.env,
    },
    stdio: 'inherit',
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

console.log('Starting Workbench Kit dev servers:');
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
