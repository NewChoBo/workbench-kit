import { execFileSync } from 'node:child_process';

if (
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.SKIP_WORKSPACE_BUILD === '1'
) {
  console.log('[postinstall] Skipped workspace package build.');
  process.exit(0);
}

execFileSync('node', ['scripts/build-workspace-packages.mjs'], { stdio: 'inherit' });
