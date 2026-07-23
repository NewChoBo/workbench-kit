/**
 * Reorganize flat workbench/layout CSS into feature subdirectories aligned with TSX owners.
 * Run from repo root: node scripts/reorganize-css-dirs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactSrc = path.resolve(__dirname, '../packages/react/src');

/** @param {string} fromRel @param {string} toRel */
function moveFile(fromRel, toRel) {
  const from = path.join(reactSrc, fromRel);
  const to = path.join(reactSrc, toRel);
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    fs.unlinkSync(to);
  }
  fs.renameSync(from, to);
  return true;
}

/**
 * Feature hub (`index.css`) must list leaf styles only.
 * Aggregator barrels (e.g. workbench-chrome.css) import the hub and must be excluded
 * or re-running this script creates a circular @import.
 */
const FEATURE_HUB_EXCLUDED = new Set(['index.css', 'workbench-chrome.css']);

/** @param {string} dirRel */
function writeFeatureHub(dirRel) {
  const hubFileName = 'index.css';
  const dir = path.join(reactSrc, dirRel);
  if (!fs.existsSync(dir)) return;

  const imports = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.css') && !FEATURE_HUB_EXCLUDED.has(name))
    .sort()
    .map((name) => `@import './${name}';`);

  if (imports.length === 0) return;

  fs.writeFileSync(
    path.join(dir, hubFileName),
    `/* ${dirRel} feature styles */\n${imports.join('\n')}\n`,
  );
}

