import type {
  UiCanvasPlacementValue,
  UiComponentDescriptor,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
  UiValueSource,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { layoutWidget, type LayoutNodeResult } from '../layout/layout-widget.js';
import { collectWidgetNodes, getWidgetChildren, type GenericWidget } from '../widget/tree.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import {
  createUiContainerLayoutCommandV3,
  projectUiLayoutNodeV3,
  type UiLayoutProjectionStrategy,
} from './ordered-layout.js';
import { applyAdmittedUiAuthoringSessionCommandV3 } from './semantic-admission-v3.js';
import {
  createUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
} from './session-v3.js';
import type { UiDocumentNodeV3 } from './types.js';

const layoutProperties: readonly UiLayoutPropertyDescriptor[] = [
  {
    id: 'placement',
    scope: 'child',
    group: 'canvas',
    strategyKinds: ['canvas', 'flex', 'grid'],
    value: { type: 'layout.canvas-placement', allowedSources: ['literal'] },
  },
  {
    id: 'gap',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex', 'grid'],
    value: { type: 'layout.dimension', allowedSources: ['literal'] },
  },
  {
    id: 'columns',
    scope: 'container',
    group: 'grid',
    strategyKinds: ['grid'],
    value: { type: 'layout.grid-tracks', allowedSources: ['literal'] },
  },
];
const layoutStrategies: readonly UiLayoutStrategyDescriptor[] = [
  {
    id: 'canvas',
    kind: 'canvas',
    supportedContainerProperties: [],
    supportedChildProperties: ['placement'],
  },
  {
    id: 'list.vertical.v1',
    kind: 'flex',
    supportedContainerProperties: ['gap'],
    supportedChildProperties: ['placement'],
  },
  {
    id: 'list.horizontal.v1',
    kind: 'flex',
    supportedContainerProperties: ['gap'],
    supportedChildProperties: ['placement'],
  },
  {
    id: 'grid.v1',
    kind: 'grid',
    supportedContainerProperties: ['gap', 'columns'],
    supportedChildProperties: ['placement'],
  },
];
const strategies: readonly UiLayoutProjectionStrategy[] = [
  { strategyId: 'canvas', mode: 'canvas', placementPropertyId: 'placement' },
  {
    strategyId: 'list.vertical.v1',
    mode: 'vertical-list',
    placementPropertyId: 'placement',
    gapPropertyId: 'gap',
  },
  {
    strategyId: 'list.horizontal.v1',
    mode: 'horizontal-list',
    placementPropertyId: 'placement',
    gapPropertyId: 'gap',
  },
  {
    strategyId: 'grid.v1',
    mode: 'grid',
    placementPropertyId: 'placement',
    gapPropertyId: 'gap',
    columnsPropertyId: 'columns',
  },
];
const context = { layoutProperties, layoutStrategies };
const projection = { ...context, strategies };
const px = (value: number) => ({ kind: 'length', value, unit: 'px' }) as const;
const gap = (value: number): UiValueSource => ({ kind: 'literal', value: px(value) });
const columns = (count: unknown): UiValueSource => ({
  kind: 'literal',
  value: {
    kind: 'grid-track-list',
    tracks: [
      { kind: 'grid-repeat', count, tracks: [{ kind: 'intrinsic-size', value: 'max-content' }] },
    ],
  },
});

function placement(
  width: number,
  height: number,
  x = 37,
  y = 53,
): UiValueSource<UiCanvasPlacementValue> {
  return {
    kind: 'literal',
    value: {
      kind: 'canvas-placement',
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      anchor: 'top-start',
      zIndex: 9,
    },
  };
}

function authored(
  id: string,
  strategyId = 'canvas',
  width = 100,
  height = 80,
  children?: readonly GenericWidget[],
): UiDocumentNodeV3 {
  return {
    id,
    type: children === undefined ? 'text' : 'freeform',
    text: id,
    $authoring: {
      component: { id: 'test:surface', version: '1' },
      properties: { title: { kind: 'literal', value: id } },
      layout: {
        strategyId,
        values: {
          placement: placement(width, height),
          ...(strategyId === 'canvas' ? {} : { gap: gap(16) }),
          ...(strategyId === 'grid.v1' ? { columns: columns(2) } : {}),
        },
      },
    },
    ...(children === undefined ? {} : { children }),
  };
}

