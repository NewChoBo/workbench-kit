import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rootPackage = readJson(path.join(root, 'package.json'));
const version = rootPackage.version;
const refType = process.env.GITHUB_REF_TYPE;
const refName = process.env.GITHUB_REF_NAME;

if (refType === 'tag' && refName) {
  const expectedTags = new Set([`v${version}`, `workbench-kit-v${version}`]);
  if (!expectedTags.has(refName)) {
    throw new Error(
      `Release tag ${refName} does not match package version ${version}. Expected one of: ${[...expectedTags].join(', ')}`,
    );
  }
}

for (const packageJsonPath of packageJsonPaths()) {
  const pkg = readJson(packageJsonPath);
  if (pkg.version !== version) {
    throw new Error(`${pkg.name} version ${pkg.version} does not match root version ${version}.`);
  }
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
