import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkspaceExplorerPanel } from './WorkspaceExplorerPanel';

describe('WorkspaceExplorerPanel', () => {
  it('renders toolbar, filter, and explorer tree surface', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorerPanel
        expandedPaths={new Set()}
        filterQuery="app"
        nodes={[]}
        showFilter
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
        onNewFile={() => undefined}
        onNewFolder={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(markup).toContain('ui-workspace-explorer-panel');
    expect(markup).toContain('ui-explorer-action-bar--bar');
    expect(markup).toContain('aria-label="Filter workspace"');
    expect(markup).toContain('value="app"');
  });
});
