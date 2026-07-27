import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkspaceExplorer } from './WorkspaceExplorer';
import type { WorkspaceTreeNode } from './types';

const sampleNodes: WorkspaceTreeNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      {
        children: [],
        name: 'App.tsx',
        path: 'src/App.tsx',
        type: 'file',
        file: { content: 'export {}', mimeType: 'text/typescript', path: 'src/App.tsx' },
      },
    ],
  },
];

describe('WorkspaceExplorer', () => {
  it('renders host row actions with hover-reveal chrome', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorer
        expandedPaths={new Set(['src'])}
        nodes={sampleNodes}
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
        renderItemActions={(node) =>
          node.type === 'folder' ? (
            <button type="button" aria-label={`New file in ${node.name}`}>
              New
            </button>
          ) : null
        }
      />,
    );

    expect(markup).toContain('ui-workspace-explorer-item-actions');
    expect(markup).toContain('aria-label="New file in src"');
    expect(markup).toContain('App.tsx');
  });

  it('omits row action chrome when renderItemActions is unset', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorer
        expandedPaths={new Set(['src'])}
        nodes={sampleNodes}
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
      />,
    );

    expect(markup).not.toContain('ui-workspace-explorer-item-actions');
  });

  it('exposes ARIA tree roles and expanded state on folder rows', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceExplorer
        expandedPaths={new Set(['src'])}
        focusedPath="src"
        nodes={sampleNodes}
        onActivateFile={() => undefined}
        onToggleFolder={() => undefined}
      />,
    );

    expect(markup).toContain('role="tree"');
    expect(markup).toContain('role="treeitem"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-level="1"');
    expect(markup).toContain(
      'aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Delete F2"',
    );
  });
});
