/**
 * Validate Plan A CSS files: syntax (brace balance), @import resolution, prettier.
 * Run from repo root: node scripts/validate-plan-a-css.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reactSrc = path.join(repoRoot, 'packages/react/src');
const stylesPath = path.join(reactSrc, 'styles.css');

/** @param {string} dir */
function walkSourceFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...walkSourceFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** @param {string} dir */
function collectTsxCssImports(dir) {
  /** @type {Set<string>} */
  const imports = new Set();
  for (const file of walkSourceFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/import\s+['"]([^'"]+\.css)['"]\s*;/g)) {
      const resolved = resolveImport(file, match[1]);
      if (resolved && fs.existsSync(resolved)) {
        imports.add(path.normalize(resolved));
      }
    }
  }
  return imports;
}

/** @param {string} hubPath */
function collectFeatureHubLeaves(hubPath) {
  /** @type {Set<string>} */
  const leaves = new Set();
  const content = fs.readFileSync(hubPath, 'utf8');
  for (const match of content.matchAll(/@import\s+['"](\.\/[^'"]+)['"]\s*;/g)) {
    const resolved = resolveImport(hubPath, match[1]);
    if (!resolved || !fs.existsSync(resolved)) continue;
    if (resolved.endsWith('index.css')) {
      for (const nested of collectFeatureHubLeaves(resolved)) {
        leaves.add(nested);
      }
      continue;
    }
    leaves.add(path.normalize(resolved));
  }
  return leaves;
}

/** @param {string} dir */
function walkCssFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...walkCssFiles(full));
    } else if (entry.name.endsWith('.css')) {
      files.push(full);
    }
  }
  return files;
}

/** @param {string} content @param {string} file */
function assertBraceBalance(content, file) {
  let depth = 0;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const opens = (line.match(/{/g) ?? []).length;
    const closes = (line.match(/}/g) ?? []).length;
    depth += opens - closes;
    if (depth < 0) {
      throw new Error(`${file}:${i + 1}: unexpected closing brace`);
    }
  }
  if (depth !== 0) {
    throw new Error(`${file}: unclosed braces (depth ${depth})`);
  }
}

/** @param {string} filePath */
function resolveImport(filePath, importPath) {
  if (importPath.startsWith('@')) return null;
  const base = path.dirname(filePath);
  return path.normalize(path.join(base, importPath));
}

/** @param {string} content @param {string} file */
function assertNonEmptyCss(content, file) {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!stripped) {
    throw new Error(`${file}: CSS file is empty`);
  }
  const withoutImports = stripped.replace(/@import\s+['"][^'"]+['"]\s*;/g, '').trim();
  if (!withoutImports) return;
  if (!withoutImports.includes('{')) {
    throw new Error(`${file}: CSS file has no rules`);
  }
}

/** @param {string} filePath @param {Set<string>} visited */
function collectImports(filePath, visited) {
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(repoRoot, filePath);
  assertBraceBalance(content, rel);
  assertNonEmptyCss(content, rel);

  const importRe = /@import\s+['"]([^'"]+)['"]\s*;/g;
  for (const match of content.matchAll(importRe)) {
    const resolved = resolveImport(filePath, match[1]);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      throw new Error(`Missing import in ${rel}: ${match[1]}`);
    }
    collectImports(resolved, visited);
  }
}

const mainVisited = new Set();
collectImports(stylesPath, mainVisited);

const coreStylesPath = path.join(reactSrc, 'styles/core.css');
const coreVisited = new Set();
collectImports(coreStylesPath, coreVisited);

const primitivesBundlePath = path.join(reactSrc, 'primitives/styles.css');
const primitivesVisited = new Set();
collectImports(primitivesBundlePath, primitivesVisited);

const focusedEntryNames = ['foundation.css', 'overlay.css'];
const focusedEntryGraphs = new Map(
  focusedEntryNames.map((entryName) => {
    const entryPath = path.join(reactSrc, 'styles', entryName);
    const entryVisited = new Set();
    collectImports(entryPath, entryVisited);
    return [entryName, entryVisited];
  }),
);
const menuCompatibilityEntryPath = path.join(reactSrc, 'workbench-menu-surfaces.css');
const menuCompatibilityVisited = new Set();
collectImports(menuCompatibilityEntryPath, menuCompatibilityVisited);

const visited = new Set([
  ...mainVisited,
  ...coreVisited,
  ...primitivesVisited,
  ...[...focusedEntryGraphs.values()].flatMap((entryVisited) => [...entryVisited]),
  ...menuCompatibilityVisited,
]);

function relativeReactPath(file) {
  return path.relative(reactSrc, file).replaceAll('\\', '/');
}

function findUnexpectedFocusedFiles(entryName, isAllowed) {
  return [...(focusedEntryGraphs.get(entryName) ?? [])].filter(
    (file) => !isAllowed(relativeReactPath(file)),
  );
}

const unexpectedFoundationFiles = findUnexpectedFocusedFiles(
  'foundation.css',
  (relative) => relative === 'styles/foundation.css' || relative === 'scrollbars.css',
);
const unexpectedOverlayFiles = findUnexpectedFocusedFiles(
  'overlay.css',
  (relative) => relative === 'styles/overlay.css' || relative.startsWith('overlay/'),
);
const unexpectedMenuCompatibilityFiles = [...menuCompatibilityVisited].filter((file) => {
  const relative = relativeReactPath(file);
  return ![
    'overlay/context-menu-density.css',
    'workbench-menu-surfaces.css',
    'workbench/views/command-list-density.css',
  ].includes(relative);
});
const foundationSidebarLeaks = [...(focusedEntryGraphs.get('foundation.css') ?? [])].filter(
  (file) => fs.readFileSync(file, 'utf8').includes('.workbench-primary-sidebar'),
);
function isOptionalCoreFeature(file) {
  const relative = path.relative(reactSrc, file).replaceAll('\\', '/');
  return relative.startsWith('workbench/auth/') || relative.startsWith('workbench/chat/');
}

