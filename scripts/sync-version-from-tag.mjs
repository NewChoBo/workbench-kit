import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cliArgs = process.argv.slice(2);
const dryRun = cliArgs.includes('--dry-run');
const tagArg = cliArgs.find((arg) => arg !== '--dry-run');
const refType = process.env.GITHUB_REF_TYPE;
const refName = tagArg || process.env.GITHUB_REF_NAME;

if (!refName) {
  console.log('[sync-version-from-tag] Skipped: no tag name provided.');
  process.exit(0);
}

if (!tagArg && refType !== 'tag') {
  console.log('[sync-version-from-tag] Skipped: ref is not a tag.');
  process.exit(0);
}

const version = versionFromTag(refName);
const targets = [path.join(root, 'package.json'), ...packageJsonPaths()];
const updates = [];

for (const packageJsonPath of targets) {
  const pkg = readJson(packageJsonPath);
  if (pkg.version === version) {
    continue;
  }

  updates.push({
    path: packageJsonPath,
    name: pkg.name ?? path.relative(root, packageJsonPath),
    from: pkg.version,
    to: version,
  });

  if (!dryRun) {
    pkg.version = version;
    writeJson(packageJsonPath, pkg);
  }
}

if (updates.length === 0) {
  console.log(`[sync-version-from-tag] Already at version ${version}.`);
  process.exit(0);
}

const mode = dryRun ? 'Would sync' : 'Synced';
for (const update of updates) {
  console.log(`[sync-version-from-tag] ${mode} ${update.name}: ${update.from} -> ${update.to}`);
}

function versionFromTag(tagName) {
  if (tagName.startsWith('workbench-kit-v')) {
    return tagName.slice('workbench-kit-v'.length);
  }
  if (tagName.startsWith('v')) {
    return tagName.slice(1);
  }

  throw new Error(
    `Unsupported release tag ${tagName}. Expected v<version> or workbench-kit-v<version>.`,
  );
}

function packageJsonPaths() {
  const packagesDir = path.join(root, 'packages');
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, 'package.json'))
    .filter((packageJsonPath) => fs.existsSync(packageJsonPath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
