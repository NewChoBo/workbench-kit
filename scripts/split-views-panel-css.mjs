/**
 * Split views-panel.css into co-located feature CSS files.
 * Run from repo root: node scripts/split-views-panel-css.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactSrc = path.resolve(__dirname, '../packages/react/src');
const viewsDir = path.join(reactSrc, 'workbench/views');

/** @param {string} css */
function extractBlocks(css) {
  const lines = css.split(/\r?\n/);
  /** @type {{ text: string }[]} */
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
      blocks.push({ text: lines.slice(start, i).join('\n') });
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
    blocks.push({ text: lines.slice(start, i).join('\n') });
  }

  return blocks;
}

/** @param {string} blockText */
function collectRoots(blockText) {
  /** @type {Set<string>} */
  const roots = new Set();
  for (const line of blockText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('.') && !trimmed.startsWith('html.')) continue;
    for (const match of trimmed.matchAll(/\.((?:ui-workbench-|ui-side-bar-|ui-)[a-z0-9-]+)/g)) {
      const cls = match[1];
      roots.add(cls.split('__')[0].split('--')[0]);
    }
    for (const match of trimmed.matchAll(/\.((?:workbench-|shell-react-)[a-z0-9-]+)/g)) {
      const cls = match[1];
      roots.add(cls.split('__')[0].split('--')[0]);
    }
  }
  return [...roots];
}

const uiOverrides = {
  'ui-button-group': 'primitives/button-group.css',
  'ui-empty-state': 'primitives/empty-state.css',
  'ui-icon-button': 'primitives/icon-button.css',
  'ui-segmented-control': 'primitives/segmented-control.css',
  'ui-scroll-area': 'primitives/scroll-area.css',
  'ui-visually-hidden': 'primitives/visually-hidden.css',
  'ui-side-bar-view': 'primitives/side-bar-view.css',
  'ui-side-bar-list': 'primitives/side-bar-view.css',
  'ui-side-bar-list-entry': 'primitives/side-bar-view.css',
  'ui-side-bar-list-item': 'primitives/side-bar-view.css',
  'ui-side-bar-row': 'primitives/side-bar-view.css',
  'ui-side-bar-scroll-spacer': 'primitives/side-bar-view.css',
  'ui-side-bar-header-control': 'primitives/side-bar-view.css',
  'ui-side-bar-inline-edit': 'primitives/side-bar-view.css',
  'ui-workbench-sidebar-section': 'layout/sidebar/sidebar-section.css',
  'ui-workbench-sidebar-section-stack': 'layout/sidebar/sidebar-section-stack.css',
  'ui-workbench-command-palette': 'workbench/command-palette.css',
  'ui-workbench-command-palette-overlay': 'workbench/command-palette.css',
  'ui-workbench-split-view': 'workbench/split-view.css',
  'ui-workspace-explorer-panel': 'workbench/workspace/workspace-explorer-panel.css',
  'ui-json-code-editor-pane': 'workbench/workspace/json-code-editor-pane.css',
  'ui-json-config-workbench': 'workbench/workspace/json-config-workbench.css',
  'ui-workbench-action-list': 'workbench/views/action-list.css',
  'ui-workbench-action-list-item': 'workbench/views/action-list.css',
  'ui-workbench-artifact-preview': 'workbench/views/artifact-preview.css',
  'ui-workbench-artifact-shell': 'workbench/views/artifact-preview.css',
  'ui-workbench-artifact-story-diagram': 'workbench/views/artifact-preview.css',
  'ui-workbench-artifact-story-preview': 'workbench/views/artifact-preview.css',
  'ui-workbench-command-group-shell': 'workbench/views/command-list.css',
  'ui-workbench-command-item': 'workbench/views/command-list.css',
  'ui-workbench-command-list': 'workbench/views/command-list.css',
  'ui-workbench-command-suggest': 'workbench/views/command-list.css',
  'ui-workbench-timeline': 'workbench/views/timeline.css',
  'ui-workbench-timeline-event': 'workbench/views/timeline.css',
  'ui-workbench-multi-provider-explorer': 'workbench/views/multi-provider-explorer.css',
  'ui-workbench-view-sidebar': 'workbench/views/view-sidebar.css',
};

const legacyOverrides = {
  'workbench-commands-sidebar': 'workbench/views/commands-sidebar.css',
  'workbench-command-inspector': 'workbench/views/command-inspector.css',
  'workbench-command-inspector-surface': 'workbench/views/command-inspector.css',
  'workbench-extensions-sidebar': 'workbench/views/extensions-sidebar.css',
  'workbench-search-control': 'workbench/views/search.css',
  'workbench-search-mark': 'workbench/views/search.css',
  'workbench-tree-chevron': 'workbench/tree.css',
  'workbench-tree-label': 'workbench/tree.css',
  'workbench-tree-prefix': 'workbench/tree.css',
  'workbench-tree-spacer': 'workbench/tree.css',
  'workbench-monaco-panel': 'workbench/workspace/monaco-panel.css',
  'workbench-management-filter-chips': 'workbench/management/management-filter-chips.css',
  'workbench-editor-title': 'workbench/views/editor-title.css',
  'workbench-explorer-view': 'workbench/views/view-hosts.css',
  'workbench-commands-view': 'workbench/views/view-hosts.css',
  'workbench-search-view': 'workbench/views/view-hosts.css',
  'workbench-chat-view': 'workbench/views/view-hosts.css',
  'workbench-primary-side-bar': 'workbench/views/view-hosts.css',
  'shell-react-primary-sidebar': 'workbench/views/view-hosts.css',
};