const unexpectedCoreFeatures = [...coreVisited].filter(isOptionalCoreFeature);
const missingCoreFiles = [...mainVisited].filter(
  (file) => file !== stylesPath && !isOptionalCoreFeature(file) && !coreVisited.has(file),
);
const unexpectedCoreFiles = [...coreVisited].filter(
  (file) => file !== coreStylesPath && !mainVisited.has(file),
);

const tsxCssImports = collectTsxCssImports(reactSrc);
for (const file of tsxCssImports) {
  visited.add(file);
}

const primitivesHubPath = path.join(reactSrc, 'primitives/primitives.css');
const primitivesHubLeaves = collectFeatureHubLeaves(primitivesHubPath);
const primitivesTsxImportExceptions = new Set([
  path.normalize(path.join(reactSrc, 'primitives/visually-hidden/visually-hidden.css')),
  path.normalize(path.join(reactSrc, 'primitives/panel-surface/panel-surface.css')),
]);

const missingPrimitiveTsxImports = [...primitivesHubLeaves].filter(
  (file) => !tsxCssImports.has(file) && !primitivesTsxImportExceptions.has(file),
);

const componentHubChecks = [
  { hub: path.join(reactSrc, 'overlay/overlay.css'), exceptions: new Set() },
  { hub: path.join(reactSrc, 'layout/panel/index.css'), exceptions: new Set() },
  { hub: path.join(reactSrc, 'layout/sidebar/index.css'), exceptions: new Set() },
];

/** @type {string[]} */
const missingComponentTsxImports = [];
for (const { hub, exceptions } of componentHubChecks) {
  if (!fs.existsSync(hub)) continue;
  for (const file of collectFeatureHubLeaves(hub)) {
    if (!tsxCssImports.has(file) && !exceptions.has(file)) {
      missingComponentTsxImports.push(file);
    }
  }
}

if (missingPrimitiveTsxImports.length > 0) {
  console.error('Primitives CSS hub entries missing a TSX side-effect import:');
  for (const file of missingPrimitiveTsxImports) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (missingComponentTsxImports.length > 0) {
  console.error('Component CSS hub entries missing a TSX side-effect import:');
  for (const file of missingComponentTsxImports) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

const allCss = walkCssFiles(reactSrc);
const orphanCss = allCss.filter(
  (file) => !visited.has(file) && !file.includes('primitives/styles.css'),
);

const allowedOrphans = new Set([path.normalize(path.join(reactSrc, 'primitives/styles.css'))]);

const unexpectedOrphans = orphanCss.filter((file) => !allowedOrphans.has(path.normalize(file)));

console.log(
  `Validated ${mainVisited.size} CSS files from styles.css, ${coreVisited.size} from styles/core.css, ${primitivesVisited.size} from primitives/styles.css, ${focusedEntryGraphs.size} focused entry graphs, 1 menu compatibility graph, ${tsxCssImports.size} from TSX imports`,
);

for (const [entryName, files] of [
  ['foundation.css', unexpectedFoundationFiles],
  ['overlay.css', unexpectedOverlayFiles],
]) {
  if (files.length === 0) continue;
  console.error(`Focused CSS entry styles/${entryName} crosses its feature boundary:`);
  for (const file of files) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (unexpectedMenuCompatibilityFiles.length > 0) {
  console.error('workbench-menu-surfaces.css imports files outside its compatibility boundary:');
  for (const file of unexpectedMenuCompatibilityFiles) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (foundationSidebarLeaks.length > 0) {
  console.error('Foundation CSS contains Workbench primary-sidebar selectors:');
  for (const file of foundationSidebarLeaks) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (unexpectedCoreFeatures.length > 0) {
  console.error('Core CSS includes optional Auth or Chat styles:');
  for (const file of unexpectedCoreFeatures) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (missingCoreFiles.length > 0) {
  console.error('Core CSS is missing non-optional full bundle styles:');
  for (const file of missingCoreFiles) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (unexpectedCoreFiles.length > 0) {
  console.error('Core CSS includes styles outside the full bundle:');
  for (const file of unexpectedCoreFiles) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (unexpectedOrphans.length > 0) {
  console.warn('CSS files not reachable from styles.css hub or TSX imports:');
  for (const file of unexpectedOrphans) {
    console.warn(`  - ${path.relative(repoRoot, file)}`);
  }
}

execSync(`pnpm exec prettier --check "packages/react/src/**/*.css"`, {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: true,
});

if (unexpectedOrphans.length > 0) {
  process.exitCode = 1;
}

if (missingPrimitiveTsxImports.length > 0) {
  process.exitCode = 1;
}

if (missingComponentTsxImports.length > 0) {
  process.exitCode = 1;
}

if (unexpectedCoreFeatures.length > 0) {
  process.exitCode = 1;
}

if (missingCoreFiles.length > 0 || unexpectedCoreFiles.length > 0) {
  process.exitCode = 1;
}

if (
  unexpectedFoundationFiles.length > 0 ||
  unexpectedOverlayFiles.length > 0 ||
  unexpectedMenuCompatibilityFiles.length > 0 ||
  foundationSidebarLeaks.length > 0
) {
  process.exitCode = 1;
}

console.log('Plan A CSS validation passed.');
