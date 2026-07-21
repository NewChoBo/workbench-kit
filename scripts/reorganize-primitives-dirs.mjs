/**
 * Move flat primitives/ TSX+CSS into component folders (select/ pattern).
 * Run from repo root: node scripts/reorganize-primitives-dirs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const primitivesRoot = path.join(repoRoot, 'packages/react/src/primitives');

/** @type {Record<string, string[]>} */
const COMPONENT_DIRS = {
  'absolute-box': ['AbsoluteBox.tsx'],
  badge: ['Badge.tsx', 'badge.css'],
  button: ['Button.tsx', 'button.css'],
  'catalog-browse-card': ['CatalogBrowseCard.tsx', 'catalog-browse-card.css'],
  checkbox: ['Checkbox.tsx', 'checkbox.css'],
  'clearable-text-input': [
    'ClearableTextInput.tsx',
    'ClearableTextInput.test.tsx',
    'clearable-text-input.css',
  ],
  codicon: ['Codicon.tsx'],
  'empty-state': ['EmptyState.tsx', 'empty-state.css'],
  'external-link-button': ['ExternalLinkButton.tsx'],
  'file-icon': ['FileIcon.tsx'],
  field: ['Field.tsx', 'field.css'],
  'icon-button': ['IconButton.tsx', 'icon-button.css'],
  'library-detail-layout': [
    'LibraryDetailLayout.tsx',
    'LibraryDetailLayout.stories.tsx',
    'library-detail-layout.css',
  ],
  list: ['List.tsx', 'list.css', 'list-item.css', 'list-empty-state.css'],
  'number-input': ['NumberInput.tsx'],
  'panel-loading': ['PanelLoading.tsx', 'PanelLoading.test.tsx', 'panel-loading.css'],
  'panel-surface': ['panel-surface.css'],
  'record-media-hero': [
    'RecordMediaHero.tsx',
    'RecordMediaHero.stories.tsx',
    'record-media-hero.css',
  ],
  'scroll-area': ['ScrollArea.tsx', 'ScrollArea.test.tsx'],
  'scroll-area-infinite-load': [
    'ScrollAreaInfiniteSentinel.tsx',
    'ScrollAreaInfiniteSentinel.test.tsx',
    'ScrollAreaInfiniteLoad.stories.tsx',
    'useScrollAreaInfiniteLoad.ts',
    'useScrollAreaInfiniteLoad.test.tsx',
    'scroll-area-infinite-sentinel.css',
  ],
  'status-bar': ['StatusBar.tsx', 'status-bar.css'],
  'text-area': ['TextArea.tsx'],
  'text-input': ['TextInput.tsx', 'input.css'],
  toolbar: ['Toolbar.tsx'],
  'visually-hidden': ['visually-hidden.css'],
  'workbench-chrome': [
    'WorkbenchChrome.tsx',
    'activity-bar.css',
    'collapsible.css',
    'side-bar-view.css',
    'sidebar.css',
    'tabbed-panels.css',
    'EditorChrome.stories.tsx',
  ],
  'workbench-editor': [
    'WorkbenchEditor.tsx',
    'button-group.css',
    'editor-tabs.css',
    'resizable-panels.css',
    'segmented-control.css',
  ],
  'workbench-media-slot': ['WorkbenchMediaSlot.tsx', 'media-slot.css'],
  'workbench-thumbnail': ['WorkbenchThumbnail.tsx', 'thumbnail.css'],
  stories: ['Controls.stories.tsx'],
};

