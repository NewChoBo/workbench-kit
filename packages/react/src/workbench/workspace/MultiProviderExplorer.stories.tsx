import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import {
  WorkbenchMultiProviderExplorer,
  type WorkbenchExplorerEntryRef,
  type WorkbenchExplorerProviderDescriptor,
} from './MultiProviderExplorer';

const meta = {
  title: 'React/Workbench/Workspace/MultiProviderExplorer',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const providers: WorkbenchExplorerProviderDescriptor[] = [
  {
    actions: [
      {
        icon: 'codicon-new-file',
        id: 'new-file',
        label: 'New workspace entry',
      },
    ],
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
          {
            icon: 'codicon-file-code',
            id: 'button',
            kind: 'file',
            label: 'Button.tsx',
            path: 'src/components/Button.tsx',
          },
        ],
        icon: 'codicon-folder',
        id: 'src',
        kind: 'folder',
        label: 'src',
        path: 'src',
      },
      {
        icon: 'codicon-book',
        id: 'readme',
        kind: 'file',
        label: 'README.md',
        path: 'README.md',
      },
    ],
    icon: 'codicon-files',
    id: 'files',
    kind: 'files',
    label: 'Files',
  },
  {
    actions: [
      {
        icon: 'codicon-refresh',
        id: 'refresh',
        label: 'Refresh artifacts',
      },
    ],
    description: 'Generated outputs remain separate from source files.',
    entries: [
      {
        description: 'Markdown artifact',
        icon: 'codicon-markdown',
        id: 'summary',
        kind: 'artifact',
        label: 'summary.md',
        path: 'artifacts/summary.md',
        status: 'completed',
      },
      {
        description: 'Diagram preview',
        icon: 'codicon-type-hierarchy',
        id: 'workflow',
        kind: 'artifact',
        label: 'workflow.svg',
        path: 'artifacts/workflow.svg',
        status: 'waiting',
      },
    ],
    icon: 'codicon-output',
    id: 'artifacts',
    kind: 'artifacts',
    label: 'Generated Artifacts',
  },
  {
    entries: [
      {
        children: [
          {
            description: 'Last selected surface',
            icon: 'codicon-window',
            id: 'active-view',
            kind: 'state',
            label: 'Active view',
          },
          {
            description: 'Unavailable while read-only mode is active',
            disabled: true,
            disabledReason: 'This entry is read-only.',
            icon: 'codicon-lock',
            id: 'readonly-state',
            kind: 'state',
            label: 'Read-only state',
            status: 'unavailable',
          },
        ],
        icon: 'codicon-symbol-variable',
        id: 'state',
        kind: 'state',
        label: 'State',
      },
      {
        icon: 'codicon-settings-gear',
        id: 'config',
        kind: 'config',
        label: 'Configuration',
      },
    ],
    icon: 'codicon-settings',
    id: 'state-config',
    kind: 'config',
    label: 'State & Config',
  },
  {
    actions: [
      {
        icon: 'codicon-refresh',
        id: 'refresh',
        label: 'Refresh session artifacts',
      },
    ],
    emptyLabel: 'No session artifacts',
    entries: [],
    icon: 'codicon-history',
    id: 'session',
    kind: 'session',
    label: 'Session Artifacts',
  },
];

