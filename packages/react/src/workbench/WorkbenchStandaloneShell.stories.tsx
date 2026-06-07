import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { createCommandRegistryFromContributions } from '@workbench-kit/core';
import { integratedShellWorkspaceFiles } from '@workbench-kit/adapters';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { EmptyState } from '../primitives/EmptyState';
import { createWorkbenchShellCommands } from './commands';
import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import type { WorkbenchStandaloneBootstrap } from './standalone';
import { StatusBar, type StatusBarSectionModel } from './StatusBar';

const meta = {
  title: 'React/Workbench/Shell/Standalone',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type DemoActivityId = 'explorer' | 'search';

const demoActivities = [
  { id: 'explorer' as const, label: 'Explorer', icon: 'codicon-files' },
  { id: 'search' as const, label: 'Search', icon: 'codicon-search' },
];

const demoStatusSections: StatusBarSectionModel[] = [
  {
    id: 'main',
    items: [
      { id: 'status', icon: <span className="workbench-status-dot" />, label: 'Standalone shell' },
    ],
  },
];

function StandaloneShellPreview() {
  const bootstrap = useMemo(
    (): WorkbenchStandaloneBootstrap<DemoActivityId> => ({
      contract: {
        activities: demoActivities,
        commandRegistry: createCommandRegistryFromContributions([
          { commands: createWorkbenchShellCommands({ activities: demoActivities }) },
        ]),
        initialActivityId: 'explorer',
        initialTheme: 'dark',
        statusSections: demoStatusSections,
      },
      initialFiles: integratedShellWorkspaceFiles,
      workspace: {
        openFile: async () => undefined,
        saveFile: async () => ({
          file: { content: '', path: 'demo.ts' },
          kind: 'save:success' as const,
          outcome: 'unchanged' as const,
        }),
        deleteFiles: async () => undefined,
      },
      chat: {
        onChatSubmit: async () => undefined,
        onCancelChat: () => undefined,
      },
      patch: {
        onPatchApply: async (patch) => ({
          patch,
          type: 'patch:applied' as const,
        }),
      },
      save: {},
      status: {},
    }),
    [],
  );

  return (
    <WorkbenchStandaloneShell<DemoActivityId>
      bootstrap={bootstrap}
      renderPrimarySidebar={() => (
        <SideBarViewFrame title="Explorer">
          <EmptyState icon="codicon-layout-sidebar-left">
            Primary sidebar slot — host apps supply explorer, search, or other activity views.
          </EmptyState>
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <EmptyState icon="codicon-edit">
          Secondary area slot — editor, chat, or settings content is rendered here.
        </EmptyState>
      )}
    />
  );
}

export const Default: Story = {
  render: () => <StandaloneShellPreview />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByText('Primary sidebar slot')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toHaveTextContent('Standalone shell');
  },
};

export const StatusFooterOnly: Story = {
  render: () => (
    <div style={{ width: '100%', background: 'var(--color-bg)' }}>
      <StatusBar compact sections={demoStatusSections} />
    </div>
  ),
};