const moves = [
  // workbench shell chrome
  ['workbench/activity-bar.css', 'workbench/shell/activity-bar.css'],
  ['workbench/split-view.css', 'workbench/shell/split-view.css'],
  ['workbench/status-bar.css', 'workbench/shell/status-bar.css'],
  ['workbench/shell.css', 'workbench/shell/shell.css'],
  ['workbench/confirmation-flow.css', 'workbench/shell/confirmation-flow.css'],

  // workbench platform chrome
  ['workbench/workbench-host.css', 'workbench/chrome/workbench-host.css'],
  ['workbench/workbench-shell-titlebar.css', 'workbench/chrome/workbench-shell-titlebar.css'],
  ['workbench/workbench-desktop-titlebar.css', 'workbench/chrome/workbench-desktop-titlebar.css'],
  ['workbench/workbench-platform-chrome.css', 'workbench/chrome/workbench-platform-chrome.css'],
  ['workbench/workbench-layout-regions.css', 'workbench/chrome/workbench-layout-regions.css'],

  // command palette
  ['workbench/command-palette.css', 'workbench/command-palette/command-palette.css'],

  // layout tree (WorkbenchTree.tsx)
  ['workbench/tree.css', 'layout/tree/tree.css'],
  ['workbench/tree-item.css', 'layout/tree/tree-item.css'],
  ['workbench/tree-expander.css', 'layout/tree/tree-expander.css'],
  ['workbench/tree-action.css', 'layout/tree/tree-action.css'],
  ['workbench/tree-drop-line.css', 'layout/tree/tree-drop-line.css'],
  ['workbench/tree-drop-zone.css', 'layout/tree/tree-drop-zone.css'],
  ['workbench/tree-drag-overlay.css', 'layout/tree/tree-drag-overlay.css'],
  ['workbench/drag-preview.css', 'layout/tree/drag-preview.css'],
  ['workbench/template-glyph.css', 'layout/tree/template-glyph.css'],

  // layout canvas (WorkbenchCanvas.tsx)
  ['workbench/canvas-viewport.css', 'layout/canvas/canvas-viewport.css'],
  ['workbench/canvas-pane-surface.css', 'layout/canvas/canvas-pane-surface.css'],
  ['workbench/canvas-frame-surface.css', 'layout/canvas/canvas-frame-surface.css'],
  ['workbench/canvas-item-frame.css', 'layout/canvas/canvas-item-frame.css'],
  ['workbench/canvas-item-badge.css', 'layout/canvas/canvas-item-badge.css'],
  ['workbench/canvas-placeholder.css', 'layout/canvas/canvas-placeholder.css'],
  ['workbench/canvas-drop-indicator.css', 'layout/canvas/canvas-drop-indicator.css'],
  ['workbench/canvas-drag-ghost.css', 'layout/canvas/canvas-drag-ghost.css'],
  ['workbench/canvas-drag-preview-frame.css', 'layout/canvas/canvas-drag-preview-frame.css'],
  ['workbench/canvas-guide-layer.css', 'layout/canvas/canvas-guide-layer.css'],
  ['workbench/canvas-guide-line.css', 'layout/canvas/canvas-guide-line.css'],
  ['workbench/canvas-guide-block.css', 'layout/canvas/canvas-guide-block.css'],
  ['workbench/canvas-frame-handle.css', 'layout/canvas/canvas-frame-handle.css'],
  ['workbench/canvas-resize-handle.css', 'layout/canvas/canvas-resize-handle.css'],
  ['workbench/canvas-resize-frame.css', 'layout/canvas/canvas-resize-frame.css'],
  ['workbench/canvas-resize-preview.css', 'layout/canvas/canvas-resize-preview.css'],
  ['workbench/canvas-selection-marquee.css', 'layout/canvas/canvas-selection-marquee.css'],
  ['workbench/preview-canvas.css', 'layout/canvas/preview-canvas.css'],

  // layout property (WorkbenchPropertyPanel.tsx)
  ['workbench/property-panel.css', 'layout/property/property-panel.css'],
  ['workbench/property-row.css', 'layout/property/property-row.css'],
  ['workbench/property-section.css', 'layout/property/property-section.css'],
  ['workbench/property-stack.css', 'layout/property/property-stack.css'],
  ['workbench/property-grid.css', 'layout/property/property-grid.css'],
  ['workbench/property-inline.css', 'layout/property/property-inline.css'],
  ['workbench/property-card.css', 'layout/property/property-card.css'],
  ['workbench/property-hint.css', 'layout/property/property-hint.css'],
  ['workbench/property-key-value.css', 'layout/property/property-key-value.css'],
  ['workbench/property-toggle.css', 'layout/property/property-toggle.css'],
  ['workbench/color-input.css', 'layout/property/color-input.css'],
  ['workbench/color-row.css', 'layout/property/color-row.css'],

  // layout editor (WorkbenchLayoutBase.tsx)
  ['workbench/editor-frame.css', 'layout/editor/editor-frame.css'],
  ['workbench/editor-body.css', 'layout/editor/editor-body.css'],
  ['workbench/editor-viewport.css', 'layout/editor/editor-viewport.css'],
  ['workbench/editor-bottom-panel.css', 'layout/editor/editor-bottom-panel.css'],
  ['workbench/problem-list.css', 'layout/editor/problem-list.css'],
  ['workbench/problem-item.css', 'layout/editor/problem-item.css'],
  ['workbench/parse-error.css', 'layout/editor/parse-error.css'],
  ['workbench/render-surface.css', 'layout/editor/render-surface.css'],
  ['workbench/floating-menu.css', 'layout/editor/floating-menu.css'],

  // layout fullscreen (WorkbenchFullscreen.tsx)
  ['workbench/fullscreen-root.css', 'layout/fullscreen/fullscreen-root.css'],
  ['workbench/fullscreen-backdrop.css', 'layout/fullscreen/fullscreen-backdrop.css'],
  ['workbench/fullscreen-header.css', 'layout/fullscreen/fullscreen-header.css'],
  ['workbench/fullscreen-content.css', 'layout/fullscreen/fullscreen-content.css'],
  ['workbench/fullscreen-hero.css', 'layout/fullscreen/fullscreen-hero.css'],
  ['workbench/fullscreen-button.css', 'layout/fullscreen/fullscreen-button.css'],
  ['workbench/fullscreen-nav-button.css', 'layout/fullscreen/fullscreen-nav-button.css'],
  ['workbench/fullscreen-option.css', 'layout/fullscreen/fullscreen-option.css'],
  ['workbench/fullscreen-pill.css', 'layout/fullscreen/fullscreen-pill.css'],
  ['workbench/fullscreen-pill-row.css', 'layout/fullscreen/fullscreen-pill-row.css'],
  ['workbench/fullscreen-carousel.css', 'layout/fullscreen/fullscreen-carousel.css'],
  ['workbench/fullscreen-empty.css', 'layout/fullscreen/fullscreen-empty.css'],

  // layout base regions (WorkbenchLayoutBase.tsx)
  ['workbench/root.css', 'layout/layout-base/root.css'],
  ['workbench/fill.css', 'layout/layout-base/fill.css'],
  ['workbench/center.css', 'layout/layout-base/center.css'],
  ['workbench/pane.css', 'layout/layout-base/pane.css'],
  ['workbench/column.css', 'layout/layout-base/column.css'],
  ['workbench/panel-surface.css', 'layout/layout-base/panel-surface.css'],
  ['workbench/panel-scroll.css', 'layout/layout-base/panel-scroll.css'],
  ['workbench/banner.css', 'layout/layout-base/banner.css'],
  ['workbench/empty.css', 'layout/layout-base/empty.css'],
  ['workbench/divider.css', 'layout/layout-base/divider.css'],
  ['workbench/section-title.css', 'layout/layout-base/section-title.css'],

  // layout media
  ['workbench/media-preview-viewport.css', 'layout/media/media-preview-viewport.css'],

  // primitives media components
  ['workbench/media-slot.css', 'primitives/workbench-media-slot/media-slot.css'],
  ['workbench/thumbnail.css', 'primitives/workbench-thumbnail/thumbnail.css'],

  // layout panel chrome
  ['layout/panel-chrome.css', 'layout/panel/panel-chrome.css'],
  ['layout/filter-bar.css', 'layout/panel/filter-bar.css'],
  ['layout/preview-pane.css', 'layout/panel/preview-pane.css'],
  ['layout/template-gallery.css', 'layout/panel/template-gallery.css'],

  // layout sidebar chrome
  ['layout/sidebar-chrome.css', 'layout/sidebar/sidebar-chrome.css'],
  ['layout/sidebar-section.css', 'layout/sidebar/sidebar-section.css'],
  ['layout/sidebar-section-stack.css', 'layout/sidebar/sidebar-section-stack.css'],
];

