import { useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import {
  CatalogBrowseCard,
  EmptyState,
  ScrollArea,
  ScrollAreaInfiniteSentinel,
  useScrollAreaInfiniteLoad,
} from '.';

const PAGE_SIZE = 12;
const TOTAL_ITEMS = 36;

const meta = {
  title: 'React/Primitives/Scroll Area Infinite Load',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <InfiniteCatalogHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CatalogGrid: Story = {
  name: 'Catalog grid pagination',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('list')).toBeInTheDocument();
    await expect(canvas.getAllByRole('button', { name: /Catalog item/ })).toHaveLength(PAGE_SIZE);
    await expect(canvas.getByText(`Showing ${PAGE_SIZE} of ${TOTAL_ITEMS}`)).toBeInTheDocument();
  },
};

function InfiniteCatalogHarness() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const items = useMemo(
    () =>
      Array.from({ length: TOTAL_ITEMS }, (_, index) => ({
        id: `item-${index + 1}`,
        label: `Catalog item ${index + 1}`,
      })),
    [],
  );
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const { sentinelRef } = useScrollAreaInfiniteLoad({
    hasMore,
    isLoadingMore,
    onLoadMore: async () => {
      setIsLoadingMore(true);
      await new Promise((resolve) => {
        window.setTimeout(resolve, 250);
      });
      setVisibleCount((current) => Math.min(current + PAGE_SIZE, items.length));
      setIsLoadingMore(false);
    },
    scrollAreaRef,
  });

  return (
    <StoryWorkbenchShellFrame title="Catalog browse" variant="editor">
      <div style={{ display: 'grid', gap: 8, height: '100%', minHeight: 0 }}>
        <div aria-live="polite" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          Showing {visibleItems.length} of {items.length}
        </div>
        <ScrollArea
          aria-label="Catalog grid"
          className="ui-scroll-area-infinite-load-story"
          orientation="vertical"
          ref={scrollAreaRef}
          role="list"
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            minHeight: 0,
          }}
        >
          {visibleItems.map((item) => (
            <CatalogBrowseCard
              imageAlt={item.label}
              key={item.id}
              label={item.label}
              onClick={() => undefined}
              variant="cover"
            />
          ))}
          {hasMore ? <ScrollAreaInfiniteSentinel ref={sentinelRef} /> : null}
          {isLoadingMore ? (
            <EmptyState compact icon="loading">
              Loading more items
            </EmptyState>
          ) : null}
        </ScrollArea>
      </div>
    </StoryWorkbenchShellFrame>
  );
}