function withValues(
  node: UiDocumentNodeV3,
  values: Readonly<Record<string, UiValueSource>>,
): UiDocumentNodeV3 {
  return {
    ...node,
    $authoring: {
      ...node.$authoring,
      layout: {
        ...node.$authoring.layout!,
        values: { ...node.$authoring.layout!.values, ...values },
      },
    },
  };
}

function projectTree(
  node: GenericWidget,
  parentStrategyId?: string,
  rootSize?: { width: number; height: number },
): GenericWidget {
  const strategyId = readUiDocumentNodeAuthoringV3(node)?.layout?.strategyId;
  return projectUiLayoutNodeV3({
    ...projection,
    node,
    parentStrategyId,
    rootSize,
    ...(Array.isArray(node.children)
      ? {
          projectedChildren: getWidgetChildren(node).map((child) => projectTree(child, strategyId)),
        }
      : {}),
  });
}

function byId(root: LayoutNodeResult, id: string): LayoutNodeResult {
  if (root.widget.id === id) return root;
  for (const child of root.children) {
    try {
      return byId(child, id);
    } catch {
      /* Search the remaining branches. */
    }
  }
  throw new Error(`Missing layout node ${id}`);
}

const mixedChildren = () => [
  authored('image', 'canvas', 120, 70),
  authored('note', 'canvas', 80, 110),
  authored('missing-template', 'canvas', 60, 40),
];

