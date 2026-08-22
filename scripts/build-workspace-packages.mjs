import { runCommand } from './lib/run-command.mjs';

const packages = [
  '@workbench-kit/contracts',
  '@workbench-kit/electron-shell',
  '@workbench-kit/jdw',
  '@workbench-kit/platform',
  '@workbench-kit/workbench-core',
];

for (const packageName of packages) {
  console.log(`[build-workspace] Building ${packageName}...`);
  runCommand('pnpm', ['--filter', packageName, 'build'], { stdio: 'inherit' });
}

console.log('[build-workspace] Done.');
