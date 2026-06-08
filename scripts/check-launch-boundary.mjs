import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const targets = ['../custom_launcher', '../tile_paper'];

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

const allowlist = [
  /[\\/]custom_launcher[\\/]tests[\\/].*\.test\.ts$/,
  /[\\/]custom_launcher[\\/]tests[\\/].*\.test\.tsx$/,
  /[\\/]custom_launcher[\\/]shared[\\/]launch-target\.ts$/,
  /[\\/]tile_paper[\\/]tests[\\/].*\.test\.ts$/,
  /[\\/]tile_paper[\\/]tests[\\/].*\.test\.tsx$/,
];

function isAllowed(filePath) {
  const normalized = filePath.replace(/\//g, '\\');
  return allowlist.some((pattern) => pattern.test(normalized));
}

function scanDirectory(currentPath, violations) {
  for (const name of readdirSync(currentPath)) {
    if (
      name === 'node_modules' ||
      name === '.git' ||
      name === 'dist' ||
      name === 'out' ||
      name === 'build'
    ) {
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

    if (isAllowed(next)) {
      continue;
    }

    const content = readFileSync(next, 'utf8');

    content.split(/\r?\n/).forEach((line, index) => {
      for (const pattern of forbiddenPatterns) {
        if (pattern.regex.test(line)) {
          violations.push({
            path: relative(process.cwd(), next),
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

for (const target of targets) {
  const absolute = join(repoRoot, target);
  if (!existsSync(absolute)) {
    continue;
  }

  scanDirectory(absolute, violations);
}

if (violations.length > 0) {
  console.error('Launch boundary check failed: legacy launch policy usage found.');
  for (const violation of violations) {
    console.error(`${violation.path}:${violation.line} [${violation.rule}] ${violation.text}`);
  }
  process.exit(1);
}

console.log('Launch boundary check passed.');
process.exit(0);
