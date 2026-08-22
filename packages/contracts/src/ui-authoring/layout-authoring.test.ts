import { describe, expect, it } from 'vitest';
import {
  UI_LAYOUT_STRATEGY_KINDS,
  UI_LAYOUT_VALUE_TYPES,
  UI_LAYOUT_VALIDATION_ISSUE_CODES,
  isUiLayoutStrategyKind,
  resolveUiLayoutInspectorGroups,
  validateUiBorderValue,
  validateUiCanvasPlacementValue,
  validateUiDimensionValue,
  validateUiFlexChildValue,
  validateUiFlexContainerValue,
  validateUiGridPlacementValue,
  validateUiGridTrackListValue,
  validateUiLayoutStrategyDescriptor,
  validateUiLayoutPropertyValue,
  validateUiOverlayPlacementValue,
  validateUiPropertyValue,
  validateUiRadiusValue,
  validateUiShadowValue,
  validateUiSpacingValue,
  validateUiSplitValue,
  type UiDimensionValue,
  type UiCanvasPlacementValue,
  type UiGridTrackListValue,
  type UiLayoutPropertyDescriptor,
  type UiLayoutStrategyDescriptor,
  type UiSplitValue,
  type UiValueSource,
} from '../index';

const px = (value: number) => ({ kind: 'length', value, unit: 'px' }) as const;
const percent = (value: number) => ({ kind: 'percentage', value }) as const;