/** PascalCase module stem → folder slug */
const MODULE_TO_DIR = {
  AbsoluteBox: 'absolute-box',
  Badge: 'badge',
  Button: 'button',
  CatalogBrowseCard: 'catalog-browse-card',
  Checkbox: 'checkbox',
  ClearableTextInput: 'clearable-text-input',
  Codicon: 'codicon',
  EmptyState: 'empty-state',
  ExternalLinkButton: 'external-link-button',
  Field: 'field',
  FileIcon: 'file-icon',
  IconButton: 'icon-button',
  LibraryDetailLayout: 'library-detail-layout',
  List: 'list',
  NumberInput: 'number-input',
  PanelLoading: 'panel-loading',
  RecordMediaHero: 'record-media-hero',
  ScrollArea: 'scroll-area',
  ScrollAreaInfiniteSentinel: 'scroll-area-infinite-load',
  Select: 'select',
  StatusBar: 'status-bar',
  TextArea: 'text-area',
  TextInput: 'text-input',
  Toolbar: 'toolbar',
  WorkbenchChrome: 'workbench-chrome',
  WorkbenchEditor: 'workbench-editor',
  WorkbenchMediaSlot: 'workbench-media-slot',
  WorkbenchThumbnail: 'workbench-thumbnail',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`skip missing: ${path.relative(repoRoot, from)}`);
    return;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
}

function componentExportName(fileName) {
  return fileName.replace(/\.(tsx|ts)$/, '');
}

function writeFolderIndex(dirPath, tsFiles) {
  const exports = tsFiles
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .filter((f) => !f.includes('.test.') && !f.includes('.stories.'))
    .map((f) => {
      const stem = componentExportName(f);
      return `export * from './${stem}';`;
    });
  if (exports.length === 0) return;
  fs.writeFileSync(path.join(dirPath, 'index.ts'), `${exports.join('\n')}\n`, 'utf8');
}

