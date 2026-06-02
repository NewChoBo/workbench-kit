import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const runnerName = '@storybook/test-runner';
const runnerPath = path.join(process.cwd(), 'node_modules', runnerName, 'package.json');

if (!fs.existsSync(runnerPath)) {
  console.log(
    '[storybook-play] Skipped: @storybook/test-runner is not installed. Add it when story play tests are ready.\n' +
      'Run: pnpm add -D @storybook/test-runner',
  );
  process.exit(0);
}

try {
  execSync('pnpm exec storybook test --help', { stdio: 'pipe' });
} catch {
  console.error(
    '[storybook-play] Skipped: storybook test command is not available with the current Storybook CLI.',
  );
  process.exit(0);
}

console.error(
  '[storybook-play] @storybook/test-runner is installed but test command is not implemented in this environment.',
);
process.exit(1);
