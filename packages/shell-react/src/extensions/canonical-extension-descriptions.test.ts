import { describe, expect, it } from 'vitest';
import type { WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';

import { createCanonicalExtensionDescriptionSnapshot } from './canonical-extension-descriptions.js';

describe('createCanonicalExtensionDescriptionSnapshot', () => {
  it('de-duplicates equivalent available and live descriptions', () => {
    const available = extensionDescription('workbench-kit.test.target');
    const equivalentLive = { ...available, manifest: { ...available.manifest } };
    const snapshot = createCanonicalExtensionDescriptionSnapshot({
      availableExtensions: [available, { ...available }],
      liveExtensions: [equivalentLive],
    });

    expect(snapshot.descriptions).toEqual([available]);
    expect(snapshot.ambiguousExtensionIds).toEqual([]);
    expect(snapshot.getDescription(available.manifest.id)).toBe(available);
  });

  it('retains one display row but fails closed for conflicting descriptions', () => {
    const available = extensionDescription('workbench-kit.test.target');
    const conflictingLive = {
      ...available,
      manifest: { ...available.manifest, displayName: 'Conflicting Target' },
    };
    const snapshot = createCanonicalExtensionDescriptionSnapshot({
      availableExtensions: [available],
      liveExtensions: [conflictingLive],
    });

    expect(snapshot.descriptions).toEqual([available]);
    expect(snapshot.ambiguousExtensionIds).toEqual([available.manifest.id]);
    expect(snapshot.getDescription(available.manifest.id)).toBeUndefined();
  });
});

function extensionDescription(id: string): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: [],
      displayName: id,
      engines: { extensionApi: '^0.0.0', workbench: '^0.0.0' },
      id,
      name: id.split('.').pop() ?? id,
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
  };
}
