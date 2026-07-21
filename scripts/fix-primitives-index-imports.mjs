import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(repoRoot, 'packages/react/src/index.ts');
let content = fs.readFileSync(indexPath, 'utf8');

const modules = [
  'AbsoluteBox',
  'Badge',
  'Button',
  'Checkbox',
  'EmptyState',
  'PanelLoading',
  'Field',
  'IconButton',
  'List',
  'NumberInput',
  'StatusBar',
  'WorkbenchChrome',
  'WorkbenchEditor',
  'CatalogBrowseCard',
  'RecordMediaHero',
  'LibraryDetailLayout',
  'WorkbenchMediaSlot',
  'WorkbenchThumbnail',
  'Select',
  'ScrollArea',
  'TextInput',
  'TextArea',
  'Toolbar',
];

for (const name of modules) {
  content = content.replaceAll(`from './primitives/${name}'`, "from './primitives'");
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Updated packages/react/src/index.ts primitive imports.');
