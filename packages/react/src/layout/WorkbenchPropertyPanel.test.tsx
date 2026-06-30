import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchMetricGrid } from './WorkbenchPropertyPanel';

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
