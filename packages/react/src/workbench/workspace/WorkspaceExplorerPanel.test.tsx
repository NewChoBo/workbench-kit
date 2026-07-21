import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkspaceExplorerPanel } from './WorkspaceExplorerPanel';

describe('WorkspaceExplorerPanel', () => {
  it('renders section chrome and explorer tree surface', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorerPanel
        expandedPaths={new Set()}
        nodes={[]}
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
        onNewFile={() => undefined}
        onNewFolder={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(markup).toContain('workbench-explorer-view');
    expect(markup).toContain('ui-workspace-explorer-panel');
    expect(markup).toContain('ui-sidebar-view');
    expect(markup).toContain('Explorer');
    expect(markup).toContain('ui-workbench-sidebar-section');
    expect(markup).toContain('aria-label="New file"');
  });

  it('renders toolbar leading, trailing, and status slots', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorerPanel
        expandedPaths={new Set()}
        nodes={[]}
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
        onNewFile={() => undefined}
        toolbarLeading={<span data-testid="toolbar-leading">Lead</span>}
        toolbarStatus={<span data-testid="toolbar-status">3 items</span>}
        toolbarTrailing={<span data-testid="toolbar-trailing">Trail</span>}
      />,
    );

    expect(markup).toContain('data-testid="toolbar-leading"');
    expect(markup).toContain('data-testid="toolbar-trailing"');
    expect(markup).toContain('data-testid="toolbar-status"');
    expect(markup).toContain('ui-explorer-action-bar__status');
    expect(markup.indexOf('toolbar-leading')).toBeLessThan(markup.indexOf('New file'));
    expect(markup.indexOf('New file')).toBeLessThan(markup.indexOf('toolbar-trailing'));
    expect(markup.indexOf('toolbar-trailing')).toBeLessThan(markup.indexOf('toolbar-status'));
  });
});
