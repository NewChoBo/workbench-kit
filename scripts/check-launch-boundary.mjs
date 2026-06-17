import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const forbiddenPatterns = [
  {
    name: 'shared-launch-target-import',
    regex: /from ['"`]\.?#shared\/launch-target['"`]/,
  },
  {
    name: 'shared-launchpad-library-mapping-import',
    regex: /from ['"`]\.?#shared\/launchpads\/launchpad-library-mapping['"`]/,
  },
  {
    name: 'legacy-launch-detector-calls',
    regex: /\b(detectLaunchType|normalizeLaunchInput|isValidLaunchTarget)\b/,
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
]);

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

    if (!/\.(t|j)sx?$/i.test(name)) {
      continue;
    }

    const content = readFileSync(next, 'utf8');

    content.split(/\r?\n/).forEach((line, index) => {
      for (const pattern of forbiddenPatterns) {
        if (pattern.regex.test(line)) {
          violations.push({
            path: relative(repoRoot, next),
            line: index + 1,
            rule: pattern.name,
            text: line.trim(),
          });
        }
      }
    });
  }
}

const violations = [];

scanDirectory(repoRoot, violations);

const filteredViolations = violations.filter(
  (violation) => violation.path.replace(/\\/g, '/') !== 'scripts/check-launch-boundary.mjs',
);

if (filteredViolations.length > 0) {
  console.error('Launch boundary check failed: legacy launch policy usage found in workbench-kit.');
  for (const violation of filteredViolations) {
    console.error(`${violation.path}:${violation.line} [${violation.rule}] ${violation.text}`);
  }
  process.exit(1);
}

console.log('Launch boundary check passed (workbench-kit scope).');
process.exit(0);