function MultiProviderHarness({
  frameTitle = 'Explorer',
  initialExpandedEntries = [
    { entryId: 'src', providerId: 'files' },
    { entryId: 'state', providerId: 'state-config' },
  ],
  providerItems = providers,
}: {
  frameTitle?: string;
  initialExpandedEntries?: WorkbenchExplorerEntryRef[];
  providerItems?: WorkbenchExplorerProviderDescriptor[];
}) {
  const [expandedEntries, setExpandedEntries] = useState(initialExpandedEntries);
  const [selectedEntries, setSelectedEntries] = useState<WorkbenchExplorerEntryRef[]>([
    { entryId: 'app', providerId: 'files' },
  ]);
  const [activeEntry, setActiveEntry] = useState<WorkbenchExplorerEntryRef>({
    entryId: 'app',
    providerId: 'files',
  });
  const [eventLog, setEventLog] = useState('Ready');
  const visibleProviders = useMemo(() => providerItems, [providerItems]);

  return (
    <div className="workspace-explorer-story">
      <SideBarViewFrame
        footer={
          <div aria-label="Multi-provider explorer event log" role="status">
            {eventLog}
          </div>
        }
        style={{ height: 'min(calc(100% - 120px), 620px)', width: 'min(100%, 420px)' }}
        title={frameTitle}
      >
        <WorkbenchMultiProviderExplorer
          activeEntry={activeEntry}
          expandedEntries={expandedEntries}
          providers={visibleProviders}
          selectedEntries={selectedEntries}
          onEntrySelect={(entry, context) => {
            const nextEntry = { entryId: context.entryId, providerId: context.providerId };
            setActiveEntry(nextEntry);
            setSelectedEntries([nextEntry]);
            setEventLog(`Selected ${context.providerId}:${entry.path ?? context.entryId}`);
          }}
          onEntryToggle={(_entry, context) => {
            setEventLog(
              `${context.nextExpanded ? 'Expanded' : 'Collapsed'} ${context.providerId}:${context.entryId}`,
            );
          }}
          onExpandedEntriesChange={setExpandedEntries}
          onProviderAction={(action, context) => {
            setEventLog(`Provider action ${context.providerId}:${action.id}`);
          }}
        />
      </SideBarViewFrame>
    </div>
  );
}

export const MultipleProviders: Story = {
  render: () => <MultiProviderHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Multi-provider explorer event log');

    await expect(canvas.getByText('No session artifacts')).toBeVisible();
    await expect(canvas.getByRole('treeitem', { name: /Read-only state/ })).toBeDisabled();

    await userEvent.click(canvas.getByRole('treeitem', { name: /summary.md/ }));
    await expect(eventLog).toHaveTextContent('Selected artifacts:artifacts/summary.md');
    await expect(canvas.getByRole('treeitem', { name: /summary.md/ })).toHaveAttribute(
      'data-selected',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Refresh artifacts' }));
    await expect(eventLog).toHaveTextContent('Provider action artifacts:refresh');

    await userEvent.click(canvas.getByRole('treeitem', { name: /src/ }));
    await expect(eventLog).toHaveTextContent('Collapsed files:src');
    await expect(canvas.queryByRole('treeitem', { name: /App.tsx/ })).toBeNull();
  },
  tags: ['storybook-play-baseline'],
};

export const EmptyExplorer: Story = {
  render: () => <MultiProviderHarness frameTitle="Empty Explorer" providerItems={[]} />,
};

export const DisabledProvider: Story = {
  render: () => (
    <MultiProviderHarness
      frameTitle="Disabled Provider"
      providerItems={[
        {
          actions: [
            {
              icon: 'codicon-refresh',
              id: 'refresh',
              label: 'Refresh unavailable provider',
            },
          ],
          disabled: true,
          disabledReason: 'Provider is not available.',
          entries: [
            {
              icon: 'codicon-file',
              id: 'offline-entry',
              label: 'offline-entry.json',
              path: 'offline-entry.json',
            },
          ],
          icon: 'codicon-plug',
          id: 'offline',
          kind: 'virtual',
          label: 'Unavailable Provider',
        },
      ]}
    />
  ),
};

export const ProviderActions: Story = {
  render: () => (
    <MultiProviderHarness
      frameTitle="Provider Actions"
      providerItems={providers.map((provider) =>
        provider.id === 'artifacts'
          ? {
              ...provider,
              actions: [
                ...(provider.actions ?? []),
                {
                  danger: true,
                  icon: 'codicon-trash',
                  id: 'clear',
                  label: 'Clear artifacts',
                },
              ],
            }
          : provider,
      )}
    />
  ),
};
