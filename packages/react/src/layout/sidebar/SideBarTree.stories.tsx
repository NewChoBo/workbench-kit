import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import '../../styles.css';
import { StoryEventLog, StorySidebarFrame } from '../../workbench/story/StorySidebarFrame';
import { SideBarViewFrame } from './SideBarViewFrame';
import { SideBarTree, type SideBarTreeItem } from './SideBarTree';

const DEMO_ITEMS: SideBarTreeItem[] = [
  {
    id: 'library',
    label: 'Library',
    children: [
      { id: 'installed', label: 'Installed' },
      { id: 'wishlist', label: 'Wishlist' },
    ],
  },
  {
    id: 'providers',
    label: 'Providers',
    children: [
      { id: 'steam', label: 'Steam' },
      { id: 'epic', label: 'Epic Games' },
    ],
  },
  { id: 'favorites', label: 'Favorites' },
];

function SideBarTreeHarness({
  selectionMode = 'single' as const,
}: {
  selectionMode?: 'single' | 'multi';
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['library']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(['installed']));

  return (
    <StorySidebarFrame variant="workspace">
      <SideBarViewFrame title="Catalog">
        <SideBarTree
          aria-label="Catalog tree"
          expandedIds={expandedIds}
          items={DEMO_ITEMS}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          onExpandedIdsChange={setExpandedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </SideBarViewFrame>
      <StoryEventLog aria-label="Sidebar tree state">
        expanded: {[...expandedIds].join(', ') || '(none)'} · selected:{' '}
        {[...selectedIds].join(', ') || '(none)'}
      </StoryEventLog>
    </StorySidebarFrame>
  );
}

const meta = {
  title: 'Workbench UI/Sidebar/Tree',
  parameters: {
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ExpandAndSelect: Story = {
  name: 'Expand and select',
  tags: ['storybook-play-baseline'],
  render: () => <SideBarTreeHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tree = canvas.getByRole('tree', { name: 'Catalog tree' });
    expect(tree).toBeTruthy();

    await userEvent.click(canvas.getByRole('button', { name: /Providers/i }));
    await canvas.findByRole('treeitem', { name: /Steam/i });
    expect(canvas.getByLabelText('Sidebar tree state').textContent).toMatch(/providers/);

    await userEvent.click(canvas.getByRole('button', { name: /Steam/i }));
    expect(canvas.getByLabelText('Sidebar tree state').textContent).toMatch(/steam/);
  },
};
