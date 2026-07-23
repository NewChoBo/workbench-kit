import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Enforce Storybook play tag discipline:
 * - Every `play` in a `*.stories.tsx` must carry `storybook-play-required`
 *   or `storybook-play-baseline` on that story export (or file-level meta tags).
 * - Sample integration stories tagged `storybook-play-sample` must also be
 *   `storybook-play-required` (sample gate ⊆ required gate).
 *
 * Policy: docs/conventions/storybook.md, docs/workbench/storybook-e2e-coverage.md
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

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

const playTag = /storybook-play-(?:required|baseline)/;
const sampleTag = 'storybook-play-sample';
const requiredTag = 'storybook-play-required';

function collectStoryFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.storybook') {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirectoryNames.has(entry.name)) {
        continue;
      }
      collectStoryFiles(full, out);
      continue;
    }
    if (entry.isFile() && /\.stories\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Split a stories file into export blocks roughly by `export const Name`.
 * Good enough for CSF3 object stories in this repo.
 */
function splitExportBlocks(source) {
  const blocks = [];
  const exportRe = /^export const (\w+)\s*[:=]/gm;
  const matches = [...source.matchAll(exportRe)];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? source.length) : source.length;
    blocks.push({
      name: match[1],
      body: source.slice(start, end),
    });
  }
  return blocks;
}

function metaHasTag(source, tag) {
  const metaMatch = source.match(
    /(?:const|export const)\s+meta\s*=\s*\{[\s\S]*?\}\s+satisfies\s+Meta/,
  );
  if (!metaMatch) {
    return false;
  }
  return metaMatch[0].includes(tag);
}

function metaHasPlayTag(source) {
  return (
    metaHasTag(source, 'storybook-play-required') || metaHasTag(source, 'storybook-play-baseline')
  );
}

function blockHasPlay(body) {
  return /^\s*play\s*:/m.test(body) || /\bplay\s*:\s*async\b/.test(body);
}

function blockHasPlayTag(body) {
  return playTag.test(body);
}

function blockHasTag(body, tag) {
  return body.includes(tag);
}

const storyFiles = [
  ...collectStoryFiles(join(repoRoot, 'examples')),
  ...collectStoryFiles(join(repoRoot, 'packages')),
];

const orphans = [];
const sampleWithoutRequired = [];

for (const file of storyFiles) {
  const relativePath = relative(repoRoot, file).replace(/\\/g, '/');
  const source = readFileSync(file, 'utf8');
  const metaTagged = metaHasPlayTag(source);
  const metaSample = metaHasTag(source, sampleTag);
  const metaRequired = metaHasTag(source, requiredTag);
  const blocks = splitExportBlocks(source);

  if (metaSample && !metaRequired) {
    sampleWithoutRequired.push(`${relativePath} :: <meta>`);
  }

  for (const block of blocks) {
    if (!blockHasPlay(block.body)) {
      continue;
    }
    const tagged = metaTagged || blockHasPlayTag(block.body);
    if (!tagged) {
      orphans.push(`${relativePath} :: ${block.name}`);
    }
    const sampleOnBlock = blockHasTag(block.body, sampleTag);
    const requiredOnBlock = blockHasTag(block.body, requiredTag);
    if (sampleOnBlock && !requiredOnBlock && !metaRequired) {
      sampleWithoutRequired.push(`${relativePath} :: ${block.name}`);
    }
  }
}

if (orphans.length > 0) {
  console.error('Storybook play functions missing required/baseline tags:');
  for (const item of orphans) {
    console.error(`  - ${item}`);
  }
  console.error(
    "\nAdd tags: ['storybook-play-required'] or ['storybook-play-baseline'] to each play story.",
  );
  process.exit(1);
}

if (sampleWithoutRequired.length > 0) {
  console.error('storybook-play-sample stories must also include storybook-play-required:');
  for (const item of sampleWithoutRequired) {
    console.error(`  - ${item}`);
  }
  process.exit(1);
}

console.log(`Storybook play tag check passed (${storyFiles.length} story files, no orphan plays).`);
