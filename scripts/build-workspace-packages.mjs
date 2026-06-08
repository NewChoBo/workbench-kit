import { execFileSync } from 'node:child_process';

const packages = ['@workbench-kit/contracts', '@workbench-kit/json-widget'];

for (const packageName of packages) {
  console.log(`[build-workspace] Building ${packageName}...`);
  run('pnpm', ['--filter', packageName, 'build'], { stdio: 'inherit' });
}

console.log('[build-workspace] Done.');

function run(command, args, options = {}) {
  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteCmdArg).join(' ')],
      options,
    );
  }

  return execFileSync(command, args, options);
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/(["^&|<>])/g, '^$1')}"`;
}
