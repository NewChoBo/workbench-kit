import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatManifestViolations,
  readWorkbenchExtensionManifestEntries,
  validateWorkbenchExtensionManifests,
} from './workbench-extension-manifest-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = await readWorkbenchExtensionManifestEntries(repoRoot);
const violations = validateWorkbenchExtensionManifests(entries, repoRoot);

if (violations.length > 0) {
  console.error('Workbench extension manifest check failed.');
  console.error(formatManifestViolations(violations));
  process.exit(1);
}

console.log(`Workbench extension manifest check passed (${entries.length} extensions).`);
