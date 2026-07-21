import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../primitives/button/Button';
import {
  LibraryCatalogPickerDialog,
  type LibraryCatalogPickerItem,
} from './LibraryCatalogPickerDialog';

const sampleItems: LibraryCatalogPickerItem[] = [
  { id: 'asset-orbit', label: 'orbit-cover.png', meta: 'asset-orbit' },
  { id: 'asset-harbor', label: 'harbor-banner.jpg', meta: 'asset-harbor' },
  { id: 'asset-circuit', label: 'night-circuit.webp', meta: 'asset-circuit' },
  { id: 'asset-plain', label: 'plain-swatch.png', meta: 'asset-plain' },
];

function CatalogPickerStory() {
  const [open, setOpen] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>('asset-orbit');
  const [installCount, setInstallCount] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button type="button" onClick={() => setOpen(true)}>
          Open picker
        </Button>
        <span>Selected: {selectedItemId ?? '(none)'}</span>
        <span>Install clicks: {installCount}</span>
      </div>
      {open ? (
        <LibraryCatalogPickerDialog
          ariaLabel="Catalog picker"
          closeLabel="Close catalog picker"
          headerActions={
            <Button
              type="button"
              onClick={() => {
                setInstallCount((count) => count + 1);
              }}
            >
              Install Image
            </Button>
          }
          isLoading={false}
          items={sampleItems}
          labels={{
            clearSearch: 'Clear search',
            empty: 'No catalog items',
            loading: 'Loading catalog…',
            noMatches: 'No matching items',
            searchAria: 'Search catalog',
            searchPlaceholder: 'Search by label or id',
          }}
          selectedItemId={selectedItemId}
          title="Catalog Library"
          onClose={() => {
            setOpen(false);
          }}
          onPick={(itemId) => {
            setSelectedItemId(itemId);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

const meta = {
  title: 'Workbench/Management/LibraryCatalogPickerDialog',
  component: CatalogPickerStory,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CatalogPickerStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
