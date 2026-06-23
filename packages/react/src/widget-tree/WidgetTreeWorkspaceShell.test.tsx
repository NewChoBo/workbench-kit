import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

import { WidgetTreeWorkspaceShell } from './WidgetTreeWorkspaceShell.js';

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
});
