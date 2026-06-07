import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { EmptyState } from '../primitives/EmptyState';
import { ActivityBar } from './ActivityBar';
import { SplitView } from './SplitView';

const meta = {
  title: 'React/Workbench/Layout Primitives',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActivityBarStandalone: Story = {
  render: () => (
    <div style={{ height: 'min(calc(100% - 120px), 500px)', background: 'var(--color-bg)' }}>
      <ActivityBar
        items={[
          {
            id: 'explorer',
            label: 'Explorer',
            icon: <i className="codicon codicon-files" />,
            active: true,
          },
          {
            id: 'search',
            label: 'Search',
            icon: <i className="codicon codicon-search" />,
          },
        ]}
        secondaryItems={[
          {
            id: 'settings',
            label: 'Settings',
            icon: <i className="codicon codicon-settings-gear" />,
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

export const SplitViewStandalone: Story = {
  render: () => {
    const [primarySizePercent, setPrimarySizePercent] = useState(32);

    return (
      <div style={{ height: 420, background: 'var(--color-bg)' }}>
        <SplitView
          primarySizePercent={primarySizePercent}
          onPrimarySizePercentChange={setPrimarySizePercent}
          primary={
            <SideBarViewFrame title="Primary">
              <EmptyState icon="codicon-layout-sidebar-left">
                Sidebar — resize with the sash or keyboard.
              </EmptyState>
            </SideBarViewFrame>
          }
          secondary={
            <EmptyState icon="codicon-edit">Editor or canvas content lives here.</EmptyState>
          }
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('separator', { name: 'Resize split view' })).toBeVisible();
  },
};