describe('UI layout literal values', () => {
  it('publishes frozen built-in strategy and issue vocabularies', () => {
    expect(Object.isFrozen(UI_LAYOUT_STRATEGY_KINDS)).toBe(true);
    expect(Object.isFrozen(UI_LAYOUT_VALIDATION_ISSUE_CODES)).toBe(true);
    expect(isUiLayoutStrategyKind('host-flow')).toBe(true);
    expect(isUiLayoutStrategyKind(' ')).toBe(false);
    expect(Object.isFrozen(UI_LAYOUT_VALUE_TYPES)).toBe(true);
    expect(UI_LAYOUT_VALUE_TYPES).toContain('layout.canvas-placement');
  });

  it('composes the source envelope with built-in layout literal validators and fails unknown literals closed', () => {
    const spacing: UiLayoutPropertyDescriptor = {
      id: 'gap',
      scope: 'container',
      group: 'spacing',
      strategyKinds: ['flex'],
      value: { type: 'layout.spacing', allowedSources: ['literal', 'token'] },
    };

    expect(
      validateUiLayoutPropertyValue(spacing, {
        kind: 'literal',
        value: {
          kind: 'spacing',
          top: px(1),
          right: px(2),
          bottom: px(3),
          left: px(4),
        },
      }),
    ).toEqual([]);
    expect(validateUiLayoutPropertyValue(spacing, { kind: 'token', tokenId: 'space.gap' })).toEqual(
      [],
    );
    expect(
      validateUiLayoutPropertyValue(
        { ...spacing, value: { type: 'layout.vendor-custom', allowedSources: ['literal'] } },
        { kind: 'literal', value: { vendor: true } },
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'unsupported-layout-literal-type',
        propertyId: 'gap',
        path: 'value',
      }),
    );
  });

  it.each([
    ['layout.dimension', px(12)],
    ['layout.spacing', { kind: 'spacing', top: px(1), right: px(1), bottom: px(1), left: px(1) }],
    ['layout.border', { kind: 'border', width: px(1), style: 'solid', color: '#fff' }],
    [
      'layout.radius',
      {
        kind: 'radius',
        topLeft: px(1),
        topRight: px(1),
        bottomRight: px(1),
        bottomLeft: px(1),
      },
    ],
    [
      'layout.shadow',
      {
        kind: 'shadow',
        offsetX: px(0),
        offsetY: px(1),
        blur: px(4),
        spread: px(0),
        color: '#0008',
      },
    ],
    [
      'layout.flex-container',
      {
        kind: 'flex-container',
        direction: 'row',
        wrap: 'nowrap',
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
      },
    ],
    [
      'layout.flex-child',
      {
        kind: 'flex-child',
        grow: 1,
        shrink: 1,
        basis: px(20),
        order: 0,
        alignSelf: 'auto',
      },
    ],
    ['layout.grid-tracks', { kind: 'grid-track-list', tracks: [px(100)] }],
    [
      'layout.grid-placement',
      {
        kind: 'grid-placement',
        mode: 'lines',
        columnStart: 1,
        rowStart: 1,
        columnSpan: 1,
        rowSpan: 1,
      },
    ],
    [
      'layout.split',
      {
        kind: 'split',
        orientation: 'horizontal',
        fixedTrack: 'primary',
        size: percent(40),
        collapsible: false,
        collapsed: false,
        resizable: true,
      },
    ],
    ['layout.overlay-placement', { kind: 'overlay-placement', anchor: 'center', zIndex: 0 }],
    [
      'layout.canvas-placement',
      {
        kind: 'canvas-placement',
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        anchor: 'top-start',
        zIndex: 0,
      },
    ],
  ] as const)('dispatches %s to its existing named validator', (type, value) => {
    expect(
      validateUiLayoutPropertyValue(
        {
          id: 'layout-value',
          scope: 'container',
          group: 'advanced',
          strategyKinds: ['custom'],
          value: { type, allowedSources: ['literal'] },
        },
        { kind: 'literal', value },
      ),
    ).toEqual([]);
  });

  it.each<UiDimensionValue>([
    px(12),
    percent(50),
    { kind: 'flex-fraction', value: 1 },
    { kind: 'intrinsic-size', value: 'max-content' },
  ])('accepts the typed $kind dimension', (value) => {
    expect(validateUiDimensionValue(value)).toEqual([]);
  });

  it('rejects invalid or context-disallowed dimensions with stable paths', () => {
    expect(validateUiDimensionValue(px(-1))).toContainEqual(
      expect.objectContaining({ code: 'invalid-layout-range', path: 'value' }),
    );
    expect(validateUiDimensionValue({ kind: 'flex-fraction', value: 0 })).toContainEqual(
      expect.objectContaining({ code: 'invalid-layout-range', path: 'value' }),
    );
    expect(
      validateUiDimensionValue(
        { kind: 'intrinsic-size', value: 'auto' },
        {
          allowedKinds: ['length'],
        },
      ),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-layout-dimension-kind' }));
  });

  it('validates spacing, border, radius, and shadow semantic families', () => {
    expect(
      validateUiSpacingValue({
        kind: 'spacing',
        top: px(1),
        right: percent(2),
        bottom: px(3),
        left: percent(4),
      }),
    ).toEqual([]);
    expect(
      validateUiBorderValue({ kind: 'border', width: px(1), style: 'solid', color: '#fff' }),
    ).toEqual([]);
    expect(
      validateUiRadiusValue({
        kind: 'radius',
        topLeft: px(1),
        topRight: px(2),
        bottomRight: percent(3),
        bottomLeft: percent(4),
      }),
    ).toEqual([]);
    expect(
      validateUiShadowValue({
        kind: 'shadow',
        offsetX: px(-2),
        offsetY: px(2),
        blur: px(8),
        spread: px(-1),
        color: '#0008',
      }),
    ).toEqual([]);
  });

  it('rejects negative non-offset style dimensions and blank colors', () => {
    expect(
      validateUiSpacingValue({
        kind: 'spacing',
        top: px(-1),
        right: px(0),
        bottom: px(0),
        left: px(0),
      }),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-layout-range', path: 'top.value' }));
    expect(
      validateUiBorderValue({ kind: 'border', width: px(1), style: 'solid', color: ' ' }),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-layout-enum', path: 'color' }));
  });
});

describe('strategy-specific layout values', () => {
  it('validates Flex container and child values', () => {
    expect(
      validateUiFlexContainerValue({
        kind: 'flex-container',
        direction: 'row',
        wrap: 'wrap',
        mainAxisAlignment: 'space-between',
        crossAxisAlignment: 'stretch',
      }),
    ).toEqual([]);
    expect(
      validateUiFlexChildValue({
        kind: 'flex-child',
        grow: 1,
        shrink: 0,
        basis: percent(50),
        order: 2,
        alignSelf: 'auto',
      }),
    ).toEqual([]);
  });

  it('rejects Flex fractions as basis and non-integer order', () => {
    expect(
      validateUiFlexChildValue({
        kind: 'flex-child',
        grow: 1,
        shrink: 1,
        basis: { kind: 'flex-fraction', value: 1 },
        order: 0.5,
        alignSelf: 'auto',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-layout-dimension-kind', path: 'basis.kind' }),
        expect.objectContaining({ code: 'invalid-layout-number', path: 'order' }),
      ]),
    );
  });

  it('reports deterministic Flex diagnostic order with enclosing value context', () => {
    const issues = validateUiFlexChildValue({
      kind: 'flex-child',
      grow: -1,
      shrink: -2,
      basis: { kind: 'flex-fraction', value: 1 },
      order: 0.5,
      alignSelf: 'sideways',
    });

    expect(issues.map(({ code, path, valueKind }) => ({ code, path, valueKind }))).toEqual([
      { code: 'invalid-layout-range', path: 'grow', valueKind: 'flex-child' },
      { code: 'invalid-layout-range', path: 'shrink', valueKind: 'flex-child' },
      {
        code: 'invalid-layout-dimension-kind',
        path: 'basis.kind',
        valueKind: 'flex-child',
      },
      { code: 'invalid-layout-number', path: 'order', valueKind: 'flex-child' },
      { code: 'invalid-layout-enum', path: 'alignSelf', valueKind: 'flex-child' },
    ]);
  });

  it('validates Grid tracks, repeat, minmax, and one-based line placement', () => {
    const tracks: UiGridTrackListValue = {
      kind: 'grid-track-list',
      tracks: [
        { kind: 'intrinsic-size', value: 'auto' },
        {
          kind: 'grid-minmax',
          min: px(160),
          max: { kind: 'flex-fraction', value: 1 },
        },
        { kind: 'grid-repeat', count: 2, tracks: [percent(25), px(80)] },
      ],
    };
    expect(validateUiGridTrackListValue(tracks)).toEqual([]);
    expect(
      validateUiGridPlacementValue({
        kind: 'grid-placement',
        mode: 'lines',
        columnStart: 1,
        rowStart: 2,
        columnSpan: 2,
        rowSpan: 1,
      }),
    ).toEqual([]);
  });

  it('rejects nested Grid repeat and zero-based canonical placement', () => {
    expect(
      validateUiGridTrackListValue({
        kind: 'grid-track-list',
        tracks: [
          {
            kind: 'grid-repeat',
            count: 2,
            tracks: [{ kind: 'grid-repeat', count: 2, tracks: [px(1)] }],
          },
        ],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'invalid-grid-track-list', path: 'tracks[0].tracks[0]' }),
    );
    expect(
      validateUiGridPlacementValue({
        kind: 'grid-placement',
        mode: 'lines',
        columnStart: 0,
        rowStart: 1,
        columnSpan: 1,
        rowSpan: 1,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'invalid-layout-range', path: 'columnStart' }),
    );
  });

  it('validates area placement and rejects blank area names', () => {
    expect(
      validateUiGridPlacementValue({ kind: 'grid-placement', mode: 'area', area: 'hero' }),
    ).toEqual([]);
    expect(
      validateUiGridPlacementValue({ kind: 'grid-placement', mode: 'area', area: ' ' }),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-grid-placement', path: 'area' }));
  });

  it('reports ordered Grid placement issues with stable value context', () => {
    const issues = validateUiGridPlacementValue({
      kind: 'grid-placement',
      mode: 'lines',
      columnStart: 0,
      rowStart: 0,
      columnSpan: 0,
      rowSpan: 0,
    });
    expect(issues.map(({ path, valueKind }) => ({ path, valueKind }))).toEqual([
      { path: 'columnStart', valueKind: 'grid-placement' },
      { path: 'rowStart', valueKind: 'grid-placement' },
      { path: 'columnSpan', valueKind: 'grid-placement' },
      { path: 'rowSpan', valueKind: 'grid-placement' },
    ]);
  });

  it('validates Split state and comparable size ranges', () => {
    expect(
      validateUiSplitValue({
        kind: 'split',
        orientation: 'horizontal',
        fixedTrack: 'primary',
        size: percent(40),
        minSize: percent(20),
        maxSize: percent(80),
        collapsible: true,
        collapsed: false,
        resizable: true,
      }),
    ).toEqual([]);
    expect(
      validateUiSplitValue({
        kind: 'split',
        orientation: 'vertical',
        fixedTrack: 'secondary',
        size: px(320),
        minSize: px(400),
        maxSize: px(200),
        collapsible: false,
        collapsed: true,
        resizable: true,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-split-value', path: 'collapsed' }),
        expect.objectContaining({ code: 'invalid-layout-range', path: 'maxSize' }),
      ]),
    );
  });

  it('retains Split value context across enum, state, and range diagnostics', () => {
    const issues = validateUiSplitValue({
      kind: 'split',
      orientation: 'diagonal',
      fixedTrack: 'middle',
      size: px(10),
      minSize: px(20),
      maxSize: px(10),
      collapsible: false,
      collapsed: true,
      resizable: true,
    });
    expect(issues.map(({ path, valueKind }) => ({ path, valueKind }))).toEqual([
      { path: 'orientation', valueKind: 'split' },
      { path: 'fixedTrack', valueKind: 'split' },
      { path: 'collapsed', valueKind: 'split' },
      { path: 'maxSize', valueKind: 'split' },
    ]);
  });

  it('allows negative Overlay insets but requires integer z-order', () => {
    expect(
      validateUiOverlayPlacementValue({
        kind: 'overlay-placement',
        anchor: 'top-start',
        left: px(-8),
        zIndex: 2,
      }),
    ).toEqual([]);
    expect(
      validateUiOverlayPlacementValue({
        kind: 'overlay-placement',
        anchor: 'top-start',
        zIndex: 1.5,
      }),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-layout-number', path: 'zIndex' }));
  });

  it('retains Overlay placement context on ordered leaf diagnostics', () => {
    const issues = validateUiOverlayPlacementValue({
      kind: 'overlay-placement',
      anchor: 'side',
      top: { kind: 'intrinsic-size', value: 'auto' },
      zIndex: 0.5,
    });
    expect(issues.map(({ path, valueKind }) => ({ path, valueKind }))).toEqual([
      { path: 'anchor', valueKind: 'overlay-placement' },
      { path: 'top.kind', valueKind: 'overlay-placement' },
      { path: 'zIndex', valueKind: 'overlay-placement' },
    ]);
  });

  it('allows negative Canvas coordinates while rejecting invalid size constraints', () => {
    expect(
      validateUiCanvasPlacementValue({
        kind: 'canvas-placement',
        x: px(-20),
        y: percent(-10),
        width: px(320),
        height: { kind: 'intrinsic-size', value: 'auto' },
        anchor: 'center',
        zIndex: 3,
        constraints: { minWidth: px(200), maxWidth: px(500), aspectRatio: 1.5 },
      }),
    ).toEqual([]);
    expect(
      validateUiCanvasPlacementValue({
        kind: 'canvas-placement',
        x: px(0),
        y: px(0),
        width: px(-1),
        height: px(10),
        anchor: 'center',
        zIndex: 0,
        constraints: { minWidth: px(20), maxWidth: px(10), aspectRatio: 0 },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-layout-range', path: 'width.value' }),
        expect.objectContaining({ code: 'invalid-layout-range', path: 'constraints.maxWidth' }),
        expect.objectContaining({ code: 'invalid-layout-range', path: 'constraints.aspectRatio' }),
      ]),
    );
  });

  it('retains Canvas placement context across size, z-order, anchor, and constraint issues', () => {
    const issues = validateUiCanvasPlacementValue({
      kind: 'canvas-placement',
      x: px(0),
      y: px(0),
      width: px(-1),
      height: px(10),
      anchor: 'side',
      zIndex: 0.5,
      constraints: { aspectRatio: 0 },
    });
    expect(issues.map(({ path, valueKind }) => ({ path, valueKind }))).toEqual([
      { path: 'width.value', valueKind: 'canvas-placement' },
      { path: 'zIndex', valueKind: 'canvas-placement' },
      { path: 'anchor', valueKind: 'canvas-placement' },
      { path: 'constraints.aspectRatio', valueKind: 'canvas-placement' },
    ]);
  });
});

describe('layout strategy descriptors and Inspector grouping', () => {
  const properties: readonly UiLayoutPropertyDescriptor<UiDimensionValue>[] = [
    {
      id: 'columns',
      scope: 'container',
      group: 'grid',
      strategyKinds: ['grid'],
      value: { type: 'layout.grid-tracks' },
    },
    {
      id: 'gap',
      scope: 'container',
      group: 'spacing',
      strategyKinds: ['grid', 'flex'],
      value: { type: 'layout.spacing' },
    },
    {
      id: 'placement',
      scope: 'child',
      group: 'grid',
      strategyKinds: ['grid'],
      value: { type: 'layout.grid-placement' },
    },
  ];
  const strategy: UiLayoutStrategyDescriptor = {
    id: 'builtin.grid',
    kind: 'grid',
    supportedContainerProperties: ['columns', 'gap'],
    supportedChildProperties: ['placement'],
  };

  it('validates descriptors and resolves ordered scope-specific groups', () => {
    expect(validateUiLayoutStrategyDescriptor(strategy, properties)).toEqual([]);
    expect(resolveUiLayoutInspectorGroups(strategy, properties, 'container')).toEqual({
      groups: [
        { group: 'grid', properties: [properties[0]] },
        { group: 'spacing', properties: [properties[1]] },
      ],
      issues: [],
    });
    expect(resolveUiLayoutInspectorGroups(strategy, properties, 'child')).toEqual({
      groups: [{ group: 'grid', properties: [properties[2]] }],
      issues: [],
    });
  });

  it('fails closed for unknown, duplicate, wrong-scope, and wrong-strategy properties', () => {
    const invalid: UiLayoutStrategyDescriptor = {
      id: 'bad.grid',
      kind: 'grid',
      supportedContainerProperties: ['placement', 'gap', 'gap', 'missing'],
      supportedChildProperties: [],
    };
    const invalidProperties = properties.map((property) =>
      property.id === 'gap' ? { ...property, strategyKinds: ['flex'] } : property,
    );
    const result = resolveUiLayoutInspectorGroups(invalid, invalidProperties, 'container');
    expect(result.groups).toEqual([]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'layout-property-scope-mismatch' }),
        expect.objectContaining({ code: 'layout-property-strategy-mismatch' }),
        expect.objectContaining({ code: 'duplicate-layout-property-id' }),
        expect.objectContaining({ code: 'unknown-layout-property-id' }),
      ]),
    );
  });

  it('composes public layout literals with the 070A source envelope without renderer imports', () => {
    const source: UiValueSource<UiGridTrackListValue> = {
      kind: 'literal',
      value: { kind: 'grid-track-list', tracks: [{ kind: 'flex-fraction', value: 1 }] },
    };
    const descriptor: UiLayoutPropertyDescriptor<UiGridTrackListValue> = {
      id: 'columns',
      scope: 'container',
      group: 'grid',
      strategyKinds: ['grid'],
      value: { type: 'layout.grid-tracks', allowedSources: ['literal', 'token'] },
    };
    expect(
      validateUiPropertyValue(descriptor, source, {
        literalValidator: (literal) => validateUiGridTrackListValue(literal)[0]?.message ?? null,
      }),
    ).toEqual([]);

    const splitSource: UiValueSource<UiSplitValue> = {
      kind: 'literal',
      value: {
        kind: 'split',
        orientation: 'horizontal',
        fixedTrack: 'primary',
        size: percent(40),
        collapsible: true,
        collapsed: false,
        resizable: true,
      },
    };
    const canvasSource: UiValueSource<UiCanvasPlacementValue> = {
      kind: 'literal',
      value: {
        kind: 'canvas-placement',
        x: px(0),
        y: px(0),
        width: px(320),
        height: px(180),
        anchor: 'top-start',
        zIndex: 0,
      },
    };
    expect(validateUiSplitValue(splitSource.value)).toEqual([]);
    expect(validateUiCanvasPlacementValue(canvasSource.value)).toEqual([]);
  });
});
