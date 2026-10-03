// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import type {
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import { layoutWidget, type GenericWidget } from '@workbench-kit/jdw';
import {
  projectUiProportionalLayoutNodeV3,
  type UiProportionalLayoutProjectionStrategy,
} from '@workbench-kit/jdw/ui-authoring/v3';
import { BUILTIN_JDW_REGISTRY, renderCssLayoutTree } from './index.js';

let host: HTMLDivElement;
let mounted: Root;
function render(content: ReactNode) {
  host = document.createElement('div');
  document.body.append(host);
  mounted = createRoot(host);
  act(() => mounted.render(content));
}
afterEach(() => {
  if (mounted) act(() => mounted.unmount());
  host?.remove();
});
const px = (value: number) => ({ kind: 'length', unit: 'px', value });
const layoutProperties: UiLayoutPropertyDescriptor[] = [
  {
    id: 'place',
    scope: 'child',
    group: 'canvas',
    strategyKinds: ['canvas', 'flex'],
    value: { type: 'layout.canvas-placement' },
  },
  {
    id: 'part',
    scope: 'child',
    group: 'flex',
    strategyKinds: ['canvas', 'flex'],
    value: { type: 'layout.linear-child' },
  },
  {
    id: 'config',
    scope: 'container',
    group: 'flex',
    strategyKinds: ['flex'],
    value: { type: 'layout.flex-container' },
  },
];
const layoutStrategies: UiLayoutStrategyDescriptor[] = [
  {
    id: 'overlay',
    kind: 'canvas',
    supportedChildProperties: ['place', 'part'],
    supportedContainerProperties: [],
  },
  {
    id: 'row',
    kind: 'flex',
    supportedChildProperties: ['place', 'part'],
    supportedContainerProperties: ['config'],
  },
];
const strategies: UiProportionalLayoutProjectionStrategy[] = [
  {
    strategyId: 'overlay',
    mode: 'overlay',
    placementPropertyId: 'place',
    linearParticipationPropertyId: 'part',
  },
  {
    strategyId: 'row',
    mode: 'row',
    placementPropertyId: 'place',
    linearParticipationPropertyId: 'part',
    containerPropertyId: 'config',
  },
];
const context = { layoutProperties, layoutStrategies, strategies };
function authored(id: string, weight: number): GenericWidget {
  return {
    id,
    type: 'text',
    text: 'A😀\nB',
    fontSize: 20,
    fontWeight: 700,
    textMetricsMode: 'unicode-pre-line-v1',
    $authoring: {
      component: { id: 'test:text', version: '1' },
      properties: {},
      layout: {
        strategyId: 'overlay',
        values: {
          place: {
            kind: 'literal',
            value: {
              kind: 'canvas-placement',
              x: px(0),
              y: px(0),
              width: px(900),
              height: px(600),
              anchor: 'top-start',
              zIndex: 0,
            },
          },
          part: {
            kind: 'literal',
            value: { kind: 'linear-child', sizing: 'weighted', weight, fit: 'tight' },
          },
        },
      },
    },
  };
}
it('renders allocated proportional bounds, opt-in text and selection with one native viewport', () => {
  const children = [authored('a', 1), authored('b', 2)].map((node) =>
    projectUiProportionalLayoutNodeV3({ ...context, node, parentStrategyId: 'row' }),
  );
  const root = projectUiProportionalLayoutNodeV3({
    ...context,
    node: {
      id: 'root',
      type: 'container',
      $authoring: {
        component: { id: 'test:group', version: '1' },
        properties: {},
        layout: {
          strategyId: 'row',
          values: {
            config: {
              kind: 'literal',
              value: {
                kind: 'flex-container',
                direction: 'row',
                wrap: 'nowrap',
                mainAxisAlignment: 'start',
                crossAxisAlignment: 'stretch',
              },
            },
          },
        },
      },
    },
    projectedChildren: children,
    rootSize: { width: 90, height: 60 },
  });
  const tree = layoutWidget(
    root,
    { minWidth: 0, maxWidth: 90, minHeight: 0, maxHeight: 60 },
    undefined,
    { registry: BUILTIN_JDW_REGISTRY },
  );
  const selected: string[] = [];
  render(
    <>
      {renderCssLayoutTree(tree, {
        registry: BUILTIN_JDW_REGISTRY,
        nodeOverflow: (node) => (node.widget.id === 'root' ? 'auto' : 'hidden'),
        nodeSelection: (node) => ({
          selected: node.widget.id === 'a',
          label: `Select ${node.widget.id}`,
          onSelect: () => selected.push(String(node.widget.id)),
        }),
      })}
    </>,
  );
  const a = host.querySelector<HTMLElement>('[data-layout-node-id="a"]')!;
  const b = host.querySelector<HTMLElement>('[data-layout-node-id="b"]')!;
  expect(a.style.width).toBe('30px');
  expect(b.style.width).toBe('60px');
  expect(b.style.left).toBe('30px');
  expect(a.style.height).toBe('60px');
  expect(a.style.overflow).toBe('hidden');
  expect(host.querySelectorAll('[data-layout-scroll-viewport]')).toHaveLength(1);
  const text = Array.from(a.querySelectorAll<HTMLElement>('*')).find(
    (element) => element.style.whiteSpace === 'pre-wrap',
  )!;
  expect(text.textContent).toBe('A😀\nB');
  expect(text.style.lineHeight).toBe('1.35');
  expect(text.style.fontWeight).toBe('700');
  expect(text.style.width).toBe('100%');
  act(() => a.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(selected).toEqual(['a']);
});

it.each([
  ['start', 100, 27],
  ['stretch', 120, 13.5],
] as const)(
  'renders intrinsic text through two padded Columns at its effective %s width',
  (crossAxisAlignment, width, height) => {
    const tree = layoutWidget(
      {
        type: 'column',
        crossAxisAlignment: 'start',
        children: [
          {
            id: 'outer',
            type: 'column',
            width: 160,
            padding: 10,
            flexFit: 'tight',
            children: [
              {
                id: 'inner',
                type: 'column',
                width: 120,
                padding: 10,
                gap: 4,
                crossAxisAlignment,
                flexFit: 'tight',
                children: [
                  {
                    id: 'custom',
                    type: 'text',
                    text: 'x'.repeat(20),
                    fontSize: 10,
                    width: 100,
                    flexFit: 'tight',
                    textMetricsMode: 'unicode-pre-line-v1',
                  },
                  {
                    id: 'legacy',
                    type: 'text',
                    text: 'old',
                    fontSize: 10,
                    width: 100,
                    flexFit: 'tight',
                  },
                ],
              },
            ],
          },
        ],
      },
      { minWidth: 0, maxWidth: 480, minHeight: 0, maxHeight: 200 },
      undefined,
      { registry: BUILTIN_JDW_REGISTRY },
    );
    const outer = tree.children[0]!;
    const custom = outer.children[0]!.children[0]!;
    expect(custom.rect).toMatchObject({ width, height });
    expect(outer.rect.height).toBe(height + 13.5 + 4 + 40);
    render(<>{renderCssLayoutTree(tree, { registry: BUILTIN_JDW_REGISTRY })}</>);
    const viewport = host.querySelector<HTMLElement>('[data-layout-node-id="custom"]')!;
    expect(viewport.style.width).toBe(`${width}px`);
    expect(viewport.style.height).toBe(`${height}px`);
    expect(viewport.textContent).toBe('x'.repeat(20));
  },
);
