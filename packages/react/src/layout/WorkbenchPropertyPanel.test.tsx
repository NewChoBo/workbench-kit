import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchMetricGrid, WorkbenchPropertySection } from './WorkbenchPropertyPanel';

describe('WorkbenchMetricGrid', () => {
  it('renders metric items with the property grid layout', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMetricGrid
        data-testid="metrics"
        items={[
          { id: 'files', label: 'Files', value: '12' },
          { id: 'valid', label: 'Valid', value: '10' },
          { id: 'issues', label: 'Issues', value: '2' },
          { id: 'updated', label: 'Updated', value: '12:00' },
        ]}
      />,
    );

    expect(markup).toContain('ui-workbench-property-grid');
    expect(markup).toContain('data-columns="3"');
    expect(markup).toContain('data-gap="md"');
    expect(markup).toContain('Files');
    expect(markup).toContain('12');
    expect(markup).toContain('Updated');
  });

  it('allows callers to override columns and gap', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMetricGrid
        columns={2}
        gap="sm"
        items={[
          ['First', 'A'],
          ['Second', 'B'],
          ['Third', 'C'],
          ['Fourth', 'D'],
        ]}
      />,
    );

    expect(markup).toContain('data-columns="2"');
    expect(markup).toContain('data-gap="sm"');
    expect(markup).toContain('Fourth');
  });
});

describe('WorkbenchPropertySection', () => {
  it('defaults to a non-collapsible category section', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertySection title="Common">
        <span>Body</span>
      </WorkbenchPropertySection>,
    );

    expect(markup).toContain('data-level="category"');
    expect(markup).not.toContain('ui-workbench-property-section--collapsible');
    expect(markup).not.toContain('ui-workbench-property-section__toggle');
    expect(markup).toContain('Common');
    expect(markup).toContain('Body');
  });

  it('renders disclosure chevron affordances when collapsible', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertySection collapsible defaultCollapsed title="Appearance">
        <span>Layers</span>
      </WorkbenchPropertySection>,
    );

    expect(markup).toContain('ui-workbench-property-section--collapsible');
    expect(markup).toContain('ui-workbench-property-section--collapsed');
    expect(markup).toContain('ui-workbench-property-section__toggle');
    expect(markup).toContain('codicon-chevron-right');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('hidden');
  });

  it('supports quieter group-level headers without disclosure by default', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPropertySection level="group" title="Layers">
        <span>Fill</span>
      </WorkbenchPropertySection>,
    );

    expect(markup).toContain('data-level="group"');
    expect(markup).not.toContain('ui-workbench-property-section__toggle');
    expect(markup).toContain('Layers');
  });
});