describe('V3 parent-aware ordered projection', () => {
  it('keeps legacy canvas geometry, render type and caller metadata', () => {
    const source = {
      ...authored('leaf', 'canvas', 80, 40),
      type: 'custom-renderer',
      selectionNodeId: 'leaf',
      hostMetadata: { profile: 'image-v1' },
    };
    const projected = projectUiLayoutNodeV3({
      ...projection,
      node: source,
      parentStrategyId: 'canvas',
    });
    expect(projected).toMatchObject({
      id: 'leaf',
      type: 'custom-renderer',
      left: 37,
      top: 53,
      width: 80,
      height: 40,
      zIndex: 9,
      selectionNodeId: 'leaf',
    });
    expect(projected.$authoring).toBe(source.$authoring);
    expect(projected.hostMetadata).toBe(source.hostMetadata);
    const root = projectUiLayoutNodeV3({
      ...projection,
      node: authored('root', 'canvas', 1, 1, []),
      projectedChildren: [projected],
      rootSize: { width: 500, height: 300 },
    });
    expect(byId(layoutWidget(root), 'leaf').rect).toEqual({ x: 37, y: 53, width: 80, height: 40 });
  });

  it.each([
    [
      'list.vertical.v1',
      2,
      120,
      362,
      [
        [0, 0],
        [0, 126],
        [0, 252],
      ],
    ],
    [
      'list.horizontal.v1',
      2,
      392,
      110,
      [
        [0, 0],
        [136, 0],
        [272, 0],
      ],
    ],
    [
      'grid.v1',
      1,
      120,
      362,
      [
        [0, 0],
        [0, 126],
        [0, 252],
      ],
    ],
    [
      'grid.v1',
      2,
      256,
      236,
      [
        [0, 0],
        [136, 0],
        [0, 126],
      ],
    ],
    [
      'grid.v1',
      6,
      800,
      110,
      [
        [0, 0],
        [136, 0],
        [272, 0],
      ],
    ],
  ] as const)(
    'uses global equal slots for %s with %i columns',
    (strategyId, count, contentWidth, contentHeight, origins) => {
      const node = withValues(
        authored('ordered', strategyId, 90, 60, mixedChildren()),
        strategyId === 'grid.v1' ? { columns: columns(count) } : {},
      );
      const source = formatWidgetDocumentJson(node);
      const projected = projectTree(node, 'canvas');
      const layout = layoutWidget(projected);
      expect(layout.rect).toMatchObject({ width: 90, height: 60 });
      expect(layout.children[0]?.rect).toMatchObject({
        width: contentWidth,
        height: contentHeight,
      });
      mixedChildren().forEach((child, index) => {
        const [x, y] = origins[index]!;
        expect(byId(layout, child.id).rect).toEqual({
          x,
          y,
          width: [120, 80, 60][index],
          height: [70, 110, 40][index],
        });
      });
      expect(formatWidgetDocumentJson(node)).toBe(source);
      expect(
        collectWidgetNodes(projected)
          .filter(({ widget }) => widget.id !== undefined)
          .map(({ widget }) => widget.id),
      ).toEqual(['ordered', 'image', 'note', 'missing-template']);
      for (const { widget } of collectWidgetNodes(projected).filter(
        ({ widget }) => widget.id === undefined,
      )) {
        expect(widget.$authoring).toBeUndefined();
        expect(widget.selectionNodeId).toBeUndefined();
      }
    },
  );

  it.each(['list.vertical.v1', 'list.horizontal.v1', 'grid.v1'])(
    'keeps empty %s extent zero and distinguishes it from a leaf',
    (strategyId) => {
      const node = authored('empty', strategyId, 100, 80, []);
      const container = projectTree(node, 'canvas');
      expect(getWidgetChildren(container)).toHaveLength(1);
      expect(getWidgetChildren(container)[0]).toMatchObject({ width: 0, height: 0, children: [] });
      const leaf = projectUiLayoutNodeV3({ ...projection, node, parentStrategyId: 'canvas' });
      expect(leaf.type).toBe('freeform');
      expect(leaf.children).toBeUndefined();
    },
  );

  it.each(['list.vertical.v1', 'list.horizontal.v1', 'grid.v1'])(
    'preserves one-child size and viewport-independent extent for %s',
    (strategyId) => {
      const node = authored('ordered', strategyId, 500, 600, [authored('only', 'canvas', 40, 30)]);
      const large = layoutWidget(projectTree(node, 'canvas'));
      const small = layoutWidget(
        projectTree(withValues(node, { placement: placement(10, 10) }), 'canvas'),
      );
      expect(byId(large, 'only').rect).toEqual({ x: 0, y: 0, width: 40, height: 30 });
      expect(small.children[0]?.rect).toEqual(large.children[0]?.rect);
    },
  );

  it('separates canvas participation from nested container arrangement', () => {
    const nestedCanvas = authored('inner-canvas', 'canvas', 200, 100, [
      authored('inner-leaf', 'canvas', 25, 20),
    ]);
    const nestedGrid = authored('inner-grid', 'grid.v1', 70, 40, [
      authored('grid-leaf', 'canvas', 30, 15),
    ]);
    const ordered = authored('ordered', 'list.vertical.v1', 300, 180, [nestedCanvas, nestedGrid]);
    const root = authored('root', 'canvas', 1, 1, [ordered]);
    const layout = layoutWidget(projectTree(root, undefined, { width: 600, height: 400 }));
    expect(byId(layout, 'ordered').rect).toEqual({ x: 37, y: 53, width: 300, height: 180 });
    expect(byId(layout, 'inner-canvas').rect).toEqual({ x: 37, y: 53, width: 200, height: 100 });
    expect(byId(layout, 'inner-leaf').rect).toEqual({ x: 74, y: 106, width: 25, height: 20 });
    expect(byId(layout, 'inner-grid').rect).toEqual({ x: 37, y: 169, width: 70, height: 40 });
    expect(byId(layout, 'grid-leaf').rect).toEqual({ x: 37, y: 169, width: 30, height: 15 });
  });

  it('fills an instance viewport with its expanded root, independently of the outer ordered coordinates', () => {
    const definition = authored('derived-definition', 'canvas', 800, 900, [
      authored('derived-leaf', 'canvas', 20, 15),
    ]);
    const expanded = projectTree(definition, 'list.vertical.v1', { width: 120, height: 70 });
    const instance = projectUiLayoutNodeV3({
      ...projection,
      node: {
        ...authored('instance', 'canvas', 120, 70),
        type: 'stack',
        ref: 'saved-card',
        overrides: { title: 'Mine' },
      },
      projectedChildren: [expanded],
      parentStrategyId: 'list.vertical.v1',
    });
    const parent = projectUiLayoutNodeV3({
      ...projection,
      node: authored('ordered', 'list.vertical.v1', 60, 40, []),
      projectedChildren: [instance],
      parentStrategyId: 'canvas',
    });
    const layout = layoutWidget(parent);
    expect(byId(layout, 'derived-definition').rect).toEqual({ x: 0, y: 0, width: 120, height: 70 });
    expect(byId(layout, 'derived-leaf').rect).toEqual({ x: 37, y: 53, width: 20, height: 15 });
    expect(byId(layout, 'instance').widget).toMatchObject({
      ref: 'saved-card',
      overrides: { title: 'Mine' },
    });
    const atomicRoot = {
      ...authored('atomic-root'),
      $authoring: { component: { id: 'test:surface', version: '1' }, properties: {} },
    };
    expect(
      projectUiLayoutNodeV3({
        ...projection,
        node: atomicRoot,
        rootSize: { width: 120, height: 70 },
      }),
    ).toMatchObject({ left: 0, top: 0, width: 120, height: 70 });
  });

  it.each([-1, 0.5, NaN, Infinity])('rejects invalid gap %s without coercion', (value) => {
    expect(() =>
      projectTree(
        withValues(authored('bad', 'list.vertical.v1', 100, 80, []), { gap: gap(value) }),
      ),
    ).toThrow(TypeError);
  });

  it.each([0, -1, 1.5, NaN, Infinity, '2', 'auto-fill', 'auto-fit'])(
    'rejects invalid grid count %s',
    (count) => {
      expect(() =>
        projectTree(
          withValues(authored('bad', 'grid.v1', 100, 80, []), { columns: columns(count) }),
        ),
      ).toThrow(TypeError);
    },
  );

  it.each([
    { kind: 'grid-track-list', tracks: [{ kind: 'intrinsic-size', value: 'max-content' }] },
    {
      kind: 'grid-track-list',
      extra: true,
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          tracks: [{ kind: 'intrinsic-size', value: 'max-content' }],
        },
      ],
    },
    {
      kind: 'grid-track-list',
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          extra: true,
          tracks: [{ kind: 'intrinsic-size', value: 'max-content' }],
        },
      ],
    },
    {
      kind: 'grid-track-list',
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          tracks: [{ kind: 'intrinsic-size', value: 'max-content', extra: true }],
        },
      ],
    },
    {
      kind: 'grid-track-list',
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          tracks: [{ kind: 'intrinsic-size', value: 'min-content' }],
        },
      ],
    },
    { kind: 'grid-track-list', tracks: [{ kind: 'grid-repeat', count: 2, tracks: [px(100)] }] },
    {
      kind: 'grid-track-list',
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          tracks: [
            { kind: 'intrinsic-size', value: 'max-content' },
            { kind: 'intrinsic-size', value: 'max-content' },
          ],
        },
      ],
    },
    {
      kind: 'grid-track-list',
      tracks: [
        {
          kind: 'grid-repeat',
          count: 2,
          tracks: [{ kind: 'intrinsic-size', value: 'max-content' }],
        },
        px(100),
      ],
    },
  ])('rejects unsupported grid shape %#', (value) => {
    expect(() =>
      projectTree(
        withValues(authored('bad', 'grid.v1', 100, 80, []), {
          columns: { kind: 'literal', value },
        }),
      ),
    ).toThrow(TypeError);
  });

  it.each([
    { kind: 'length', value: 16, unit: 'rem' },
    { kind: 'length', value: '16', unit: 'px' },
    { kind: 'length', value: 16, unit: 'px', extra: true },
    { kind: 'percentage', value: 16 },
  ])('rejects unsupported gap shape %#', (value) => {
    expect(() =>
      projectTree(
        withValues(authored('bad', 'list.vertical.v1', 100, 80, []), {
          gap: { kind: 'literal', value },
        }),
      ),
    ).toThrow(TypeError);
  });

  it('rejects unknown, duplicated or wrong-scope mappings and invalid geometry', () => {
    const node = authored('node');
    expect(() => projectUiLayoutNodeV3({ ...projection, node, strategies: [] })).toThrow(TypeError);
    expect(() =>
      projectUiLayoutNodeV3({ ...projection, node, strategies: [...strategies, strategies[0]!] }),
    ).toThrow(TypeError);
    expect(() =>
      projectUiLayoutNodeV3({ ...projection, node, parentStrategyId: 'unknown' }),
    ).toThrow(TypeError);
    expect(() =>
      projectUiLayoutNodeV3({ ...projection, node, rootSize: { width: Infinity, height: 80 } }),
    ).toThrow(TypeError);
    expect(() => projectTree(authored('bad', 'canvas', 0, 80))).toThrow(TypeError);
    expect(() =>
      projectTree(
        authored('bad', 'list.horizontal.v1', 100, 80, [
          authored('a', 'canvas', Number.MAX_VALUE, 10),
          authored('b', 'canvas', Number.MAX_VALUE, 10),
        ]),
      ),
    ).toThrow(TypeError);
    expect(() =>
      projectUiLayoutNodeV3({
        ...projection,
        node,
        layoutStrategies: [
          {
            ...layoutStrategies[0]!,
            supportedContainerProperties: ['placement'],
            supportedChildProperties: [],
          },
        ],
      }),
    ).toThrow(TypeError);
  });

  it.each([
    ['flex', 1],
    ['flex', undefined],
    ['flexFit', 'tight'],
    ['flexFit', 'loose'],
    ['flexFit', undefined],
  ] as const)(
    'rejects own raw %s=%s on the input node or projected child without mutation',
    (key, value) => {
      const metadata = { selected: true };
      const node = { ...authored('node'), [key]: value, metadata };
      const before = { ...node };
      expect(() =>
        projectUiLayoutNodeV3({ ...projection, node, parentStrategyId: 'canvas' }),
      ).toThrow(/Raw flex\/flexFit/);
      expect(node).toEqual(before);
      expect(node.metadata).toBe(metadata);
      const child = { ...projectTree(authored('child'), 'canvas'), [key]: value, metadata };
      const beforeChild = { ...child };
      for (const strategyId of ['canvas', 'list.vertical.v1', 'grid.v1']) {
        const parent = authored('parent', strategyId, 120, 80, []);
        expect(() =>
          projectUiLayoutNodeV3({
            ...projection,
            node: parent,
            projectedChildren: [child],
            parentStrategyId: 'canvas',
          }),
        ).toThrow(/Raw flex\/flexFit/);
      }
      expect(child).toEqual(beforeChild);
      expect(child.metadata).toBe(metadata);
    },
  );

  it.each(['child', 'container'] as const)(
    'rejects an otherwise valid unmapped %s value',
    (scope) => {
      const extra: UiLayoutPropertyDescriptor = {
        id: 'unmapped',
        scope,
        group: 'sizing',
        strategyKinds: ['flex'],
        value: { type: 'layout.dimension' },
      };
      const extended = {
        ...projection,
        layoutProperties: [...layoutProperties, extra],
        layoutStrategies: layoutStrategies.map((strategy) =>
          strategy.id === 'list.vertical.v1'
            ? {
                ...strategy,
                supportedChildProperties: [
                  ...strategy.supportedChildProperties,
                  ...(scope === 'child' ? [extra.id] : []),
                ],
                supportedContainerProperties: [
                  ...strategy.supportedContainerProperties,
                  ...(scope === 'container' ? [extra.id] : []),
                ],
              }
            : strategy,
        ),
      };
      const node = withValues(authored('ordered', 'list.vertical.v1', 120, 80, []), {
        unmapped: gap(20),
      });
      const before = formatWidgetDocumentJson(node);
      expect(() =>
        projectUiLayoutNodeV3({
          ...extended,
          node,
          projectedChildren: [],
          parentStrategyId: 'canvas',
        }),
      ).toThrow(/not consumed/);
      expect(formatWidgetDocumentJson(node)).toBe(before);
    },
  );

  it('rejects a mapped columns value when the selected mode does not consume columns', () => {
    const node = authored('ordered', 'grid.v1', 120, 80, []);
    expect(() =>
      projectUiLayoutNodeV3({
        ...projection,
        node,
        projectedChildren: [],
        strategies: strategies.map((mapping) =>
          mapping.strategyId === 'grid.v1'
            ? { ...mapping, mode: 'vertical-list' as const }
            : mapping,
        ),
      }),
    ).toThrow(/not consumed/);
  });

  it('keeps ordinary fixed-size projection free of flex overrides and existing ratio layout intact', () => {
    const projected = projectTree(
      authored('ordered', 'grid.v1', 120, 80, mixedChildren()),
      'canvas',
    );
    for (const { widget } of collectWidgetNodes(projected)) {
      expect(Object.prototype.hasOwnProperty.call(widget, 'flex')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(widget, 'flexFit')).toBe(false);
    }
    const ratio = layoutWidget(
      {
        type: 'row',
        children: [
          { type: 'text', flex: 1, flexFit: 'tight' },
          { type: 'text', flex: 2, flexFit: 'tight' },
        ],
      },
      { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 60 },
    );
    expect(ratio.children.map((child) => child.rect)).toEqual([
      { x: 0, y: 0, width: 100, height: 60 },
      { x: 100, y: 0, width: 200, height: 60 },
    ]);
  });
});