let moved = 0;
for (const [from, to] of moves) {
  if (moveFile(from, to)) moved += 1;
}

// Remove stale orphan CSS left from pre-reorg shell/ copies.
const shellDir = path.join(reactSrc, 'workbench/shell');
const shellHubLeafs = new Set([
  'index.css',
  'activity-bar.css',
  'confirmation-flow.css',
  'shell.css',
  'split-view.css',
  'status-bar.css',
]);
if (fs.existsSync(shellDir)) {
  for (const entry of fs.readdirSync(shellDir)) {
    if (!entry.endsWith('.css') || shellHubLeafs.has(entry)) continue;
    fs.unlinkSync(path.join(shellDir, entry));
    console.log(`Removed stale ${path.join('workbench/shell', entry)}`);
  }
}

const unmappedDir = path.join(reactSrc, 'workbench/_unmapped');
if (fs.existsSync(unmappedDir)) {
  fs.rmSync(unmappedDir, { recursive: true, force: true });
}

writeFeatureHub('workbench/shell');
writeFeatureHub('workbench/chrome');
writeFeatureHub('layout/panel');
writeFeatureHub('layout/sidebar');
writeFeatureHub('layout/tree');
writeFeatureHub('layout/canvas');
writeFeatureHub('layout/property');
writeFeatureHub('layout/editor');
writeFeatureHub('layout/fullscreen');
writeFeatureHub('layout/layout-base');
writeFeatureHub('layout/media');

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

fs.writeFileSync(
  path.join(reactSrc, 'layout/layout.css'),
  `/* Layout feature styles — grouped by TSX owner area */\n${layoutHubImports.join('\n')}\n`,
);

// Barrel lives under workbench/chrome/; siblings are ../shell and ../command-palette.
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

fs.writeFileSync(
  path.join(chromeBarrelDir, 'workbench-chrome.css'),
  `/* Workbench shell and platform chrome */\n${workbenchChromeImports.join('\n')}\n`,
);

// Remove stale pre-colocate barrel if present (would diverge from styles.css).
const staleChromeBarrel = path.join(reactSrc, 'workbench/workbench-chrome.css');
if (fs.existsSync(staleChromeBarrel)) {
  fs.unlinkSync(staleChromeBarrel);
  console.log('Removed stale workbench/workbench-chrome.css');
}

console.log(`Reorganized ${moved} CSS files into feature directories.`);
