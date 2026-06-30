import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchViewEditor } from './WorkbenchViewEditor';

describe('WorkbenchViewEditor', () => {
  it('renders tabs, editor body, and a standard empty state surface', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchViewEditor
        className="workbench-editor-area"
        data-editor="baseline"
        emptyState={{
          children: 'Library',
          icon: 'layout',
          surfaceProps: { 'data-empty-state': 'true' },
        }}
        tabs={<div data-tabs="true">Tabs</div>}
      />,
    );

    expect(markup).toContain('ui-workbench-editor-frame');
    expect(markup).toContain('workbench-editor-area');
    expect(markup).toContain('data-editor="baseline"');
    expect(markup).toContain('data-tabs="true"');
    expect(markup).toContain('ui-workbench-editor-body');
    expect(markup).toContain('ui-workbench-panel-surface');
    expect(markup).toContain('data-empty-state="true"');
    expect(markup).toContain('ui-empty-state');
    expect(markup).toContain('Library');
  });
});
