import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useRef, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../primitives/button';
import { CatalogFilterOverlay } from '../primitives/catalog-filter-overlay/CatalogFilterOverlay';
import { SearchableMultiSelect } from '../primitives/searchable-multi-select/SearchableMultiSelect';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { useAnchoredOverlayPanel } from './useAnchoredOverlayPanel';

const genreOptions = [
  { label: 'Action', value: 'action', count: 12 },
  { label: 'Strategy', value: 'strategy', count: 7 },
  { label: 'Racing', value: 'racing', count: 4 },
];

function AnchoredCatalogFilterHarness() {
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<readonly string[]>(['action']);
  const { panelProps, portalRoot } = useAnchoredOverlayPanel({
    open,
    onOpenChange: setOpen,
    triggerRef,
  });

  const panel = open ? (
    <CatalogFilterOverlay
      clearDisabled={selectedValues.length === 0}
      clearLabel="Clear filters"
      onClear={() => {
        setSelectedValues([]);
      }}
      ref={panelProps.ref as Ref<HTMLDivElement>}
      style={panelProps.style ?? undefined}
      tabIndex={panelProps.tabIndex}
      title="Filters"
      titleId={titleId}
    >
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #999)' }}>Genre</span>
        <SearchableMultiSelect
          aria-label="Genre"
          onValueToggle={(value) => {
            setSelectedValues((current) =>
              current.includes(value)
                ? current.filter((entry) => entry !== value)
                : [...current, value],
            );
          }}
          options={genreOptions}
          selectedValues={selectedValues}
        />
      </label>
    </CatalogFilterOverlay>
  ) : null;

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #444)',
        }}
      >
        <Button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="dialog"
          compact
          onClick={() => {
            setOpen((current) => !current);
          }}
          type="button"
        >
          Filters
        </Button>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #999)' }}>
          Overlay trigger surface — nested searchable multi-select stays inside dismiss.
        </span>
      </div>
      {panel ? createPortal(panel, portalRoot) : null}
    </StoryWorkbenchShellFrame>
  );
}

const meta = {
  title: 'React/Overlay/Anchored Overlay Panel',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <AnchoredCatalogFilterHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CatalogFilterWithNestedSelect: Story = {
  name: 'Catalog filter with nested select',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Filters' });
    await expect(dialog).toBeVisible();

    const genre = within(dialog).getByRole('combobox', { name: 'Genre' });
    await userEvent.click(genre);

    const listbox = await within(document.body).findByRole('listbox');
    await expect(listbox).toBeVisible();
    await userEvent.click(within(listbox).getByRole('option', { name: /Strategy/ }));

    await expect(dialog).toBeVisible();
    // Nested SMS listbox consumes the first Escape (defaultPrevented).
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(document.body).queryByRole('listbox')).toBeNull());
    await expect(dialog).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog', { name: 'Filters' })).toBeNull(),
    );
  },
  tags: ['storybook-play-baseline'],
};
