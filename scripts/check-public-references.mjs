import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fail when tracked public surfaces name internal / sibling products.
 * Policy: docs/conventions/public-reference-policy.md
 *
 * Keep the denylist in this script only; do not repeat those names in docs.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const selfPath = relative(repoRoot, fileURLToPath(import.meta.url)).replace(/\\/g, '/');

/**
 * Denylist for private host / sibling-repo leakage.
 * Do not add consumer product protocol brands that are still part of published
 * kit APIs here until those APIs are renamed in a dedicated change.
 */
const forbiddenPatterns = [
  {
    name: 'internal-sibling-repo-path',
    regex: /vue3[-_]?chatbot/i,
  },
  {
    name: 'internal-host-dev-agent',
    regex: /\bdev[-_]?agent\b/i,
  },
  {
    name: 'internal-host-devagent-identifier',
    regex: /\bdevAgent\b/,
  },
  {
    name: 'internal-codename-metabuild',
    regex: /\bmetabuild\b/i,
  },
  {
    name: 'internal-codename-mesim',
    regex: /\bmesim\b/i,
  },
];

const skippedDirectoryNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  'build',
  'coverage',
  'storybook-static',
  '.turbo',
  '.vite',
]);

const scannedExtensions = new Set([
  '.md',
  '.mdc',
  '.mdx',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.json',
  '.yml',
  '.yaml',
  '.html',
]);

const skippedExactPaths = new Set([selfPath, 'pnpm-lock.yaml', 'package-lock.json']);

function shouldScanFile(relativePath, fileName) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (skippedExactPaths.has(normalized)) {
    return false;
  }

  const ext = fileName.includes('.') ? `.${fileName.split('.').pop().toLowerCase()}` : '';
  if (!scannedExtensions.has(ext)) {
    return false;
  }

  // Lockfiles and generated huge assets are skipped above; scan the rest.
  return true;
}

function scanDirectory(currentPath, violations) {
  for (const name of readdirSync(currentPath)) {
    if (skippedDirectoryNames.has(name)) {
      continue;
    }

    const next = join(currentPath, name);
    const stat = statSync(next);

    if (stat.isDirectory()) {
      scanDirectory(next, violations);
      continue;
    }

    const relativePath = relative(repoRoot, next);
    if (!shouldScanFile(relativePath, name)) {
      continue;
    }

    let content;
    try {
      content = readFileSync(next, 'utf8');
    } catch {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      for (const pattern of forbiddenPatterns) {
        if (pattern.regex.test(line)) {
          violations.push({
            path: relativePath.replace(/\\/g, '/'),
            line: index + 1,
            rule: pattern.name,
            text: line.trim().slice(0, 200),
          });
        }
      }
    });
  }
}

const violations = [];
scanDirectory(repoRoot, violations);

if (violations.length > 0) {
  console.error(
    'Public reference check failed: internal or sibling product names found in tracked sources.',
  );
  console.error(
    'Use neutral host/capability language. See docs/conventions/public-reference-policy.md',
  );
  for (const violation of violations) {
    console.error(`${violation.path}:${violation.line} [${violation.rule}] ${violation.text}`);
  }
  process.exit(1);
}

console.log('Public reference check passed (no denylisted internal names in scanned sources).');
process.exit(0);
