import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { WorkbenchActionList, WorkbenchActionListItem } from '../layout/WorkbenchSidebarActions';
import { WorkbenchCommandList, type WorkbenchCommandDescriptor } from './CommandPalette';
import { StatusBar, type StatusBarSectionModel } from './StatusBar';
import { getWorkbenchStatusLabel, type WorkbenchStatus } from './status';

const meta = {
  title: 'React/Workbench/Flows/StatusModel',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const statuses = [
  'idle',
  'running',
  'completed',
  'failed',
  'waiting',
  'cancelled',
  'disabled',
  'unavailable',
] satisfies WorkbenchStatus[];

const commandStatusItems: WorkbenchCommandDescriptor[] = statuses.map((status) => ({
  category: 'Status',
  description: `Command lifecycle state: ${getWorkbenchStatusLabel(status)}`,
  disabledReason: status === 'disabled' ? 'Disabled by command state' : undefined,
  icon: 'codicon-symbol-event',
  id: `status.${status}`,
  label: getWorkbenchStatusLabel(status),
  status,
}));

const statusSections: StatusBarSectionModel[] = [
  {
    id: 'status-start',
    items: statuses.slice(0, 4).map((status) => ({
      id: `status-bar.${status}`,
      label: getWorkbenchStatusLabel(status),
      status,
    })),
  },
  {
    align: 'end',
    id: 'status-end',
    items: statuses.slice(4).map((status) => ({
      id: `status-bar.${status}`,
      label: getWorkbenchStatusLabel(status),
      status,
    })),
  },
];

export const SharedStatusSurfaces: Story = {
  tags: ['storybook-play-baseline'],
  render: () => (
    <div
      style={{
        background: 'var(--color-surface)',
        display: 'grid',
        gap: 18,
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div>
          <WorkbenchActionList aria-label="Status action list">
            {statuses.map((status) => (
              <WorkbenchActionListItem
                key={status}
                description={`Action ${getWorkbenchStatusLabel(status).toLowerCase()}`}
                disabledReason={status === 'disabled' ? 'Disabled by action state' : undefined}
                icon={<i className="codicon codicon-circle-filled" />}
                label={getWorkbenchStatusLabel(status)}
                status={status}
              />
            ))}
          </WorkbenchActionList>
        </div>
        <WorkbenchCommandList
          aria-label="Status command list"
          commands={commandStatusItems}
          emptyLabel="No status commands"
        />
      </div>
      <StatusBar compact sections={statusSections} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const commandList = canvas.getByRole('listbox', { name: 'Status command list' });
    const commandListCanvas = within(commandList);

    await expect(commandList).toBeVisible();
    await expect(commandListCanvas.getByRole('option', { name: /Running/ })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(commandListCanvas.getByRole('option', { name: /Unavailable/ })).toBeDisabled();
  },
};
