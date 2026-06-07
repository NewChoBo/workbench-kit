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
    items: [{ id: 'status', icon: <span className="workbench-status-dot" />, label: 'Standalone shell' }],
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
        saveFile: async () => ({ ok: true, path: '', updatedAt: '' }),
        deleteFiles: async () => undefined,
      },
      chat: {
        onChatSubmit: async () => undefined,
        onCancelChat: () => undefined,
      },
      patch: { onPatchApply: async () => ({ ok: true, appliedPaths: [] }) },
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
          <EmptyState
            title="Primary sidebar slot"
            description="Host apps supply explorer, search, or other activity views through renderPrimarySidebar."
          />
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <EmptyState
          title="Secondary area slot"
          description="Editor, chat, or settings content is rendered through renderSecondaryArea."
        />
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