/** @param {string} root */
function targetForRoot(root) {
  if (uiOverrides[root]) return uiOverrides[root];
  if (legacyOverrides[root]) return legacyOverrides[root];

  if (root.startsWith('ui-workbench-')) {
    return `workbench/views/${root.slice('ui-workbench-'.length)}.css`;
  }

  if (root.startsWith('ui-side-bar-')) {
    return 'primitives/side-bar-view.css';
  }

  if (root.startsWith('ui-')) {
    return `primitives/${root.slice(3)}.css`;
  }

  if (root.startsWith('workbench-') || root.startsWith('shell-react-')) {
    return `workbench/views/${root.replace(/^(workbench-|shell-react-)/, '')}.css`;
  }

  return 'workbench/views/_unmapped.css';
}

/** @param {string} blockText */
function pickTarget(blockText) {
  const roots = collectRoots(blockText);
  if (roots.length === 0) {
    return 'workbench/views/_shared.css';
  }

  for (const root of roots) {
    if (uiOverrides[root] || legacyOverrides[root]) {
      return targetForRoot(root);
    }
  }

  const workbenchUi = roots.find((r) => r.startsWith('ui-workbench-'));
  if (workbenchUi) return targetForRoot(workbenchUi);

  const legacy = roots.find((r) => r.startsWith('workbench-') || r.startsWith('shell-react-'));
  if (legacy) return targetForRoot(legacy);

  const sideBar = roots.find((r) => r.startsWith('ui-side-bar-'));
  if (sideBar) return targetForRoot(sideBar);

  return targetForRoot(roots[0]);
}

/** @param {string} relPath @param {string} chunk */
function appendChunk(files, relPath, chunk) {
  const trimmed = chunk.trim();
  if (!trimmed) return;
  if (!files.has(relPath)) files.set(relPath, []);
  files.get(relPath).push(trimmed);
}

/** @param {string} relPath @param {string[]} chunks */
function writeChunks(relPath, chunks) {
  const outPath = path.join(reactSrc, relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const body = chunks.join('\n\n').trim();
  if (fs.existsSync(outPath) && body) {
    const merged = `${fs.readFileSync(outPath, 'utf8').trim()}\n\n${body}\n`;
    fs.writeFileSync(outPath, merged, 'utf8');
    return;
  }
  if (body) {
    fs.writeFileSync(outPath, `${body}\n`, 'utf8');
  }
}

const viewsPanelPath = path.join(viewsDir, 'views-panel.css');
if (!fs.existsSync(viewsPanelPath)) {
  console.log('views-panel.css not found; nothing to split.');
  process.exit(0);
}

const blocks = extractBlocks(fs.readFileSync(viewsPanelPath, 'utf8'));
/** @type {Map<string, string[]>} */
const files = new Map();

for (const block of blocks) {
  appendChunk(files, pickTarget(block.text), block.text);
}

for (const [relPath, chunks] of files) {
  writeChunks(relPath, chunks);
}

fs.unlinkSync(viewsPanelPath);

const viewImports = fs
  .readdirSync(viewsDir)
  .filter((name) => name.endsWith('.css') && name !== 'views.css')
  .sort()
  .map((name) => `@import './${name}';`);

fs.writeFileSync(
  path.join(viewsDir, 'views.css'),
  `/* workbench/views feature styles — co-located import hub */\n${viewImports.join('\n')}\n`,
);

const layoutDir = path.join(reactSrc, 'layout');
const layoutFiles = [
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
  .filter((f) => fs.existsSync(path.join(layoutDir, f)))
  .map((f) => `@import './${f}';`);

fs.writeFileSync(
  path.join(layoutDir, 'layout.css'),
  `/* Layout feature styles — grouped by TSX owner area */\n${layoutFiles.join('\n')}\n`,
);

const workspaceDir = path.join(reactSrc, 'workbench/workspace');
const workspaceImports = fs
  .readdirSync(workspaceDir)
  .filter((name) => name.endsWith('.css') && name !== 'workspace.css')
  .sort()
  .map((name) => `@import './${name}';`);

fs.writeFileSync(
  path.join(workspaceDir, 'workspace.css'),
  `/* workbench/workspace feature styles — co-located import hub */\n${workspaceImports.join('\n')}\n`,
);

const managementDir = path.join(reactSrc, 'workbench/management');
const managementFilter = path.join(managementDir, 'management-filter-chips.css');
if (fs.existsSync(managementFilter)) {
  const managementImports = fs
    .readdirSync(managementDir)
    .filter((name) => name.endsWith('.css') && name !== 'management.css')
    .sort()
    .map((name) => `@import './${name}';`);
  fs.writeFileSync(
    path.join(managementDir, 'management.css'),
    `/* workbench/management feature styles — co-located import hub */\n${managementImports.join('\n')}\n`,
  );
}

console.log(`Split views-panel.css into ${files.size} target files.`);
