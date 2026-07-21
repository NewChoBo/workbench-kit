import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
  LibraryFacetFilterPanel,
  type LibraryFacetField,
  type LibraryFacetFieldKind,
  type LibraryFacetSection,
} from './LibraryFacetFilterPanel';

const sampleSections: LibraryFacetSection[] = [
  {
    id: 'catalog',
    fields: [
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
        id: 'platform',
        kind: 'multi-select',
        options: [
          { label: 'Windows', value: 'windows', count: 18 },
          { label: 'Linux', value: 'linux', count: 2 },
        ],
      },
    ],
  },
  {
    id: 'metadata',
    fields: [
      {
        id: 'year',
        kind: 'single-select',
        options: [
          { label: '2025', value: '2025', count: 3 },
          { label: '2024', value: '2024', count: 9 },
          { label: '2023', value: '2023', count: 5 },
        ],
      },
    ],
  },
];

const fieldLabels: Record<string, string> = {
  genre: 'Genre',
  platform: 'Platform',
  year: 'Year',
};

const sectionLabels: Record<string, string> = {
  catalog: 'Catalog',
  metadata: 'Metadata',
};

function allFields(sections: ReadonlyArray<LibraryFacetSection>): LibraryFacetField[] {
  return sections.flatMap((section) => [...section.fields]);
}

function FacetFilterPanelStory() {
  const [selectedValues, setSelectedValues] = useState<Record<string, readonly string[]>>({
    genre: ['action'],
  });

  const activeChips = Object.entries(selectedValues).flatMap(([fieldId, values]) =>
    values.map((value) => {
      const field = allFields(sampleSections).find((entry) => entry.id === fieldId);
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

  const onRemoveChip = (chipId: string): void => {
    const separatorIndex = chipId.indexOf(':');
    if (separatorIndex < 0) {
      return;
    }

    const fieldId = chipId.slice(0, separatorIndex);
    const value = chipId.slice(separatorIndex + 1);
    setSelectedValues((current) => ({
      ...current,
      [fieldId]: (current[fieldId] ?? []).filter((entry) => entry !== value),
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480, maxWidth: 420 }}>
      <LibraryFacetFilterPanel
        activeChips={activeChips}
        description="Apply filters to the current catalog result set."
        labels={{
          clearAll: 'Clear filters',
          clearChipAria: (chipLabel) => `Remove ${chipLabel}`,
          empty: 'No filters available',
        }}
        onClearAll={() => {
          setSelectedValues({});
        }}
        onRemoveChip={onRemoveChip}
        onToggleFacetValue={onToggleFacetValue}
        resolveFieldLabel={(fieldId) => fieldLabels[fieldId] ?? fieldId}
        resolveSectionLabel={(sectionId) => sectionLabels[sectionId] ?? sectionId}
        sections={sampleSections}
        selectedValues={selectedValues}
      />
    </div>
  );
}

const meta = {
  title: 'Primitives/LibraryFacetFilterPanel',
  component: FacetFilterPanelStory,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FacetFilterPanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
