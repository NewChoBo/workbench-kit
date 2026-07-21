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

const primitivesBundlePath = path.join(reactSrc, 'primitives/styles.css');
const primitivesVisited = new Set();
collectImports(primitivesBundlePath, primitivesVisited);

const visited = new Set([...mainVisited, ...primitivesVisited]);

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

const layoutHubChecks = [
  { hub: path.join(reactSrc, 'layout/panel/index.css'), exceptions: new Set() },
  { hub: path.join(reactSrc, 'layout/sidebar/index.css'), exceptions: new Set() },
];

/** @type {string[]} */
const missingLayoutTsxImports = [];
for (const { hub, exceptions } of layoutHubChecks) {
  if (!fs.existsSync(hub)) continue;
  for (const file of collectFeatureHubLeaves(hub)) {
    if (!tsxCssImports.has(file) && !exceptions.has(file)) {
      missingLayoutTsxImports.push(file);
    }
  }
}

if (missingPrimitiveTsxImports.length > 0) {
  console.error('Primitives CSS hub entries missing a TSX side-effect import:');
  for (const file of missingPrimitiveTsxImports) {
    console.error(`  - ${path.relative(repoRoot, file)}`);
  }
}

if (missingLayoutTsxImports.length > 0) {
  console.error('Layout CSS hub entries missing a TSX side-effect import:');
  for (const file of missingLayoutTsxImports) {
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
  `Validated ${mainVisited.size} CSS files from styles.css, ${primitivesVisited.size} from primitives/styles.css, ${tsxCssImports.size} from TSX imports`,
);

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

if (missingLayoutTsxImports.length > 0) {
  process.exitCode = 1;
}

console.log('Plan A CSS validation passed.');
