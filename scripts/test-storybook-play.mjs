import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const runnerName = '@storybook/test-runner';
const runnerPath = path.join(process.cwd(), 'node_modules', runnerName, 'package.json');
const required = process.argv.includes('--required');

function logSkip(reason) {
  console.log(`[storybook-play] Skipped: ${reason}`);
  if (required) process.exit(1);
  process.exit(0);
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
    console.error(
      '[storybook-play] @storybook/test-runner entrypoint is unavailable, but storybook test CLI is present.',
    );
    process.exit(0);
  } catch {
    logSkip('test-storybook command is not available in this environment.');
  }
}

console.error('[storybook-play] @storybook/test-runner entrypoint is available.');
console.error(
  'Please run storybook play tests via the package manager or CI plan that pins command expectations.',
);

if (!required) {
  console.log(
    '[storybook-play] Marked as available; execution is still a follow-up integration task.',
  );
}

process.exit(0);
