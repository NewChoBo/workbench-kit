import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  commandMenuEntries,
  createCommandRegistry,
  resolveCommandMenuItems,
} from '@workbench-kit/core';

const meta = {
  title: 'Headless/Core Commands',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface DemoContext {
  focusedView: string;
  log: string[];
}

export const WhenClauseVisibility: Story = {
  render: () => {
    const registry = createCommandRegistry<DemoContext>([
      {
        id: 'open-library',
        label: 'Open library',
        run: ({ log }) => log.push('open-library'),
        when: 'focusedView == contentHub.library',
      },
      {
        id: 'open-search',
        label: 'Open search',
        run: ({ log }) => log.push('open-search'),
        when: 'focusedView == workspace.search',
      },
    ]);

    const libraryItems = resolveCommandMenuItems({
      context: { focusedView: 'contentHub.library', log: [] },
      contextKeys: { focusedView: 'contentHub.library' },
      entries: commandMenuEntries<DemoContext>('open-library', 'open-search'),
      registry,
    });
    const searchItems = resolveCommandMenuItems({
      context: { focusedView: 'workspace.search', log: [] },
      contextKeys: { focusedView: 'workspace.search' },
      entries: commandMenuEntries<DemoContext>('open-library', 'open-search'),
      registry,
    });

    return (
      <div style={{ display: 'grid', gap: 16, minWidth: 320 }}>
        <section>
          <h3 style={{ margin: '0 0 8px' }}>Library context</h3>
          <ul>
            {libraryItems.map((item) =>
              item.type === 'command' ? <li key={item.id}>{item.label}</li> : null,
            )}
          </ul>
        </section>
        <section>
          <h3 style={{ margin: '0 0 8px' }}>Search context</h3>
          <ul>
            {searchItems.map((item) =>
              item.type === 'command' ? <li key={item.id}>{item.label}</li> : null,
            )}
          </ul>
        </section>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Library context' })).toBeVisible();
    await expect(canvas.getByText('Open library')).toBeVisible();
    await expect(canvas.queryByText('Open search')).not.toBeInTheDocument();
  },
};
