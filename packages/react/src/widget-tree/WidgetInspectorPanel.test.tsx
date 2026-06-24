/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createWidgetDocument,
  getWidgetChildren,
  type GenericWidget,
  type WidgetPath,
} from '@workbench-kit/jdw';

import { WidgetInspectorPanel } from './WidgetInspectorPanel.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WidgetInspectorPanel', () => {
  it('renders inspector fields for a selected widget', () => {
    const document = createWidgetDocument(WIDGET_TREE_WELCOME_DOCUMENT);
    const widget = document.root ? getWidgetChildren(document.root)[0] : undefined;

    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        path={[{ kind: 'children', index: 0 }]}
        widget={widget ?? null}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-inspector-panel"');
    expect(markup).toContain('Content');
    expect(markup).toContain('Widget Tree');
  });

  it('renders grid placement fields when parent is a grid', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        parentWidget={{ type: 'grid', columns: 2, children: [] }}
        path={[{ kind: 'children', index: 0 }]}
        widget={{ type: 'text', text: 'A', col: 0, row: 0 }}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('Grid placement');
    expect(markup).toContain('Column');
  });

  it('renders stack placement fields when parent is a stack', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        parentWidget={{ type: 'stack', children: [] }}
        path={[{ kind: 'children', index: 0 }]}
        widget={{ type: 'text', text: 'A', left: 4, top: 8 }}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('Stack placement');
    expect(markup).toContain('Left');
    expect(markup).toContain('Top');
  });

  it('renders flex fit placement fields when parent is linear', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        parentWidget={{ type: 'row', children: [] }}
        path={[{ kind: 'children', index: 0 }]}
        widget={{ type: 'text', text: 'A', flex: 1, flexFit: 'loose' }}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('Flex placement');
    expect(markup).toContain('Fit');
    expect(markup).toContain('Loose');
  });

  it('prompts for selection when no widget is active', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel widget={null} path={[]} widgetRegistry={WIDGET_TREE_DEMO_REGISTRY} />,
    );

    expect(markup).toContain('Select a node in the outline.');
  });

  it('emits stack placement patches from labelled number rows', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const patches: GenericWidget[] = [];
    const path: WidgetPath = [{ kind: 'children', index: 0 }];

    await act(async () => {
      root.render(
        <WidgetInspectorPanel
          parentWidget={{ type: 'stack' }}
          path={path}
          widget={{
            type: 'text',
            text: 'Floating label',
            left: 12,
            top: 16,
            right: 120,
            bottom: 180,
          }}
          onPatch={(next) => patches.push(next)}
        />,
      );
    });

    const leftInput = getInputByLabel(container, 'Left');
    expect(leftInput.value).toBe('12');

    await act(async () => {
      setInputValue(leftInput, '13');
    });

    expect(patches[patches.length - 1]).toMatchObject({
      type: 'text',
      text: 'Floating label',
      left: 13,
      top: 16,
      right: 120,
      bottom: 180,
    });

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const labelElement = Array.from(container.querySelectorAll('label')).find(
    (element) => element.textContent === label,
  );
  const inputId = labelElement?.getAttribute('for');
  const input = inputId
    ? container.querySelector<HTMLInputElement>(`input[id="${inputId}"]`)
    : null;

  if (!input) {
    throw new Error(`Expected input for label "${label}" to exist.`);
  }

  return input;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    input.ownerDocument.defaultView?.HTMLInputElement.prototype ?? HTMLInputElement.prototype,
    'value',
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