describe('scope-preserving container layout commands', () => {
  const build = (
    node: UiDocumentNodeV3,
    targetStrategyId: string,
    containerValues: Readonly<Record<string, UiValueSource>>,
  ) =>
    createUiContainerLayoutCommandV3({
      ...context,
      nodeId: node.id,
      commandId: 'change-layout',
      currentLayout: node.$authoring.layout,
      targetStrategyId,
      containerValues,
    });

  it('roundtrips modes while retaining every child-scoped value and replacing container values', () => {
    const node = authored('ordered', 'grid.v1', 120, 70, mixedChildren());
    const before = formatWidgetDocumentJson(node);
    const toList = build(node, 'list.horizontal.v1', { gap: gap(24) })!;
    expect(toList.values).toEqual({
      placement: node.$authoring.layout!.values.placement,
      gap: gap(24),
    });
    expect(toList.values.placement).not.toBe(node.$authoring.layout!.values.placement);
    const list = {
      ...node,
      $authoring: {
        ...node.$authoring,
        layout: { strategyId: toList.strategyId, values: toList.values },
      },
    };
    const toGrid = build(list, 'grid.v1', { gap: toList.values.gap!, columns: columns(2) })!;
    expect(toGrid.values).toEqual({
      placement: node.$authoring.layout!.values.placement,
      gap: gap(24),
      columns: columns(2),
    });
    expect(formatWidgetDocumentJson(node)).toBe(before);
    expect(Object.isFrozen(toGrid.values)).toBe(true);
  });

  it('preserves all descriptor-declared child fields, rather than only the mapped placement', () => {
    const other: UiLayoutPropertyDescriptor = {
      id: 'child-size',
      scope: 'child',
      group: 'sizing',
      strategyKinds: ['flex', 'grid'],
      value: { type: 'layout.dimension' },
    };
    const extended = {
      layoutProperties: [...layoutProperties, other],
      layoutStrategies: layoutStrategies.map((strategy) =>
        strategy.id === 'canvas'
          ? strategy
          : {
              ...strategy,
              supportedChildProperties: [...strategy.supportedChildProperties, other.id],
            },
      ),
    };
    const node = withValues(authored('ordered', 'grid.v1'), { 'child-size': gap(25) });
    const command = createUiContainerLayoutCommandV3({
      ...extended,
      nodeId: node.id,
      commandId: 'switch',
      currentLayout: node.$authoring.layout,
      targetStrategyId: 'list.vertical.v1',
      containerValues: { gap: gap(8) },
    });
    expect(command?.values['child-size']).toEqual(gap(25));
    expect(command?.values.columns).toBeUndefined();
    expect(() =>
      projectUiLayoutNodeV3({ ...projection, ...extended, node, projectedChildren: [] }),
    ).toThrow(/not consumed/);
  });

  it('applies one admitted set-layout history step with identity, order and metadata unchanged', () => {
    const node = authored('ordered', 'grid.v1', 120, 70, mixedChildren());
    const root = {
      ...authored('root', 'canvas', 500, 400, [node]),
      $authoring: { ...authored('root').$authoring, documentSchemaVersion: 3 as const },
    };
    const document = createUiDocumentV3('ordered-layout', formatWidgetDocumentJson(root)).document!;
    expect(document).not.toBeNull();
    const component: UiComponentDescriptor = {
      id: 'test:surface',
      version: '1',
      kind: 'composite',
      compositionRef: 'test:surface',
      properties: [{ id: 'title', value: { type: 'string' } }],
      layout: {
        supportedStrategyIds: layoutStrategies.map((strategy) => strategy.id),
        childSlots: [
          {
            id: 'children',
            cardinality: 'many',
            allowedComponents: [{ id: 'test:surface', version: '1' }],
          },
        ],
      },
      designTime: { label: 'Surface' },
    };
    const admission = {
      ...context,
      componentCatalog: { components: () => [component], component: () => component },
    };
    const state = createUiAuthoringSessionV3(document, ['ordered']);
    const command = build(node, 'list.vertical.v1', { gap: gap(16) })!;
    const applied = applyAdmittedUiAuthoringSessionCommandV3(state, command, admission);
    expect(applied.status).toBe('applied');
    expect(applied.state.past).toHaveLength(1);
    expect(applied.state.selectedNodeIds).toEqual(['ordered']);
    const changed = collectWidgetNodes(applied.state.document.root).find(
      ({ widget }) => widget.id === 'ordered',
    )!.widget;
    expect(getWidgetChildren(changed)).toEqual(getWidgetChildren(node));
    expect(readUiDocumentNodeAuthoringV3(changed)?.properties).toEqual(node.$authoring.properties);
    expect(readUiDocumentNodeAuthoringV3(changed)?.layout?.values.placement).toEqual(
      node.$authoring.layout!.values.placement,
    );
    expect(undoUiAuthoringSessionV3(applied.state)?.document).toEqual(document);
    expect(redoUiAuthoringSessionV3(undoUiAuthoringSessionV3(applied.state)!)?.document).toEqual(
      applied.state.document,
    );
    expect(applyAdmittedUiAuthoringSessionCommandV3(applied.state, command, admission).state).toBe(
      applied.state,
    );
  });

  it('returns null for invalid targets, cross-scope edits, unsupported preserved fields and invalid literals', () => {
    const node = authored('ordered', 'grid.v1');
    expect(build(node, 'unknown', {})).toBeNull();
    expect(
      build(node, 'list.vertical.v1', { placement: placement(1, 1), gap: gap(16) }),
    ).toBeNull();
    expect(build(node, 'list.vertical.v1', { columns: columns(2) })).toBeNull();
    expect(build(node, 'grid.v1', { gap: gap(16), columns: columns(0) })).toBeNull();
    expect(build(node, 'grid.v1', { gap: gap(NaN), columns: columns(2) })).toBeNull();
    expect(build(node, 'grid.v1', { gap: { kind: 'literal', value: 16 } })).toBeNull();
    expect(
      build(withValues(node, { undeclared: gap(2) }), 'list.vertical.v1', { gap: gap(16) }),
    ).toBeNull();
    expect(
      createUiContainerLayoutCommandV3({
        ...context,
        nodeId: ' ',
        commandId: 'change',
        currentLayout: node.$authoring.layout,
        targetStrategyId: 'canvas',
        containerValues: {},
      }),
    ).toBeNull();
    expect(
      createUiContainerLayoutCommandV3({
        ...context,
        nodeId: node.id,
        commandId: 'change',
        currentLayout: node.$authoring.layout,
        targetStrategyId: 'list.vertical.v1',
        containerValues: { gap: gap(16) },
        layoutStrategies: layoutStrategies.map((strategy) => ({
          ...strategy,
          supportedChildProperties: [],
        })),
      }),
    ).toBeNull();
  });
});
