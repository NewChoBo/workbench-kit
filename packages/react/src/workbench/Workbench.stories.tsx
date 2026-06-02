import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../primitives/Badge';
import { EmptyState } from '../primitives/EmptyState';
import { ActivityBar } from './ActivityBar';
import { SplitView } from './SplitView';

const meta = {
  title: 'React/Workbench',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const activityItems = [
  {
    id: 'components',
    label: 'Components',
    icon: <i className="codicon codicon-symbol-misc" />,
    active: true,
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: <i className="codicon codicon-layout" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <i className="codicon codicon-settings-gear" />,
  },
];

export const ActivityRail: Story = {
  render: () => (
    <div style={{ height: 360, background: 'var(--color-bg)' }}>
      <ActivityBar
        items={activityItems}
        secondaryItems={[
          {
            id: 'theme',
            label: 'Theme',
            icon: <i className="codicon codicon-color-mode" />,
          },
        ]}
      />
    </div>
  ),
};

export const SplitWorkspace: Story = {
  render: () => (
    <div style={{ width: '100%', height: 420, background: 'var(--color-bg)' }}>
      <SplitView
        defaultPrimarySizePercent={62}
        primary={
          <section style={{ padding: 20, color: 'var(--color-text)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Primary pane</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)' }}>
              SplitView keeps resizable workbench panes stable.
            </p>
            <Badge>active</Badge>
          </section>
        }
        secondary={
          <section style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <EmptyState compact icon="codicon-layout-sidebar-right">
              Secondary pane
            </EmptyState>
          </section>
        }
      />
    </div>
  ),
};
