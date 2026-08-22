import { describe, expect, it } from 'vitest';
import type {
  WorkbenchProjectionSnapshot,
  WorkbenchReadOnlyProjectionDescriptor,
} from './projection';

interface PublishedInterfaceItem {
  readonly id: string;
  readonly permissions: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly optionalCapabilities: readonly string[];
  readonly version: number;
  readonly compatibility: readonly string[];
}

interface CanonicalFixture {
  readonly revision: string;
  readonly internalTopology: readonly { readonly id: string; readonly connectsTo: string }[];
  readonly publication: readonly PublishedInterfaceItem[];
}

function projectPublishedInterface(
  canonical: CanonicalFixture,
  locallyVisibleIds?: ReadonlySet<string>,
): WorkbenchProjectionSnapshot<readonly PublishedInterfaceItem[]> {
  const descriptor = {
    id: 'published-interface',
    documentKind: 'sample-workflow',
    projectionVersion: 1,
    kind: 'END_USER_PRESENTATION',
    authority: 'DERIVED_READ_ONLY',
  } as const satisfies WorkbenchReadOnlyProjectionDescriptor;
  const publication = locallyVisibleIds
    ? canonical.publication.filter((item) => locallyVisibleIds.has(item.id))
    : canonical.publication;
  return {
    descriptor,
    canonicalRevision: canonical.revision,
    value: publication,
  };
}

describe('published interface projection fixture', () => {
  it('omits topology while preserving portable interface metadata', () => {
    const canonical: CanonicalFixture = {
      revision: 'revision:7',
      internalTopology: [
        { id: 'private-source', connectsTo: 'private-transform' },
        { id: 'private-transform', connectsTo: 'public-command' },
      ],
      publication: [
        {
          id: 'public-command',
          permissions: ['documents:read'],
          requiredCapabilities: ['document-source'],
          optionalCapabilities: ['telemetry'],
          version: 2,
          compatibility: ['^2.0.0'],
        },
      ],
    };

    const snapshot = projectPublishedInterface(canonical);
    expect(snapshot).toEqual({
      descriptor: {
        id: 'published-interface',
        documentKind: 'sample-workflow',
        projectionVersion: 1,
        kind: 'END_USER_PRESENTATION',
        authority: 'DERIVED_READ_ONLY',
      },
      canonicalRevision: 'revision:7',
      value: canonical.publication,
    });
    expect(JSON.stringify(snapshot)).not.toContain('private-source');
    expect(JSON.stringify(snapshot)).not.toContain('private-transform');
  });

  it('allows local filtering to narrow but never expand the publication set', () => {
    const canonical: CanonicalFixture = {
      revision: 'revision:8',
      internalTopology: [],
      publication: [
        {
          id: 'public-a',
          permissions: [],
          requiredCapabilities: [],
          optionalCapabilities: [],
          version: 1,
          compatibility: ['1.x'],
        },
        {
          id: 'public-b',
          permissions: ['network:read'],
          requiredCapabilities: ['catalog'],
          optionalCapabilities: [],
          version: 3,
          compatibility: ['>=3'],
        },
      ],
    };

    expect(
      projectPublishedInterface(canonical, new Set(['public-b', 'private-extra'])).value.map(
        (item) => item.id,
      ),
    ).toEqual(['public-b']);
  });
});
