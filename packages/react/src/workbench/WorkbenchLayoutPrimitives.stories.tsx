import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { EmptyState } from '../primitives/EmptyState';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import {
  activityPreviewLabel,
  extendedIdeActivityDescriptors,
  integratedShellActivityDescriptors,
  settingsSecondaryItem,
  toActivityBarItems,
  type ActivityBarStoryCaseId,
} from './activityBarStoryCases';
import { SplitView } from './SplitView';

const meta = {
  title: 'React/Workbench/Layout Primitives',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function ActivityBarStoryFrame({ children, preview }: { children: ReactNode; preview?: string }) {
  return (
    <div
      className="ide-root"
      style={{
        background: 'var(--color-bg)',
        display: 'flex',
        height: 'min(calc(100vh - 120px), 520px)',
        minHeight: 360,
      }}
    >
      {children}
      <main
        style={{
          alignItems: 'center',
          borderLeft: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          display: 'grid',
          flex: 1,
          fontSize: 13,
          justifyItems: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        {preview ?? 'Activity preview'}
      </main>
    </div>
  );
}

function InteractiveActivityBarDemo({
  initialActiveId = 'explorer',
  items,
  secondaryItems = [settingsSecondaryItem()],
}: {
  initialActiveId?: ActivityBarStoryCaseId;
  items: ActivityBarItem[];
  secondaryItems?: ActivityBarItem[];
}) {
  const [activeId, setActiveId] = useState<ActivityBarStoryCaseId>(initialActiveId);

  const resolvedItems = items.map((item) => ({
    ...item,
    active: item.id === activeId,
  }));

  return (
    <ActivityBarStoryFrame preview={activityPreviewLabel(activeId)}>
      <ActivityBar
        items={resolvedItems}
        secondaryItems={secondaryItems}
        onItemActivate={(item) => {
          if (item.disabled) {
            return;
          }
          setActiveId(item.id as ActivityBarStoryCaseId);
        }}
      />
    </ActivityBarStoryFrame>
  );
}

export const ActivityBarIntegratedShell: Story = {
  name: 'ActivityBar / Integrated shell',
  parameters: {
    docs: {
      description: {
        story:
          'Default explorer, search, chatting, and AI Chat activities with settings pinned to the bottom.',
      },
    },
  },
  render: () => (
    <ActivityBarStoryFrame preview={activityPreviewLabel('explorer')}>
      <ActivityBar
        items={toActivityBarItems(integratedShellActivityDescriptors, { activeId: 'explorer' })}
        secondaryItems={[settingsSecondaryItem()]}
      />
    </ActivityBarStoryFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Chat' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(canvas.getByRole('button', { name: 'AI Chat' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};

export const ActivityBarInteractive: Story = {
  name: 'ActivityBar / Interactive',
  parameters: {
    docs: {
      description: {
        story: 'Click activities to switch the active rail item and preview description.',
      },
    },
  },
  render: () => (
    <InteractiveActivityBarDemo
      initialActiveId="search"
      items={toActivityBarItems(integratedShellActivityDescriptors)}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'AI Chat' }));
    await expect(canvas.getByRole('button', { name: 'AI Chat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByText(/Workspace-aware assistant/i)).toBeVisible();
  },
};

export const ActivityBarAiChatActive: Story = {
  name: 'ActivityBar / AI Chat active',
  parameters: {
    docs: {
      description: {
        story: 'AI Chat activity selected — sidebar hosts the workspace assistant panel.',
      },
    },
  },
  render: () => (
    <InteractiveActivityBarDemo
      initialActiveId="aiChat"
      items={toActivityBarItems(integratedShellActivityDescriptors)}
    />
  ),
};

export const ActivityBarChattingActive: Story = {
  name: 'ActivityBar / Chatting active',
  parameters: {
    docs: {
      description: {
        story: 'Chatting activity selected — sidebar hosts direct messages and team channels.',
      },
    },
  },
  render: () => (
    <InteractiveActivityBarDemo
      initialActiveId="chatting"
      items={toActivityBarItems(integratedShellActivityDescriptors)}
    />
  ),
};

export const ActivityBarExtendedIde: Story = {
  name: 'ActivityBar / Extended IDE rail',
  parameters: {
    docs: {
      description: {
        story: 'Additional SCM, run, and extensions slots for dense workbench layouts.',
      },
    },
  },
  render: () => (
    <ActivityBarStoryFrame preview={activityPreviewLabel('scm')}>
      <ActivityBar
        items={toActivityBarItems(extendedIdeActivityDescriptors, { activeId: 'scm' })}
        secondaryItems={[settingsSecondaryItem()]}
      />
    </ActivityBarStoryFrame>
  ),
};

export const ActivityBarDisabledItem: Story = {
  name: 'ActivityBar / Disabled item',
  parameters: {
    docs: {
      description: {
        story: 'Unavailable activities stay visible but cannot be activated.',
      },
    },
  },
  render: () => (
    <InteractiveActivityBarDemo
      initialActiveId="explorer"
      items={toActivityBarItems(integratedShellActivityDescriptors, {
        disabledIds: new Set<ActivityBarStoryCaseId>(['search']),
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchButton = canvas.getByRole('button', { name: 'Search' });
    await expect(searchButton).toBeDisabled();
    await userEvent.click(searchButton);
    await expect(canvas.getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const ActivityBarPrimaryOnly: Story = {
  name: 'ActivityBar / Primary only',
  render: () => (
    <ActivityBarStoryFrame preview="No secondary rail items">
      <ActivityBar
        items={toActivityBarItems(integratedShellActivityDescriptors, { activeId: 'search' })}
      />
    </ActivityBarStoryFrame>
  ),
};

export const ActivityBarSecondarySettings: Story = {
  name: 'ActivityBar / Settings secondary',
  render: () => (
    <ActivityBarStoryFrame preview={activityPreviewLabel('settings')}>
      <ActivityBar
        items={toActivityBarItems(integratedShellActivityDescriptors, { activeId: 'aiChat' })}
        secondaryItems={[settingsSecondaryItem()]}
      />
    </ActivityBarStoryFrame>
  ),
};

/** @deprecated Use ActivityBarIntegratedShell — kept for baseline play alias. */
export const ActivityBarStandalone: Story = {
  name: 'ActivityBar / Standalone (legacy)',
  render: () => (
    <div style={{ height: 'min(calc(100% - 120px), 500px)', background: 'var(--color-bg)' }}>
      <ActivityBar
        items={toActivityBarItems(integratedShellActivityDescriptors, { activeId: 'explorer' })}
        secondaryItems={[settingsSecondaryItem()]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-pressed',
      'true',
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
