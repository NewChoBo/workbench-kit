import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

import {
  canSaveWidgetTreeWorkspaceFile,
  WidgetTreeWorkspaceShell,
} from './WidgetTreeWorkspaceShell.js';
import { JDW_WIDGET_DOCUMENT_MIME } from '../jdw/document.js';

describe('WidgetTreeWorkspaceShell', () => {
  it('renders workbench shell host and editor workspace panels', () => {
    const markup = renderToStaticMarkup(<WidgetTreeWorkspaceShell />);

    expect(markup).toContain('data-testid="jdw-workspace-shell"');
    expect(markup).toContain('aria-label="Activity bar"');
    expect(markup).toContain('aria-label="Explorer sidebar"');
    expect(markup).toContain('--ui-workbench-split-primary-size:20%');
    expect(markup).toContain('class="workbench-editor-area jdw-workspace-shell__editor"');
    expect(markup).toContain('data-testid="widget-tree-lab-data-pane"');
    expect(markup).toContain('data-testid="widget-tree-lab-render-pane"');
  });

  it('rejects invalid JDW saves before they reach the workspace host', () => {
    expect(
      canSaveWidgetTreeWorkspaceFile(
        {
          path: 'src/widgets/invalid.jdw.json',
          mimeType: JDW_WIDGET_DOCUMENT_MIME,
          content: '',
        },
        JSON.stringify({
          type: 'grid',
          args: { children: [] },
        }),
      ),
    ).toBe(false);

    expect(
      canSaveWidgetTreeWorkspaceFile(
        {
          path: 'README.md',
          content: '',
        },
        'not a widget document',
      ),
    ).toBe(true);
  });
});
