import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
  LibraryFacetFilterStrip,
  type LibraryFacetField,
  type LibraryFacetFieldKind,
} from './LibraryFacetFilterStrip';

const sampleFields: LibraryFacetField[] = [
  {
    id: 'genre',
    kind: 'multi-select',
    options: [
      { label: 'Action', value: 'action', count: 12 },
      { label: 'Strategy', value: 'strategy', count: 7 },
      { label: 'Racing', value: 'racing', count: 4 },
    ],
  },
  {
    id: 'year',
    kind: 'single-select',
    options: [
      { label: '2025', value: '2025', count: 3 },
      { label: '2024', value: '2024', count: 9 },
      { label: '2023', value: '2023', count: 5 },
    ],
  },
];

const secondaryFields: LibraryFacetField[] = [
  {
    id: 'platform',
    kind: 'multi-select',
    options: [
      { label: 'Windows', value: 'windows', count: 18 },
      { label: 'Linux', value: 'linux', count: 2 },
    ],
  },
];

const fieldLabels: Record<string, string> = {
  genre: 'Genre',
  year: 'Year',
  platform: 'Platform',
};

function FacetFilterStripStory() {
  const [expanded, setExpanded] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, readonly string[]>>({
    genre: ['action'],
  });

  const activeChips = Object.entries(selectedValues).flatMap(([fieldId, values]) =>
    values.map((value) => {
      const field = [...sampleFields, ...secondaryFields].find((entry) => entry.id === fieldId);
      const option = field?.options.find((entry) => entry.value === value);
      return {
        id: `${fieldId}:${value}`,
        label: `${fieldLabels[fieldId] ?? fieldId}: ${option?.label ?? value}`,
      };
    }),
  );

  const onToggleFacetValue = (
    fieldId: string,
    value: string,
    kind: LibraryFacetFieldKind,
  ): void => {
    setSelectedValues((current) => {
      const existing = current[fieldId] ?? [];
      if (kind === 'single-select') {
        return {
          ...current,
          [fieldId]: existing.includes(value) ? [] : [value],
        };
      }

      return {
        ...current,
        [fieldId]: existing.includes(value)
          ? existing.filter((entry) => entry !== value)
          : [...existing, value],
      };
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
      <LibraryFacetFilterStrip
        activeChips={activeChips}
        clearAllLabel="Clear filters"
        expanded={expanded}
        filtersButtonLabel={activeChips.length > 0 ? `Filters (${activeChips.length})` : 'Filters'}
        filtersMenuAriaLabel="Catalog filters"
        onClearAll={() => {
          setSelectedValues({});
        }}
        onShowLess={() => {
          setExpanded(false);
        }}
        onShowMore={() => {
          setExpanded(true);
        }}
        onToggleFacetValue={onToggleFacetValue}
        primaryFields={sampleFields}
        resolveFieldLabel={(fieldId) => fieldLabels[fieldId] ?? fieldId}
        secondaryFields={secondaryFields}
        selectedValues={selectedValues}
        showLessLabel="Show fewer filters"
        showMoreLabel="Show more filters"
      />
      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
        {activeChips.length > 0
          ? activeChips.map((chip) => chip.label).join(' · ')
          : 'No active filters'}
      </span>
    </div>
  );
}

const meta = {
  title: 'Primitives/LibraryFacetFilterStrip',
  component: FacetFilterStripStory,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FacetFilterStripStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
