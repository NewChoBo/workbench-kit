/**
 * Fix relative import paths after primitives folder reorganization.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'packages/react/src');

/** @param {string} fromDir */
function prefixToSrc(fromDir) {
  const rel = path.relative(srcRoot, fromDir);
  const depth = rel ? rel.split(path.sep).filter(Boolean).length : 0;
  return '../'.repeat(depth);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

for (const file of walk(srcRoot)) {
  const dir = path.dirname(file);
  const srcPrefix = prefixToSrc(dir);
  let content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(
    /from ['"]((?:\.\.\/)+)(primitives\/[^'"]+)['"]/g,
    (_match, _ups, tail) => `from '${srcPrefix}${tail}'`,
  );
  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
  }
}

const selectPath = path.join(srcRoot, 'primitives/select/Select.tsx');
let selectContent = fs.readFileSync(selectPath, 'utf8');
selectContent = selectContent.replace(/from '\.\.\/TextInput'/g, "from '../text-input/TextInput'");
fs.writeFileSync(selectPath, selectContent, 'utf8');

const selectTestPath = path.join(srcRoot, 'primitives/select/Select.test.tsx');
let selectTest = fs.readFileSync(selectTestPath, 'utf8');
selectTest = selectTest.replaceAll("from '../Select'", "from '.'");
fs.writeFileSync(selectTestPath, selectTest, 'utf8');

console.log('Fixed primitives import paths.');
