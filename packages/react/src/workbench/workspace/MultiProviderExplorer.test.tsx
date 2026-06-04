import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchMultiProviderExplorer,
  collectWorkbenchExplorerEntryRefs,
  countWorkbenchExplorerEntries,
  flattenWorkbenchExplorerProviders,
  getWorkbenchExplorerEntryContext,
  getWorkbenchExplorerEntryKey,
  getWorkbenchExplorerProviderEntryCount,
  isWorkbenchExplorerActionDisabled,
  isWorkbenchExplorerEntryDisabled,
  isWorkbenchExplorerEntrySelectable,
  isWorkbenchExplorerProviderDisabled,
  normalizeWorkbenchExplorerEntryKeys,
  type WorkbenchExplorerProviderDescriptor,
} from './MultiProviderExplorer';

const providers: WorkbenchExplorerProviderDescriptor[] = [
  {
    actions: [{ icon: 'codicon-refresh', id: 'refresh', label: 'Refresh files' }],
    entries: [
      {
        children: [
          {
            icon: 'codicon-file-code',
            id: 'app',
            kind: 'file',
            label: 'App.tsx',
            path: 'src/App.tsx',
          },
        ],
        icon: 'codicon-folder',
        id: 'src',
        kind: 'folder',
        label: 'src',
      },
    ],
    id: 'files',
    kind: 'files',
    label: 'Files',
  },
  {
    emptyLabel: 'No generated artifacts',
    entries: [],
    id: 'artifacts',
    kind: 'artifacts',
    label: 'Artifacts',
  },
];

describe('WorkbenchMultiProviderExplorer helpers', () => {
  it('creates stable entry keys and normalizes entry refs', () => {
    const fileRef = { entryId: 'src/App.tsx', providerId: 'local files' };
    const artifactRef = { entryId: 'summary', providerId: 'artifacts' };

    expect(getWorkbenchExplorerEntryKey(fileRef)).toBe('local%20files:src%2FApp.tsx');
    expect(normalizeWorkbenchExplorerEntryKeys([fileRef, artifactRef])).toEqual(
      new Set(['local%20files:src%2FApp.tsx', 'artifacts:summary']),
    );
  });

  it('counts and flattens entries without losing provider identity', () => {
    expect(countWorkbenchExplorerEntries(providers[0].entries)).toBe(2);
    expect(getWorkbenchExplorerProviderEntryCount(providers[0])).toBe(2);
    expect(collectWorkbenchExplorerEntryRefs(providers)).toEqual([
      { entryId: 'src', providerId: 'files' },
      { entryId: 'app', providerId: 'files' },
    ]);

    const collapsed = flattenWorkbenchExplorerProviders(providers);
    const expanded = flattenWorkbenchExplorerProviders(providers, [
      { entryId: 'src', providerId: 'files' },
    ]);

    expect(collapsed.map((entry) => entry.entryId)).toEqual(['src']);
    expect(expanded.map((entry) => [entry.providerId, entry.entryId, entry.depth])).toEqual([
      ['files', 'src', 0],
      ['files', 'app', 1],
    ]);
  });

  it('creates selection context with provider, active, selected, and expanded metadata', () => {
    const [srcEntry, appEntry] = flattenWorkbenchExplorerProviders(providers, [
      { entryId: 'src', providerId: 'files' },
    ]);

    expect(srcEntry.entryId).toBe('src');

    const context = getWorkbenchExplorerEntryContext({
      ...appEntry,
      activeEntry: { entryId: 'app', providerId: 'files' },
      expandedEntries: [{ entryId: 'src', providerId: 'files' }],
      selectedEntries: [{ entryId: 'app', providerId: 'files' }],
    });

    expect(context).toMatchObject({
      active: true,
      depth: 1,
      entryId: 'app',
      expanded: false,
      providerId: 'files',
      selected: true,
    });
    expect(context.parentEntryIds).toEqual(['src']);
    expect(context.provider).toBe(providers[0]);
    expect(context.entry).toBe(appEntry.entry);
  });

  it('detects disabled provider, entry, action, and selectable state', () => {
    expect(isWorkbenchExplorerProviderDisabled({ ...providers[0], status: 'unavailable' })).toBe(
      true,
    );
    expect(
      isWorkbenchExplorerEntryDisabled({ id: 'readonly', label: 'Read only', disabled: true }),
    ).toBe(true);
    expect(isWorkbenchExplorerActionDisabled({ id: 'refresh', label: 'Refresh' }, true)).toBe(true);
    expect(
      isWorkbenchExplorerEntrySelectable(providers[0].entries?.[0] ?? { id: 'x', label: 'x' }),
    ).toBe(false);
    expect(isWorkbenchExplorerEntrySelectable({ id: 'leaf', label: 'Leaf' })).toBe(true);
  });
});

describe('WorkbenchMultiProviderExplorer rendering', () => {
  it('renders provider roots, selected entries, and empty provider states', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMultiProviderExplorer
        activeEntry={{ entryId: 'app', providerId: 'files' }}
        expandedEntries={[{ entryId: 'src', providerId: 'files' }]}
        providers={providers}
        selectedEntries={[{ entryId: 'app', providerId: 'files' }]}
      />,
    );

    expect(markup).toContain('role="tree"');
    expect(markup).toContain('data-provider-id="files"');
    expect(markup).toContain('data-entry-id="app"');
    expect(markup).toContain('data-entry-path="src/App.tsx"');
    expect(markup).toContain('data-selected="true"');
    expect(markup).toContain('No generated artifacts');
  });

  it('renders disabled providers and disabled entries', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMultiProviderExplorer
        providers={[
          {
            disabled: true,
            disabledReason: 'Provider unavailable',
            entries: [
              {
                disabled: true,
                disabledReason: 'Entry unavailable',
                id: 'entry',
                label: 'entry.json',
              },
            ],
            id: 'disabled',
            label: 'Disabled Provider',
          },
        ]}
      />,
    );

    expect(markup).toContain('data-disabled="true"');
    expect(markup).toContain('Provider unavailable');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Entry unavailable');
  });
});
