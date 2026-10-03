import type {
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
  UiLinearChildValue,
  UiValueSource,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { layoutWidget, type LayoutNodeResult } from '../layout/layout-widget.js';
import { createWidgetRegistry } from '../widget/registry.js';
import { getWidgetChildren, type GenericWidget } from '../widget/tree.js';
import { readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { createUiContainerLayoutCommandV3, projectUiLayoutNodeV3 } from './ordered-layout.js';
import {
  projectUiProportionalLayoutNodeV3,
  type UiProportionalLayoutProjectionStrategy,
} from './proportional-layout.js';

const modes = ['overlay', 'row', 'column', 'vertical-list', 'horizontal-list', 'grid'] as const;
const kinds = ['canvas', 'flex', 'grid'];
const layoutProperties: UiLayoutPropertyDescriptor[] = [
  {
    id: 'place',
    scope: 'child',
    group: 'canvas',
    strategyKinds: kinds,
    value: { type: 'layout.canvas-placement' },
  },
  {
    id: 'participation',
    scope: 'child',
    group: 'flex',
    strategyKinds: kinds,
    value: { type: 'layout.linear-child' },
  },
  {
    id: 'config',
    scope: 'container',
    group: 'flex',
    strategyKinds: ['flex'],
    value: { type: 'layout.flex-container' },
  },
  {
    id: 'gap',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex', 'grid'],
    value: { type: 'layout.dimension' },
  },
  {
    id: 'padding',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex'],
    value: { type: 'layout.dimension' },
  },
  {
    id: 'columns',
    scope: 'container',
    group: 'grid',
    strategyKinds: ['grid'],
    value: { type: 'layout.grid-tracks' },
  },
];
const layoutStrategies: UiLayoutStrategyDescriptor[] = modes.map((mode) => ({
  id: mode,
  kind: mode === 'overlay' ? 'canvas' : mode === 'grid' ? 'grid' : 'flex',
  supportedChildProperties: ['place', 'participation'],
  supportedContainerProperties:
    mode === 'overlay'
      ? []
      : mode === 'grid'
        ? ['gap', 'columns']
        : mode === 'row' || mode === 'column'
          ? ['gap', 'padding', 'config']
          : ['gap'],
}));
const strategies: UiProportionalLayoutProjectionStrategy[] = modes.map((mode) => ({
  strategyId: mode,
  mode,
  placementPropertyId: 'place',
  linearParticipationPropertyId: 'participation',
  ...(mode === 'overlay' ? {} : { gapPropertyId: 'gap' }),
  ...(mode === 'row' || mode === 'column'
    ? { containerPropertyId: 'config', paddingPropertyId: 'padding' }
    : {}),
  ...(mode === 'grid' ? { columnsPropertyId: 'columns' } : {}),
}));
const context = { layoutProperties, layoutStrategies, strategies };
const px = (value: number) => ({ kind: 'length', value, unit: 'px' }) as const;
const lit = (value: unknown): UiValueSource => ({ kind: 'literal', value });
const ratio = (weight: number, fit: 'tight' | 'loose' = 'tight'): UiLinearChildValue => ({
  kind: 'linear-child',
  sizing: 'weighted',
  weight,
  fit,
});
const placement = (width = 100, height = 30) =>
  lit({
    kind: 'canvas-placement',
    x: px(7),
    y: px(11),
    width: px(width),
    height: px(height),
    anchor: 'top-start',
    zIndex: 2,
  });
const columns = () =>
  lit({
    kind: 'grid-track-list',
    tracks: [
      { kind: 'grid-repeat', count: 2, tracks: [{ kind: 'intrinsic-size', value: 'max-content' }] },
    ],
  });
function containerValues(mode: (typeof modes)[number], main = 'start', cross = 'stretch') {
  return mode === 'overlay'
    ? {}
    : {
        gap: lit(px(0)),
        ...(mode === 'grid' ? { columns: columns() } : {}),
        ...(mode === 'row' || mode === 'column'
          ? {
              padding: lit(px(0)),
              config: lit({
                kind: 'flex-container',
                direction: mode,
                wrap: 'nowrap',
                mainAxisAlignment: main,
                crossAxisAlignment: cross,
              }),
            }
          : {}),
      };
}
function node(
  id: string,
  mode: (typeof modes)[number] = 'overlay',
  children?: GenericWidget[],
  values: Record<string, UiValueSource> = {},
): GenericWidget {
  return {
    id,
    type: 'text',
    text: id,
    $authoring: {
      component: { id: 'test:node', version: '1' },
      properties: {},
      layout: {
        strategyId: mode,
        values: { place: placement(), ...containerValues(mode), ...values },
      },
    },
    ...(children === undefined ? {} : { children }),
  };
}
function project(
  root: GenericWidget,
  parentStrategyId?: string,
  rootSize?: { width: number; height: number },
): GenericWidget {
  return projectUiProportionalLayoutNodeV3({
    ...context,
    node: root,
    parentStrategyId,
    rootSize,
    ...(Array.isArray(root.children)
      ? {
          projectedChildren: getWidgetChildren(root).map((child) =>
            project(child, readUiDocumentNodeAuthoringV3(root)?.layout?.strategyId),
          ),
        }
      : {}),
  });
}
function layout(root: GenericWidget, width = 300, height = 120) {
  return layoutWidget(project(root, undefined, { width, height }), {
    minWidth: 0,
    maxWidth: width,
    minHeight: 0,
    maxHeight: height,
  });
}
function byId(root: LayoutNodeResult, id: string): LayoutNodeResult {
  if (root.widget.id === id) return root;
  for (const child of root.children) {
    try {
      return byId(child, id);
    } catch {
      /* Continue. */
    }
  }
  throw new Error(`Missing ${id}`);
}

describe('proportional V3 adapter', () => {
  it('allocates 1:2 and nested Row→Column from finite instance constraints without mutation', () => {
    const root = node('root', 'row', [
      node('one', 'overlay', undefined, {
        participation: lit(ratio(1)),
        place: placement(900, 30),
      }),
      node(
        'two',
        'column',
        [
          node('a', 'overlay', undefined, { participation: lit(ratio(1)) }),
          node('b', 'overlay', undefined, { participation: lit(ratio(2)) }),
        ],
        { participation: lit(ratio(2)), place: placement(800, 700) },
      ),
    ]);
    const before = JSON.stringify(root);
    const result = layout(root);
    expect(byId(result, 'one').rect).toEqual({ x: 0, y: 0, width: 100, height: 120 });
    expect(byId(result, 'two').rect).toEqual({ x: 100, y: 0, width: 200, height: 120 });
    expect(byId(result, 'a').rect).toEqual({ x: 100, y: 0, width: 200, height: 40 });
    expect(byId(result, 'b').rect).toEqual({ x: 100, y: 40, width: 200, height: 80 });
    expect(JSON.stringify(root)).toBe(before);
    expect(byId(result, 'two').widget.$authoring).toBe(getWidgetChildren(root)[1]!.$authoring);
  });

  it('uses fixed preferred basis, measured intrinsic main basis and loose preferred caps', () => {
    const registry = createWidgetRegistry<unknown>();
    registry.bind({
      type: 'text',
      measure: () => ({ width: 25, height: 17 }),
      build: null,
    });
    const root = node('root', 'row', [
      node('fixed', 'overlay', undefined, { place: placement(40, 20) }),
      node('intrinsic', 'overlay', undefined, {
        place: placement(200, 20),
        participation: lit({ kind: 'linear-child', sizing: 'intrinsic' }),
      }),
      node('loose', 'overlay', undefined, {
        place: placement(200, 20),
        participation: lit(ratio(1, 'loose')),
      }),
    ]);
    const result = layoutWidget(
      project(root, undefined, { width: 100, height: 60 }),
      { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 60 },
      undefined,
      { registry },
    );
    expect(result.children.map((child) => child.rect)).toEqual([
      { x: 0, y: 0, width: 40, height: 60 },
      { x: 40, y: 0, width: 25, height: 60 },
      { x: 65, y: 0, width: 35, height: 60 },
    ]);
    const small = node('root', 'row', [
      node('small', 'overlay', undefined, {
        place: placement(20, 10),
        participation: lit(ratio(1, 'loose')),
      }),
    ]);
    expect(layout(small, 50, 40).children[0]?.rect).toEqual({ x: 0, y: 0, width: 20, height: 40 });
  });

  it('recursively estimates intrinsic groups with gap and padding using the existing engine', () => {
    const group = node(
      'group',
      'row',
      [
        node('a', 'overlay', undefined, { place: placement(20, 5) }),
        node('b', 'overlay', undefined, { place: placement(30, 5) }),
      ],
      {
        participation: lit({ kind: 'linear-child', sizing: 'intrinsic' }),
        gap: lit(px(4)),
        padding: lit(px(3)),
      },
    );
    expect(
      byId(
        layout(
          node('root', 'row', [
            group,
            node('rest', 'overlay', undefined, { participation: lit(ratio(1)) }),
          ]),
        ),
        'group',
      ).rect.width,
    ).toBe(60);
  });

  it.each([
    ['start', [0, 20]],
    ['center', [30, 50]],
    ['end', [60, 80]],
    ['space-between', [0, 80]],
    ['space-around', [15, 65]],
    ['space-evenly', [20, 60]],
  ])('maps main alignment %s', (main, xs) => {
    const root = node(
      'root',
      'row',
      [
        node('a', 'overlay', undefined, { place: placement(20, 10) }),
        node('b', 'overlay', undefined, { place: placement(20, 10) }),
      ],
      containerValues('row', main as string, 'start'),
    );
    expect(layout(root, 100, 40).children.map((child) => child.rect.x)).toEqual(xs);
  });

  it.each([
    ['start', 0, 10],
    ['center', 15, 10],
    ['end', 30, 10],
    ['stretch', 0, 40],
  ])('maps cross alignment %s', (cross, y, height) => {
    const root = node(
      'root',
      'row',
      [node('child', 'overlay', undefined, { place: placement(20, 10) })],
      containerValues('row', 'start', cross as string),
    );
    expect(layout(root, 100, 40).children[0]?.rect).toEqual({ x: 0, y, width: 20, height });
  });

  it('subtracts only authored gap/padding and retains column loose preferred caps', () => {
    const row = node(
      'root',
      'row',
      [
        node('a', 'overlay', undefined, { participation: lit(ratio(1)) }),
        node('b', 'overlay', undefined, { participation: lit(ratio(2)) }),
      ],
      { gap: lit(px(10)), padding: lit(px(10)) },
    );
    expect(layout(row, 300, 120).children.map((child) => child.rect)).toEqual([
      { x: 10, y: 10, width: 90, height: 100 },
      { x: 110, y: 10, width: 180, height: 100 },
    ]);
    const column = node(
      'root',
      'column',
      [
        node('loose', 'overlay', undefined, {
          place: placement(10, 200),
          participation: lit(ratio(1, 'loose')),
        }),
      ],
      containerValues('column', 'start', 'end'),
    );
    expect(layout(column, 40, 50).children[0]?.rect).toEqual({
      x: 30,
      y: 0,
      width: 10,
      height: 50,
    });
  });

  it('keeps fixed overflow and zero remaining allocations; oversized padding origins stay clipped', () => {
    const root = node(
      'root',
      'row',
      [node('fixed'), node('weighted', 'overlay', undefined, { participation: lit(ratio(1)) })],
      { gap: lit(px(64)), padding: lit(px(64)) },
    );
    const result = layout(root, 0, 0);
    expect(result.children.map((child) => child.rect)).toEqual([
      { x: 64, y: 64, width: 100, height: 0 },
      { x: 228, y: 64, width: 0, height: 0 },
    ]);
  });

  it('preserves caller metadata while removing raw projection geometry and tree edges', () => {
    const authoredNode = node('original');
    const source: GenericWidget = {
      ...node('leaf'),
      authoredNode,
      provenance: { source: 'definition' },
      right: 22,
      bottom: 31,
      align: 'end',
      col: 3,
      child: node('ignored'),
      width: 999,
      height: 888,
    };
    const result = project(source, 'overlay');
    expect(result).toMatchObject({ left: 7, top: 11, width: 100, height: 30, zIndex: 2 });
    expect(result.authoredNode).toBe(authoredNode);
    expect(result.provenance).toBe(source.provenance);
    expect(result.$authoring).toBe(source.$authoring);
    for (const key of ['right', 'bottom', 'align', 'col', 'children', 'child'])
      expect(result[key]).toBeUndefined();
  });

  it('delegates equal slots, preserving dormant participation through Row→Grid→Row', () => {
    const kids = [
      node('a', 'column', [node('inside')], {
        place: placement(40, 20),
        participation: lit(ratio(1)),
      }),
      node('b', 'overlay', undefined, { place: placement(20, 30), participation: lit(ratio(2)) }),
    ];
    const row = node('root', 'row', kids, { participation: lit(ratio(3)) });
    const change = (source: GenericWidget, mode: 'row' | 'grid') => {
      const command = createUiContainerLayoutCommandV3({
        ...context,
        nodeId: 'root',
        commandId: `to-${mode}`,
        currentLayout: readUiDocumentNodeAuthoringV3(source)!.layout,
        targetStrategyId: mode,
        containerValues: containerValues(mode),
      })!;
      expect(command).not.toBeNull();
      return {
        ...source,
        $authoring: {
          ...readUiDocumentNodeAuthoringV3(source),
          layout: { strategyId: mode, values: command.values },
        },
      };
    };
    const grid = change(row, 'grid');
    const result = layout(grid);
    expect(byId(result, 'a').rect).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(byId(result, 'b').rect).toEqual({ x: 40, y: 0, width: 20, height: 30 });
    expect(result.widget.$authoring).toBe(grid.$authoring);
    expect(layout(change(grid, 'row')).children.map((child) => child.rect.width)).toEqual([
      100, 200,
    ]);
    expect(readUiDocumentNodeAuthoringV3(grid)!.layout!.values.participation).toEqual(
      lit(ratio(3)),
    );
    expect(() =>
      projectUiLayoutNodeV3({
        ...context,
        node: grid,
        strategies: [
          {
            strategyId: 'grid',
            mode: 'grid',
            placementPropertyId: 'place',
            gapPropertyId: 'gap',
            columnsPropertyId: 'columns',
          },
        ],
        projectedChildren: [],
        rootSize: { width: 300, height: 120 },
      }),
    ).toThrow(/not consumed/);
  });

  it.each(['vertical-list', 'horizontal-list', 'grid'] as const)(
    'retains independent composition viewport and empty equal-slot %s',
    (mode) => {
      const expanded = project(
        node('definition', 'row', [
          node('a', 'overlay', undefined, { participation: lit(ratio(1)) }),
          node('b', 'overlay', undefined, { participation: lit(ratio(2)) }),
        ]),
        undefined,
        { width: 90, height: 60 },
      );
      const instance = projectUiProportionalLayoutNodeV3({
        ...context,
        node: {
          ...node('instance', 'overlay', undefined, { place: placement(90, 60) }),
          ref: 'saved-card',
          overrides: { arbitrary: 'Mine' },
        },
        parentStrategyId: mode,
        projectedChildren: [expanded],
      });
      const projected = projectUiProportionalLayoutNodeV3({
        ...context,
        node: node('root', mode, []),
        projectedChildren: [instance],
        rootSize: { width: 300, height: 120 },
      });
      const result = layoutWidget(projected);
      expect(byId(result, 'definition').rect.width).toBe(90);
      expect(byId(result, 'a').rect.width).toBe(30);
      expect(byId(result, 'instance').widget.overrides).toEqual({ arbitrary: 'Mine' });
      expect(layout(node('empty', mode, [])).children[0]?.rect).toMatchObject({
        width: 0,
        height: 0,
      });
    },
  );

  it('rejects overflow of individually finite weights instead of silently collapsing allocation', () => {
    const root = node('root', 'row', [
      node('a', 'overlay', undefined, { participation: lit(ratio(1e308)) }),
      node('b', 'overlay', undefined, { participation: lit(ratio(1e308)) }),
    ]);
    expect(() => project(root, undefined, { width: 300, height: 120 })).toThrow(
      /Aggregate linear weight must remain finite/,
    );
    expect(
      layout(
        node('root', 'row', [
          node('a', 'overlay', undefined, { participation: lit(ratio(1e308)) }),
        ]),
      ).children[0]?.rect.width,
    ).toBe(300);
  });

  it.each([NaN, Infinity, -1])('rejects nonfinite or negative viewport %s', (width) => {
    expect(() => project(node('root'), undefined, { width, height: 30 })).toThrow(TypeError);
  });
  it.each([65, -1, 0.5, NaN, Infinity])('rejects bounded spacing %s', (value) => {
    expect(() => project(node('root', 'row', [], { gap: lit(px(value)) }))).toThrow(TypeError);
    expect(() => project(node('root', 'row', [], { padding: lit(px(value)) }))).toThrow(TypeError);
  });
  it.each([
    {
      kind: 'flex-container',
      direction: 'column',
      wrap: 'nowrap',
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
    },
    {
      kind: 'flex-container',
      direction: 'row',
      wrap: 'wrap',
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
    },
    {
      kind: 'flex-container',
      direction: 'row',
      wrap: 'nowrap',
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      extra: true,
    },
  ])('rejects unsupported linear config %#', (value) =>
    expect(() => project(node('root', 'row', [], { config: lit(value) }))).toThrow(TypeError),
  );
  it('rejects raw participation, unknown/unconsumed layouts, wrong scopes and extra placement keys', () => {
    expect(() => project({ ...node('bad'), flex: 1 })).toThrow(/Raw flex/);
    expect(() => project({ ...node('bad'), width: Infinity })).toThrow(/Raw geometry/);
    expect(() =>
      projectUiProportionalLayoutNodeV3({
        ...context,
        node: node('root', 'row', []),
        projectedChildren: [{ ...project(node('bad')), flexFit: 'tight' }],
      }),
    ).toThrow(/Raw flex/);
    expect(() => project(node('bad', 'row', [], { unknown: lit(1) }))).toThrow(TypeError);
    const extra: UiLayoutPropertyDescriptor = {
      id: 'unused',
      scope: 'child',
      group: 'sizing',
      strategyKinds: ['flex'],
      value: { type: 'layout.dimension' },
    };
    expect(() =>
      projectUiProportionalLayoutNodeV3({
        ...context,
        layoutProperties: [...layoutProperties, extra],
        layoutStrategies: layoutStrategies.map((entry) =>
          entry.id === 'row'
            ? { ...entry, supportedChildProperties: [...entry.supportedChildProperties, 'unused'] }
            : entry,
        ),
        node: node('bad', 'row', [], { unused: lit(px(1)) }),
        projectedChildren: [],
      }),
    ).toThrow(/not consumed/);
    expect(() =>
      projectUiProportionalLayoutNodeV3({
        ...context,
        strategies: strategies.map((entry) =>
          entry.mode === 'row' ? { ...entry, containerPropertyId: 'participation' } : entry,
        ),
        node: node('bad', 'row', []),
      }),
    ).toThrow(/scope or type/);
    const litPlacement = {
      kind: 'canvas-placement',
      x: px(0),
      y: px(0),
      width: px(100),
      height: px(30),
      anchor: 'top-start',
      zIndex: 0,
    };
    expect(() =>
      project(
        node('bad', 'overlay', undefined, {
          place: lit({
            ...(litPlacement as object),
            extra: true,
          }),
        }),
      ),
    ).toThrow(TypeError);
  });
});
