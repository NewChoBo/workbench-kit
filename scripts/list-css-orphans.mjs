/**
 * List CSS files not reachable from styles.css import graph.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactSrc = path.join(__dirname, '../packages/react/src');

function walkCssFiles(dir) {
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

function resolveImport(filePath, importPath) {
  if (importPath.startsWith('@')) return null;
  return path.normalize(path.join(path.dirname(filePath), importPath));
}

function collectImports(filePath, visited) {
  if (visited.has(filePath)) return;
  visited.add(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const match of content.matchAll(/@import\s+['"]([^'"]+)['"]\s*;/g)) {
    const resolved = resolveImport(filePath, match[1]);
    if (resolved && fs.existsSync(resolved)) collectImports(resolved, visited);
  }
}

const visited = new Set();
collectImports(path.join(reactSrc, 'styles.css'), visited);

const allCss = walkCssFiles(reactSrc);
const orphans = allCss.filter((file) => !visited.has(path.normalize(file)));

for (const file of orphans) {
  console.log(path.relative(reactSrc, file).replace(/\\/g, '/'));
}
