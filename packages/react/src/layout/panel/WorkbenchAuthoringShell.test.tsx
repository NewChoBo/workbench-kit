/** @vitest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  WorkbenchAuthoringShell,
  WorkbenchPlainTextSource,
  WorkbenchSurfaceMeta,
  WorkbenchSurfaceToolbar,
} from './WorkbenchAuthoringShell';

describe('WorkbenchAuthoringShell', () => {
  it('renders toolbar and body slots with owned chrome classes', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchAuthoringShell
        data-testid="shell"
        toolbar={<WorkbenchSurfaceMeta>Demo title</WorkbenchSurfaceMeta>}
      >
        <WorkbenchPlainTextSource aria-label="Source" defaultValue="{ }" />
      </WorkbenchAuthoringShell>,
    );

    expect(markup).toContain('ui-workbench-authoring-shell');
    expect(markup).toContain('ui-workbench-surface-toolbar');
    expect(markup).toContain('ui-workbench-surface-meta');
    expect(markup).toContain('ui-workbench-plain-text-source');
    expect(markup).toContain('Demo title');
    expect(markup).toContain('data-testid="shell"');
  });

  it('exposes toolbar as a standalone component', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSurfaceToolbar data-testid="toolbar">Actions</WorkbenchSurfaceToolbar>,
    );
    expect(markup).toContain('ui-workbench-surface-toolbar');
    expect(markup).toContain('Actions');
  });
});
