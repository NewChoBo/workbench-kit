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
    expect(markup).toContain('ui-side-bar-view');
    expect(markup).toContain('Explorer');
    expect(markup).toContain('ui-workbench-sidebar-section');
    expect(markup).toContain('aria-label="New file"');
  });
});
