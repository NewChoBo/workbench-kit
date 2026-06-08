import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchStructuredDataTableView,
  buildWorkbenchStructuredDataTableFromRecords,
} from './StructuredDataTableView';

describe('WorkbenchStructuredDataTableView', () => {
  it('renders table rows and columns', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchStructuredDataTableView
        table={buildWorkbenchStructuredDataTableFromRecords({
          columns: ['id', 'name'],
          rows: [{ id: '1', name: 'Alpha' }],
        })}
      />,
    );

    expect(markup).toContain('ui-workbench-structured-data-table-view');
    expect(markup).toContain('ui-workbench-structured-data-table-view__scroll');
    expect(markup).toContain('<th');
    expect(markup).toContain('id');
    expect(markup).toContain('Alpha');
  });

  it('renders empty state when there are no rows', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchStructuredDataTableView
        table={buildWorkbenchStructuredDataTableFromRecords({
          columns: ['id'],
          emptyLabel: 'No data',
          rows: [],
        })}
      />,
    );

    expect(markup).toContain('No data');
    expect(markup).not.toContain('ui-workbench-structured-data-table-view__table');
  });
});
