/**
 * Split ui-controls.css into co-located {bem-block}.css files and dissolve shell/.
 * Run from repo root: node scripts/colocate-component-css.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactSrc = path.resolve(__dirname, '../packages/react/src');

/** @param {string} css */
function extractBlocks(css) {
  const lines = css.split(/\r?\n/);
  /** @type {{ text: string, startLine: number }[]} */
  const blocks = [];

  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') {
      i += 1;
    }
    if (i >= lines.length) break;

    if (lines[i].trim().startsWith('/*')) {
      const start = i;
      while (i < lines.length) {
        if (lines[i].includes('*/')) {
          i += 1;
          break;
        }
        i += 1;
      }
      blocks.push({ text: lines.slice(start, i).join('\n'), startLine: start + 1 });
      continue;
    }

    const start = i;
    let depth = 0;
    let started = false;
    while (i < lines.length) {
      const line = lines[i];
      if (line.includes('{')) {
        depth += (line.match(/{/g) ?? []).length;
        started = true;
      }
      if (line.includes('}')) {
        depth -= (line.match(/}/g) ?? []).length;
      }
      i += 1;
      if (started && depth <= 0) break;
    }
    blocks.push({ text: lines.slice(start, i).join('\n'), startLine: start + 1 });
  }

  return blocks;
}

/** @param {string} blockText */
function blockRoots(blockText) {
  const roots = new Set();
  for (const line of blockText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('.') && !trimmed.startsWith('html.')) continue;
    const matches = trimmed.matchAll(/\.((?:ui-workbench-|ui-)[a-z0-9-]+)/g);
    for (const match of matches) {
      const cls = match[1];
      const root = cls.split('__')[0].split('--')[0];
      roots.add(root);
    }
  }
  return [...roots];
}

/** @param {string} root */
function targetForRoot(root) {
  const overrides = {
    'ui-workbench-activity-bar': 'workbench/shell/activity-bar.css',
    'ui-workbench-split-view': 'workbench/shell/split-view.css',
    'ui-workbench-status-bar': 'workbench/shell/status-bar.css',
    'ui-workbench-shell': 'workbench/shell/shell.css',
    'ui-workbench-confirmation-flow': 'workbench/shell/confirmation-flow.css',
    'ui-workbench-host': 'workbench/chrome/workbench-host.css',
    'ui-workbench-host-root': 'workbench/chrome/workbench-host.css',
    'ui-workbench-host-document': 'workbench/chrome/workbench-host.css',
    'ui-workbench-shell-titlebar': 'workbench/chrome/workbench-shell-titlebar.css',
    'ui-workbench-desktop-titlebar': 'workbench/chrome/workbench-desktop-titlebar.css',
    'ui-workbench-platform-chrome': 'workbench/chrome/workbench-platform-chrome.css',
    'ui-workbench-layout-regions': 'workbench/chrome/workbench-layout-regions.css',
    'ui-context-menu': 'overlay/context-menu.css',
    'ui-panel-loading': 'primitives/panel-loading.css',
    'ui-empty-state': 'primitives/empty-state.css',
    'ui-badge': 'primitives/badge.css',
    'ui-button': 'primitives/button.css',
    'ui-icon-button': 'primitives/icon-button.css',
    'ui-list': 'primitives/list.css',
    'ui-status-bar': 'primitives/status-bar.css',
    'ui-sidebar': 'primitives/sidebar.css',
    'ui-collapsible': 'primitives/collapsible.css',
    'ui-tabbed-panels': 'primitives/tabbed-panels.css',
    'ui-button-group': 'primitives/button-group.css',
    'ui-segmented-control': 'primitives/segmented-control.css',
    'ui-editor-tabs': 'primitives/editor-tabs.css',
    'ui-catalog-browse-card': 'primitives/catalog-browse-card.css',
    'ui-library-detail-layout': 'primitives/library-detail-layout.css',
    'ui-scroll-area-infinite-sentinel': 'primitives/scroll-area-infinite-sentinel.css',
    'ui-checkbox': 'primitives/checkbox.css',
    'ui-field': 'primitives/field.css',
    'ui-input': 'primitives/input.css',
    'ui-textarea': 'primitives/input.css',
    'ui-clearable-text-input': 'primitives/clearable-text-input.css',
    'ui-workbench-field': 'primitives/field.css',
    'ui-workbench-select': 'primitives/select/select.css',
  };

  if (overrides[root]) return overrides[root];

  if (root.startsWith('ui-workbench-')) {
    const slug = root.slice('ui-workbench-'.length);
    if (slug.startsWith('canvas-') || slug === 'preview-canvas') {
      return `layout/canvas/${slug}.css`;
    }
    if (slug.startsWith('tree') || slug === 'drag-preview' || slug === 'template-glyph') {
      return `layout/tree/${slug}.css`;
    }
    if (slug.startsWith('property-') || slug === 'color-input' || slug === 'color-row') {
      return `layout/property/${slug}.css`;
    }
    if (
      slug.startsWith('editor-') ||
      slug === 'problem-list' ||
      slug === 'problem-item' ||
      slug === 'parse-error' ||
      slug === 'render-surface' ||
      slug === 'floating-menu'
    ) {
      return `layout/editor/${slug}.css`;
    }
    if (slug.startsWith('fullscreen-')) {
      return `layout/fullscreen/${slug}.css`;
    }
    if (
      slug === 'root' ||
      slug === 'fill' ||
      slug === 'center' ||
      slug === 'pane' ||
      slug === 'column' ||
      slug === 'panel-surface' ||
      slug === 'panel-scroll' ||
      slug === 'banner' ||
      slug === 'empty' ||
      slug === 'divider' ||
      slug === 'section-title'
    ) {
      return `layout/layout-base/${slug}.css`;
    }
    if (slug === 'media-preview-viewport') {
      return 'layout/media/media-preview-viewport.css';
    }
    if (slug === 'media-slot') {
      return 'primitives/workbench-media-slot/media-slot.css';
    }
    if (slug === 'thumbnail') {
      return 'primitives/workbench-thumbnail/thumbnail.css';
    }
    if (slug === 'command-palette' || slug === 'command-palette-overlay') {
      return 'workbench/command-palette/command-palette.css';
    }
    return `workbench/${slug}.css`;
  }

  if (root.startsWith('ui-')) {
    return `primitives/${root.slice(3)}.css`;
  }

  return `workbench/_unmapped/${root}.css`;
}

