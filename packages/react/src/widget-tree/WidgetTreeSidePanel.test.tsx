/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WidgetTreeSidePanel } from './WidgetTreeSidePanel.js';
import type { WidgetTreeSidePanelDetailTab } from './WidgetTreeSidePanel.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function renderSidePanel(defaultTab?: 'outline' | 'assets' | 'properties') {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <WidgetTreeSidePanel
        defaultTab={defaultTab}
        assets={<div data-testid="assets-pane">Assets pane</div>}
        outline={<div data-testid="outline-pane">Outline pane</div>}
        properties={<div data-testid="properties-pane">Properties pane</div>}
      />,
    );
  });

  return { container, root };
}

function ControlledSidePanelHarness() {
  const [detailTab, setDetailTab] = useState<WidgetTreeSidePanelDetailTab>('assets');

  return (
    <WidgetTreeSidePanel
      assets={<div data-testid="assets-pane">Assets pane</div>}
      detailTab={detailTab}
      outline={<div data-testid="outline-pane">Outline pane</div>}
      properties={<div data-testid="properties-pane">Properties pane</div>}
      onDetailTabChange={setDetailTab}
    />
  );
}

function getButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) {
    throw new Error(`Unable to find button "${text}".`);
  }
  return button;
}

describe('WidgetTreeSidePanel', () => {
  it('keeps outline visible while showing properties by default', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeSidePanel
        assets={<div data-testid="assets-pane">Assets pane</div>}
        outline={<div data-testid="outline-pane">Outline pane</div>}
        properties={<div data-testid="properties-pane">Properties pane</div>}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-side-panel-outline"');
    expect(markup).toContain('aria-label="Widget outline"');
    expect(markup).toContain('aria-label="Widget details"');
    expect(markup).toContain('Outline pane');
    expect(markup).toContain('Properties pane');
    expect(markup).not.toContain('Assets pane');
  });

  it('keeps outline visible when assets are selected initially', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeSidePanel
        defaultTab="assets"
        assets={<div data-testid="assets-pane">Assets pane</div>}
        outline={<div data-testid="outline-pane">Outline pane</div>}
        properties={<div data-testid="properties-pane">Properties pane</div>}
      />,
    );

    expect(markup).toContain('Outline pane');
    expect(markup).toContain('Assets pane');
    expect(markup).not.toContain('Properties pane');
  });

  it('switches the detail pane without hiding outline', () => {
    const { container, root } = renderSidePanel();

    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Properties pane');
    expect(container.textContent).not.toContain('Assets pane');

    act(() => {
      getButtonByText(container, 'Assets').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Assets pane');
    expect(container.textContent).not.toContain('Properties pane');

    act(() => {
      getButtonByText(container, 'Props').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Properties pane');
    expect(container.textContent).not.toContain('Assets pane');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('supports controlled detail tab switching', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ControlledSidePanelHarness />);
    });

    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Assets pane');
    expect(container.textContent).not.toContain('Properties pane');

    act(() => {
      getButtonByText(container, 'Props').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Outline pane');
    expect(container.textContent).toContain('Properties pane');
    expect(container.textContent).not.toContain('Assets pane');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