function fixMovedSource(content, folderSlug) {
  let next = content;
  next = next.replace(/from ['"](\.\.\/)+utils\//g, (match) => {
    const ups = (match.match(/\.\.\//g) ?? []).length;
    return `from '${'../'.repeat(ups + 1)}utils/`;
  });
  next = next.replace(/from ['"](\.\.\/)+icons\//g, (match) => {
    const ups = (match.match(/\.\.\//g) ?? []).length;
    return `from '${'../'.repeat(ups + 1)}icons/`;
  });
  for (const [moduleName, dir] of Object.entries(MODULE_TO_DIR)) {
    if (dir === folderSlug) continue;
    next = next.replaceAll(`from './${moduleName}'`, `from '../${dir}'`);
    next = next.replaceAll(`from './${moduleName}.js'`, `from '../${dir}'`);
    next = next.replaceAll(`from "./${moduleName}"`, `from '../${dir}'`);
    next = next.replaceAll(`from "./${moduleName}.js"`, `from '../${dir}'`);
  }
  if (folderSlug === 'text-area' || folderSlug === 'number-input') {
    next = next.replaceAll(`from './TextInput'`, `from '../text-input'`);
    next = next.replaceAll(`from './TextInput.js'`, `from '../text-input'`);
  }
  if (folderSlug === 'clearable-text-input') {
    next = next.replaceAll(`from './IconButton'`, `from '../icon-button'`);
    next = next.replaceAll(`from './TextInput'`, `from '../text-input'`);
  }
  if (folderSlug === 'library-detail-layout' || folderSlug === 'catalog-browse-card') {
    next = next.replaceAll(`from './WorkbenchMediaSlot'`, `from '../workbench-media-slot'`);
    next = next.replaceAll(`from './RecordMediaHero'`, `from '../record-media-hero'`);
  }
  if (folderSlug === 'workbench-thumbnail') {
    next = next.replaceAll(`from './WorkbenchMediaSlot'`, `from '../workbench-media-slot'`);
  }
  if (folderSlug === 'workbench-editor') {
    next = next.replaceAll(`from './FileIcon'`, `from '../file-icon'`);
    next = next.replaceAll(`from './IconButton'`, `from '../icon-button'`);
  }
  if (folderSlug === 'list') {
    next = next.replaceAll(`from './IconButton'`, `from '../icon-button'`);
  }
  if (folderSlug === 'text-area') {
    if (!next.includes("import '../text-input/input.css'")) {
      next = next.replace(/import '\.\/input\.css';\n/, "import '../text-input/input.css';\n");
    }
  }
  return next;
}

function regeneratePrimitivesCss() {
  const hubLines = [
    '/* Primitives component styles — co-located per component folder.',
    ' * Leaf files are imported from owning TSX for HMR; this hub keeps CSS-only bundles working. */',
  ];
  const cssImports = [];
  for (const [dir, files] of Object.entries(COMPONENT_DIRS)) {
    for (const file of files) {
      if (!file.endsWith('.css')) continue;
      cssImports.push(`@import './${dir}/${file}';`);
    }
  }
  cssImports.push("@import './select/select.css';");
  cssImports.push("@import './select/select.app.css';");
  cssImports.sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(
    path.join(primitivesRoot, 'primitives.css'),
    `${hubLines.join('\n')}\n${cssImports.join('\n')}\n`,
    'utf8',
  );
}

function regeneratePrimitivesIndex() {
  const lines = [
    "export { AbsoluteBox } from './absolute-box/AbsoluteBox';",
    "export type { AbsoluteBoxProps, WorkbenchRect } from './absolute-box/AbsoluteBox';",
    "export { Badge } from './badge/Badge';",
    "export type { BadgeProps } from './badge/Badge';",
    "export { Button } from './button/Button';",
    "export type { ButtonProps } from './button/Button';",
    "export { Checkbox } from './checkbox/Checkbox';",
    "export type { CheckboxProps } from './checkbox/Checkbox';",
    "export { EmptyState } from './empty-state/EmptyState';",
    "export type { EmptyStateProps } from './empty-state/EmptyState';",
    "export { PanelLoading } from './panel-loading/PanelLoading';",
    "export type { PanelLoadingProps } from './panel-loading/PanelLoading';",
    "export { Field } from './field/Field';",
    "export type { FieldProps } from './field/Field';",
    "export { Codicon } from './codicon/Codicon';",
    "export type { CodiconProps } from './codicon/Codicon';",
    "export { IconButton } from './icon-button/IconButton';",
    "export type { IconButtonProps } from './icon-button/IconButton';",
    "export { List, ListEmptyState, ListItem, ListItemActionButton } from './list/List';",
    'export type {',
    '  ListEmptyStateProps,',
    '  ListItemActionButtonProps,',
    '  ListItemProps,',
    '  ListProps,',
    "} from './list/List';",
    "export { NumberInput } from './number-input/NumberInput';",
    "export type { NumberInputProps } from './number-input/NumberInput';",
    "export { Select } from './select';",
    "export type { SelectProps } from './select';",
    "export { ScrollArea } from './scroll-area/ScrollArea';",
    'export type {',
    '  ScrollAreaGutter,',
    '  ScrollAreaOrientation,',
    '  ScrollAreaProps,',
    '  ScrollAreaScrollbarVisibility,',
    "} from './scroll-area/ScrollArea';",
    "export { StatusBar, StatusBarLabel, StatusBarSection } from './status-bar/StatusBar';",
    'export type {',
    '  StatusBarLabelProps,',
    '  StatusBarProps,',
    '  StatusBarSectionAlign,',
    '  StatusBarSectionProps,',
    '  StatusBarSeverity,',
    "} from './status-bar/StatusBar';",
    "export { ClearableTextInput } from './clearable-text-input/ClearableTextInput';",
    "export type { ClearableTextInputProps } from './clearable-text-input/ClearableTextInput';",
    "export { ExternalLinkButton, ExternalLinkRow } from './external-link-button/ExternalLinkButton';",
    "export { TextInput } from './text-input/TextInput';",
    "export type { ControlWidth, TextInputProps } from './text-input/TextInput';",
    "export { TextArea } from './text-area/TextArea';",
    "export type { TextAreaProps } from './text-area/TextArea';",
    "export { Toolbar } from './toolbar/Toolbar';",
    "export type { ToolbarProps } from './toolbar/Toolbar';",
    "export { ViewEmptyState } from '../layout/ViewEmptyState';",
    "export type { ViewEmptyStateProps } from '../layout/ViewEmptyState';",
    "export { SidebarToolbar } from '../layout/SidebarToolbar';",
    "export type { SidebarToolbarProps } from '../layout/SidebarToolbar';",
    "export { ActivityBar, Collapsible, SideBar, TabbedPanels, WorkbenchShell } from './workbench-chrome/WorkbenchChrome';",
    'export type {',
    '  ActivityBarProps,',
    '  ActivityItem,',
    '  CollapsibleProps,',
    '  SideBarProps,',
    '  TabbedPanelItem,',
    '  TabbedPanelsProps,',
    '  WorkbenchShellProps,',
    "} from './workbench-chrome/WorkbenchChrome';",
    "export { FileIcon, UI_FILE_ICON_CLASS } from './file-icon/FileIcon';",
    "export type { FileIconProps } from './file-icon/FileIcon';",
    "export { CatalogBrowseCard } from './catalog-browse-card/CatalogBrowseCard';",
    "export type { CatalogBrowseCardProps, CatalogBrowseCardVariant } from './catalog-browse-card/CatalogBrowseCard';",
    "export { RecordMediaHero } from './record-media-hero/RecordMediaHero';",
    "export type { RecordMediaHeroLayout, RecordMediaHeroProps } from './record-media-hero/RecordMediaHero';",
    "export { LibraryDetailLayout } from './library-detail-layout/LibraryDetailLayout';",
    "export type { LibraryDetailLayoutMode, LibraryDetailLayoutProps } from './library-detail-layout/LibraryDetailLayout';",
    "export { ScrollAreaInfiniteSentinel } from './scroll-area-infinite-load/ScrollAreaInfiniteSentinel';",
    "export type { ScrollAreaInfiniteSentinelProps } from './scroll-area-infinite-load/ScrollAreaInfiniteSentinel';",
    "export { useScrollAreaInfiniteLoad } from './scroll-area-infinite-load/useScrollAreaInfiniteLoad';",
    'export type {',
    '  UseScrollAreaInfiniteLoadOptions,',
    '  UseScrollAreaInfiniteLoadResult,',
    "} from './scroll-area-infinite-load/useScrollAreaInfiniteLoad';",
    "export { WorkbenchMediaSlot } from './workbench-media-slot/WorkbenchMediaSlot';",
    "export type { WorkbenchMediaSlotProps } from './workbench-media-slot/WorkbenchMediaSlot';",
    "export { WorkbenchThumbnail } from './workbench-thumbnail/WorkbenchThumbnail';",
    "export type { WorkbenchThumbnailProps, WorkbenchThumbnailSize } from './workbench-thumbnail/WorkbenchThumbnail';",
    "export { ButtonGroup, EditorTabs, ResizablePanels, SegmentedControl } from './workbench-editor/WorkbenchEditor';",
    'export type {',
    '  ButtonGroupProps,',
    '  EditorTab,',
    '  EditorTabDropPosition,',
    '  EditorTabsProps,',
    '  ResizablePanelsProps,',
    '  SegmentedControlOption,',
    '  SegmentedControlProps,',
    "} from './workbench-editor/WorkbenchEditor';",
    'export {',
    '  FilterBar,',
    '  FilterBarActiveChips,',
    '  FilterBarRow,',
    '  FilterChip,',
    '  HelpText,',
    '  Panel,',
    '  PanelBody,',
    '  PanelFooter,',
    '  PanelHeader,',
    "} from '../layout/Panel';",
    'export type {',
    '  FilterBarActiveChipsProps,',
    '  FilterBarProps,',
    '  FilterBarRowProps,',
    '  FilterChipProps,',
    '  HelpTextProps,',
    '  PanelBodyProps,',
    '  PanelFooterProps,',
    '  PanelHeaderProps,',
    '  PanelProps,',
    "} from '../layout/Panel';",
    'export {',
    '  WorkbenchBanner,',
    '  WorkbenchBannerIcon,',
    '  WorkbenchBannerMessage,',
    '  WorkbenchCenter,',
    '  WorkbenchPane,',
    '  WorkbenchPanelScroll,',
    '  WorkbenchPanelSurface,',
    '  WorkbenchRoot,',
    "} from '../layout/WorkbenchLayoutBase';",
    'export type {',
    '  WorkbenchBannerIconProps,',
    '  WorkbenchBannerMessageProps,',
    '  WorkbenchBannerProps,',
    '  WorkbenchCenterProps,',
    '  WorkbenchPaneProps,',
    '  WorkbenchPanelScrollProps,',
    '  WorkbenchPanelSurfaceProps,',
    '  WorkbenchRootProps,',
    "} from '../layout/WorkbenchLayoutBase';",
    'export {',
    '  WorkbenchParseError,',
    '  WorkbenchPropertyCard,',
    '  WorkbenchPropertyGrid,',
    '  WorkbenchPropertyHint,',
    '  WorkbenchPropertyKeyValue,',
    '  WorkbenchMetricGrid,',
    '  WorkbenchPropertyNumberRow,',
    '  WorkbenchPropertyPanel,',
    '  WorkbenchPropertyRow,',
    '  WorkbenchPropertySection,',
    '  WorkbenchPropertyStack,',
    '  WorkbenchPropertyTextRow,',
    "} from '../layout/WorkbenchPropertyPanel';",
    'export type {',
    '  WorkbenchParseErrorProps,',
    '  WorkbenchPropertyCardProps,',
    '  WorkbenchPropertyGridProps,',
    '  WorkbenchPropertyKeyValueProps,',
    '  WorkbenchPropertyNumberRowProps,',
    '  WorkbenchPropertyPanelProps,',
    '  WorkbenchPropertyRowProps,',
    '  WorkbenchMetricGridEntry,',
    '  WorkbenchMetricGridItem,',
    '  WorkbenchMetricGridProps,',
    '  WorkbenchPropertySectionProps,',
    '  WorkbenchPropertyStackProps,',
    '  WorkbenchPropertyTextRowProps,',
    "} from '../layout/WorkbenchPropertyPanel';",
    '',
  ];
  fs.writeFileSync(path.join(primitivesRoot, 'index.ts'), lines.join('\n'), 'utf8');
}

function rewritePackageImports() {
  const srcRoot = path.join(repoRoot, 'packages/react/src');
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(srcRoot);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [moduleName, dir] of Object.entries(MODULE_TO_DIR)) {
      const patterns = [
        new RegExp(`(from ['"])(\\.\\./)+primitives/${moduleName}(\\.js)?(['"])`, 'g'),
        new RegExp(`(from ['"])(\\.\\./)+primitives/${moduleName}/index(\\.js)?(['"])`, 'g'),
      ];
      for (const re of patterns) {
        const replaced = content.replace(re, (_m, p1, ups, _ext, p4) => {
          const prefix = `${p1}${ups ?? ''}primitives/${dir}${p4}`;
          return prefix;
        });
        if (replaced !== content) {
          content = replaced;
          changed = true;
        }
      }
    }
    content = content.replace(/from ['"](\.\.\/)+primitives\/panel-surface\.css['"];/g, (match) =>
      match.replace('panel-surface.css', 'panel-surface/panel-surface.css'),
    );
    if (content.includes('panel-surface/panel-surface.css')) changed = true;

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
    }
  }
}

function updatePrimitivesStylesCss() {
  const stylesPath = path.join(primitivesRoot, 'styles.css');
  let content = fs.readFileSync(stylesPath, 'utf8');
  content = content.replace(
    /@import '\.\/panel-surface\.css';/,
    "@import './panel-surface/panel-surface.css';",
  );
  fs.writeFileSync(stylesPath, content, 'utf8');
}

// --- run ---
for (const [dir, files] of Object.entries(COMPONENT_DIRS)) {
  const dirPath = path.join(primitivesRoot, dir);
  ensureDir(dirPath);
  const tsFiles = [];
  for (const file of files) {
    const from = path.join(primitivesRoot, file);
    const to = path.join(dirPath, file);
    moveFile(from, to);
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      tsFiles.push(file);
      const fixed = fixMovedSource(fs.readFileSync(to, 'utf8'), dir);
      fs.writeFileSync(to, fixed, 'utf8');
    }
  }
  writeFolderIndex(dirPath, tsFiles);
}

// Remove flat Select shim if still at root
const selectShim = path.join(primitivesRoot, 'Select.tsx');
if (fs.existsSync(selectShim)) {
  fs.unlinkSync(selectShim);
}

regeneratePrimitivesCss();
regeneratePrimitivesIndex();
updatePrimitivesStylesCss();
rewritePackageImports();

console.log('Reorganized primitives into component folders.');