/** @param {string} blockText */
function pickTarget(blockText) {
  const roots = blockRoots(blockText);
  if (roots.length === 0) {
    return 'workbench/_unmapped/anon.css';
  }
  const workbench = roots.find((r) => r.startsWith('ui-workbench-') || r === 'ui-context-menu');
  if (workbench) return targetForRoot(workbench);
  const ui = roots.find((r) => r.startsWith('ui-'));
  return targetForRoot(ui ?? roots[0]);
}

/** @param {string} relPath @param {string} chunk */
function appendChunk(files, relPath, chunk) {
  const trimmed = chunk.trim();
  if (!trimmed) return;
  if (!files.has(relPath)) files.set(relPath, []);
  files.get(relPath).push(trimmed);
}

const hubsOnly = process.argv.includes('--hubs-only');
const uiControlsPath = path.join(reactSrc, 'primitives/ui-controls.css');

if (!hubsOnly && fs.existsSync(uiControlsPath)) {
  const blocks = extractBlocks(fs.readFileSync(uiControlsPath, 'utf8'));
  /** @type {Map<string, string[]>} */
  const files = new Map();

  for (const block of blocks) {
    appendChunk(files, pickTarget(block.text), block.text);
  }

  for (const [relPath, chunks] of files) {
    const outPath = path.join(reactSrc, relPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${chunks.join('\n\n')}\n`, 'utf8');
  }

  fs.unlinkSync(uiControlsPath);
  console.log(`Split ui-controls.css into ${files.size} files`);
}

/** Shell CSS co-location (owner directory). */
const shellMoves = [
  ['workbench/shell/activity-bar.css', 'workbench/activity-bar.css'],
  ['workbench/shell/split-view.css', 'workbench/split-view.css'],
  ['workbench/shell/status-bar.css', 'workbench/status-bar.css'],
  ['workbench/shell/context-menu.css', 'overlay/context-menu.css'],
  ['workbench/shell/confirmation-flow.css', 'workbench/confirmation-flow.css'],
  ['workbench/shell/workbench-desktop-titlebar.css', 'workbench/workbench-desktop-titlebar.css'],
  ['workbench/shell/workbench-platform-chrome.css', 'workbench/workbench-platform-chrome.css'],
  ['workbench/shell/workbench-host-root.css', 'workbench/workbench-host.css'],
  ['workbench/shell/workbench-shell-titlebar.css', 'workbench/workbench-shell-titlebar.css'],
  ['workbench/shell/workbench-layout-regions.css', 'workbench/workbench-layout-regions.css'],
  ['workbench/shell/workbench-panel-chrome.css', 'layout/panel-chrome.css'],
  ['workbench/shell/workbench-filter-bar.css', 'layout/filter-bar.css'],
  ['workbench/shell/workbench-template-gallery.css', 'layout/template-gallery.css'],
  ['workbench/shell/workbench-preview-pane.css', 'layout/preview-pane.css'],
  ['workbench/shell/sidebar-chrome.css', 'layout/sidebar-chrome.css'],
];

if (!hubsOnly) {
  for (const [fromRel, toRel] of shellMoves) {
    const from = path.join(reactSrc, fromRel);
    const to = path.join(reactSrc, toRel);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (fs.existsSync(to)) {
      const merged = `${fs.readFileSync(to, 'utf8').trim()}\n\n${fs.readFileSync(from, 'utf8').trim()}\n`;
      fs.writeFileSync(to, merged, 'utf8');
      fs.unlinkSync(from);
    } else {
      fs.renameSync(from, to);
    }
  }

  const shellDir = path.join(reactSrc, 'workbench/shell');
  if (fs.existsSync(shellDir)) {
    for (const entry of fs.readdirSync(shellDir)) {
      if (entry === 'shell.css') continue;
      fs.unlinkSync(path.join(shellDir, entry));
    }
    fs.unlinkSync(path.join(shellDir, 'shell.css'));
    fs.rmdirSync(shellDir);
  }
}

function listCssFiles(dir, base = dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'shell' || entry.name === 'select')
        continue;
      out.push(...listCssFiles(full, base));
    } else if (
      entry.name.endsWith('.css') &&
      entry.name !== 'styles.css' &&
      entry.name !== 'primitives.css'
    ) {
      const rel = path.relative(base, full).replace(/\\/g, '/');
      if (rel === 'primitives/styles.css') continue;
      out.push(rel);
    }
  }
  return out.sort();
}

function writeFeatureHub(dirRel) {
  const hubFileName = 'index.css';
  const dir = path.join(reactSrc, dirRel);
  if (!fs.existsSync(dir)) return;

  const imports = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.css') && name !== hubFileName)
    .sort()
    .map((name) => `@import './${name}';`);

  if (imports.length === 0) return;

  fs.writeFileSync(
    path.join(dir, hubFileName),
    `/* ${dirRel} feature styles */\n${imports.join('\n')}\n`,
  );
}

function writeImportHubs() {
  const primitiveFiles = listCssFiles(
    path.join(reactSrc, 'primitives'),
    path.join(reactSrc, 'primitives'),
  )
    .filter((f) => f !== 'styles.css' && f !== 'panel-surface.css')
    .map((f) => `@import './${f}';`);

  fs.writeFileSync(
    path.join(reactSrc, 'primitives/primitives.css'),
    `/* Primitives component styles — co-located BEM blocks */\n@import './select/select.css';\n@import './select/select.app.css';\n${primitiveFiles.join('\n')}\n`,
  );

  writeFeatureHub('layout/panel');
  writeFeatureHub('layout/sidebar');
  writeFeatureHub('layout/tree');
  writeFeatureHub('layout/canvas');
  writeFeatureHub('layout/property');
  writeFeatureHub('layout/editor');
  writeFeatureHub('layout/fullscreen');
  writeFeatureHub('layout/layout-base');
  writeFeatureHub('layout/media');
  writeFeatureHub('workbench/shell');
  writeFeatureHub('workbench/chrome');

  const layoutHubImports = [
    'panel/index.css',
    'sidebar/index.css',
    'tree/index.css',
    'canvas/index.css',
    'property/index.css',
    'editor/index.css',
    'fullscreen/index.css',
    'layout-base/index.css',
    'media/index.css',
  ]
    .filter((rel) => fs.existsSync(path.join(reactSrc, 'layout', rel)))
    .map((rel) => `@import './${rel}';`);

  if (layoutHubImports.length) {
    fs.writeFileSync(
      path.join(reactSrc, 'layout/layout.css'),
      `/* Layout feature styles — grouped by TSX owner area */\n${layoutHubImports.join('\n')}\n`,
    );
  }

  const chromeBarrelDir = path.join(reactSrc, 'workbench/chrome');
  const workbenchChromeImports = [
    '../shell/index.css',
    './index.css',
    '../command-palette/command-palette.css',
  ]
    .filter((rel) => fs.existsSync(path.resolve(chromeBarrelDir, rel)))
    .map((rel) => `@import '${rel}';`);

  if (workbenchChromeImports.length !== 3) {
    throw new Error(
      `workbench-chrome.css barrel incomplete (${workbenchChromeImports.length}/3 imports resolved).`,
    );
  }

  fs.mkdirSync(chromeBarrelDir, { recursive: true });
  fs.writeFileSync(
    path.join(chromeBarrelDir, 'workbench-chrome.css'),
    `/* Workbench shell and platform chrome */\n${workbenchChromeImports.join('\n')}\n`,
  );

  const staleChromeBarrel = path.join(reactSrc, 'workbench/workbench-chrome.css');
  if (fs.existsSync(staleChromeBarrel)) {
    fs.unlinkSync(staleChromeBarrel);
  }

  const stylesPath = path.join(reactSrc, 'styles.css');
  const seen = new Set();
  const styles = fs
    .readFileSync(stylesPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.includes('workbench/shell/shell.css'))
    .flatMap((line) => {
      if (line.includes('workbench/settings/settings.css')) {
        return [
          line,
          "@import './layout/layout.css';",
          "@import './overlay/overlay.css';",
          "@import './workbench/chrome/workbench-chrome.css';",
        ];
      }
      return [line];
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('@import')) return true;
      if (seen.has(trimmed)) return false;
      seen.add(trimmed);
      return true;
    });

  fs.writeFileSync(stylesPath, `${styles.join('\n')}\n`, 'utf8');
  execSync(
    `pnpm exec prettier --write "${path.relative(path.resolve(__dirname, '..'), stylesPath).replace(/\\/g, '/')}"`,
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    },
  );

  const overlayPath = path.join(reactSrc, 'overlay/overlay.css');
  if (fs.existsSync(path.join(reactSrc, 'overlay/context-menu.css'))) {
    fs.writeFileSync(overlayPath, `/* Overlay surfaces */\n@import './context-menu.css';\n`);
  }
}

writeImportHubs();
console.log('Updated CSS import hubs.');
