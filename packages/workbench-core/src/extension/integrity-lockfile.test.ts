import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseWorkbenchExtensionsLock } from '@workbench-kit/workbench-config';

import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  SAMPLE_WORKBENCH_EXTENSIONS,
} from '../generated/bundled-extensions.js';
import {
  computeWorkbenchExtensionManifestIntegrity,
  verifyWorkbenchExtensionsAgainstLock,
} from './integrity.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const lock = parseWorkbenchExtensionsLock(
  JSON.parse(readFileSync(path.join(repoRoot, '.workbench', 'extensions.lock.json'), 'utf8')),
);

describe('bundled extensions lockfile integrity', () => {
  it('matches generated lock digests for every bundled extension', () => {
    const bundled = [...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS];
    const result = verifyWorkbenchExtensionsAgainstLock(bundled, lock, 'fail-closed');

    expect(result.diagnostics).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toHaveLength(bundled.length);

    for (const extension of bundled) {
      expect(lock.extensions[extension.manifest.id]?.integrity).toBe(
        computeWorkbenchExtensionManifestIntegrity(extension.manifest),
      );
    }
  });
});
