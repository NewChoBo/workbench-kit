/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WidgetTreeSidePanel } from './WidgetTreeSidePanel.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WidgetTreeSidePanel', () => {
  it('shows outline above properties for the right authoring sidebar', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeSidePanel
        outline={<div data-testid="outline-pane">Outline pane</div>}
        properties={<div data-testid="properties-pane">Properties pane</div>}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-side-panel-outline"');
    expect(markup).toContain('data-testid="widget-tree-side-panel-properties"');
    expect(markup).toContain('aria-label="Widget outline"');
    expect(markup).toContain('aria-label="Widget properties"');
    expect(markup).toContain('Outline pane');
    expect(markup).toContain('Properties pane');
    expect(markup).not.toContain('widget-tree-side-panel-assets');
  });

  it('keeps both authoring panes mounted', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <WidgetTreeSidePanel
          outline={<div data-testid="outline-pane">Outline pane</div>}
          properties={<div data-testid="properties-pane">Properties pane</div>}
        />,
      );
    });

    expect(
      container.querySelector('[data-testid="widget-tree-side-panel-outline"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="widget-tree-side-panel-properties"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Properties pane');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
