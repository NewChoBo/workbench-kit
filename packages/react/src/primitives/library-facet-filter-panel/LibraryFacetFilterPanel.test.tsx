import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LibraryFacetFilterPanel, type LibraryFacetSection } from './LibraryFacetFilterPanel';

const manyGenreOptions = Array.from({ length: 14 }, (_, index) => ({
  label: `Genre ${index + 1}`,
  value: `genre-${index + 1}`,
  count: index + 1,
}));

const sampleSections: LibraryFacetSection[] = [
  {
    id: 'source',
    fields: [
      {
        id: 'source',
        kind: 'multi-select',
        options: [
          { label: 'Steam', value: 'steam', count: 4 },
          { label: 'Epic', value: 'epic', count: 2 },
        ],
        presentation: 'checklist',
      },
    ],
  },
  {
    id: 'genre',
    fields: [
      {
        id: 'genre',
        kind: 'multi-select',
        options: manyGenreOptions,
      },
    ],
  },
];

const labels = {
  clearAll: 'Clear filters',
  clearChipAria: (chipLabel: string) => `Clear ${chipLabel}`,
  empty: 'No filters available',
  filterOptions: 'Search options',
  noMatchingOptions: 'No matching options',
};

describe('LibraryFacetFilterPanel', () => {
  it('uses checklist for short fields and searchable multi for long lists', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={sampleSections}
        selectedValues={{ genre: ['genre-1'] }}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('data-ui-library-facet-filter-panel-collapsible="false"');
    expect(markup).toContain('data-presentation="checklist"');
    expect(markup).toContain('data-presentation="searchable-multi"');
    expect(markup).toContain('data-ui-searchable-multi-select="true"');
    expect(markup).toContain('Search options');
    expect(markup).toContain('data-ui-searchable-multi-select-chip="genre-1"');
    expect(markup).toContain('Genre 1');
    expect(markup).not.toContain('ui-library-facet-filter-panel__options--multi-column');
  });

  it('keeps facet scroll on auto gutter with overlay scrollbars', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={sampleSections}
        selectedValues={{}}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('ui-library-facet-filter-panel__scroll');
    expect(markup).toContain('ui-scroll-area--overlay-host');
    expect(markup).toContain('ui-scroll-area__viewport');
    expect(markup).toContain('ui-workbench-scrollbar--overlay');
    expect(markup).not.toContain('ui-scroll-area--stable-gutter');
    expect(markup).not.toContain('ui-workbench-scrollbar--hidden');
  });

  it('honors explicit checklist presentation on long multi-select fields', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={[
          {
            id: 'genre',
            fields: [
              {
                id: 'genre',
                kind: 'multi-select',
                options: manyGenreOptions,
                presentation: 'checklist',
              },
            ],
          },
        ]}
        selectedValues={{}}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('data-presentation="checklist"');
    expect(markup).toContain('ui-library-facet-filter-panel__options--multi-column');
    expect(markup).not.toContain('data-ui-searchable-multi-select="true"');
  });

  it('can enable collapsible section headers', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        collapsibleSections
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={sampleSections}
        selectedValues={{}}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('data-ui-library-facet-filter-panel-collapsible="true"');
    expect(markup).toContain('ui-library-facet-filter-panel__section-toggle');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).not.toContain('data-collapsed="true"');
  });

  it('shows selection count when collapsible and a section has selections', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        collapsibleSections
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={sampleSections}
        selectedValues={{ genre: ['genre-1'] }}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('ui-library-facet-filter-panel__section-count');
    expect(markup).toContain('>1</span>');
  });

  it('honors explicit defaultCollapsed on sections without selections', () => {
    const markup = renderToStaticMarkup(
      <LibraryFacetFilterPanel
        collapsibleSections
        labels={labels}
        onToggleFacetValue={() => undefined}
        resolveFieldLabel={(fieldId) => fieldId}
        resolveSectionLabel={(sectionId) => sectionId}
        sections={[
          { ...sampleSections[0]!, defaultCollapsed: true },
          { ...sampleSections[1]!, defaultCollapsed: false },
        ]}
        selectedValues={{}}
        showActiveChips={false}
      />,
    );

    expect(markup).toContain('data-ui-library-facet-filter-panel-section="source"');
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain('Search options');
  });
});
