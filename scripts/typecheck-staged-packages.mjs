import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/** Workspace directory prefix -> pnpm package name */
const PACKAGE_DIRS = {
  'packages/core': '@workbench-kit/core',
  'packages/contracts': '@workbench-kit/contracts',
  'packages/json-widget': '@workbench-kit/json-widget',
  'packages/workspace': '@workbench-kit/workspace',
  'packages/runtime': '@workbench-kit/runtime',
  'packages/services': '@workbench-kit/services',
  'packages/adapters': '@workbench-kit/adapters',
  'packages/react': '@workbench-kit/react',
  'packages/vscode-host': '@workbench-kit/vscode-host',
  'packages/vscode-extension': '@workbench-kit/vscode-extension',
  'apps/widget-authoring': '@workbench-kit/widget-authoring',
};

const TS_FILE = /\.(ts|tsx)$/i;
const STORY_FILE = /\.stories\.(ts|tsx)$/i;

function getStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'));
}

function resolveTypecheckTargets(files) {
  const packages = new Set();
  let needsRootTypecheck = false;

  for (const file of files) {
    if (!TS_FILE.test(file)) {
      continue;
    }

    if (file.startsWith('.storybook/') || file.startsWith('stories/') || STORY_FILE.test(file)) {
      needsRootTypecheck = true;
    }

    for (const [dir, pkg] of Object.entries(PACKAGE_DIRS)) {
      if (file === dir || file.startsWith(`${dir}/`)) {
        packages.add(pkg);
      }
    }
  }

  return { packages: [...packages], needsRootTypecheck };
}

function run(command) {
  execSync(command, { cwd: repoRoot, stdio: 'inherit' });
}

const stagedFiles = getStagedFiles();
const { packages, needsRootTypecheck } = resolveTypecheckTargets(stagedFiles);

if (packages.length === 0 && !needsRootTypecheck) {
  process.exit(0);
}

if (needsRootTypecheck) {
  console.log('typecheck-staged: running root Storybook tsconfig');
  run('pnpm typecheck:root');
}

for (const pkg of packages) {
  console.log(`typecheck-staged: running ${pkg}`);
  run(`pnpm --filter ${pkg} typecheck`);
}
