import {
  isStructurallyValidUiValueSource,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  type UiCanvasPlacementValue,
  type UiFlexContainerValue,
  type UiLayoutPropertyDescriptor,
  type UiLayoutStrategyDescriptor,
  type UiLinearChildValue,
  type UiValueSource,
} from '@workbench-kit/contracts';

import type { GenericWidget } from '../widget/tree.js';
import { readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { createLayoutPropertySupport } from './layout-property-support.js';
import { projectUiLayoutNodeV3, type UiLayoutProjectionStrategy } from './ordered-layout.js';

/** Explicit, bounded adapter to the existing JDW linear and equal-slot allocators. */
export interface UiProportionalLayoutProjectionStrategy {
  readonly strategyId: string;
  readonly mode: 'overlay' | 'row' | 'column' | 'vertical-list' | 'horizontal-list' | 'grid';
  readonly placementPropertyId: string;
  readonly linearParticipationPropertyId?: string;
  readonly containerPropertyId?: string;
  readonly gapPropertyId?: string;
  readonly paddingPropertyId?: string;
  readonly columnsPropertyId?: string;
}

export interface UiProportionalLayoutNodeProjectionV3Input {
  readonly node: GenericWidget;
  readonly projectedChildren?: readonly GenericWidget[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly strategies: readonly UiProportionalLayoutProjectionStrategy[];
  readonly parentStrategyId?: string;
  readonly rootSize?: { readonly width: number; readonly height: number };
}

function fail(message: string): never {
  throw new TypeError(`UI proportional layout projection: ${message}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    record(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isLinear(mapping: UiProportionalLayoutProjectionStrategy): boolean {
  return mapping.mode === 'row' || mapping.mode === 'column';
}

function mappingFor(
  id: string,
  input: UiProportionalLayoutNodeProjectionV3Input,
): UiProportionalLayoutProjectionStrategy {
  const descriptors = input.layoutStrategies.filter((entry) => entry.id === id);
  const descriptor = descriptors[0];
  const mappings = input.strategies.filter((entry) => entry.strategyId === id);
  const mapping = mappings[0];
  if (
    !id ||
    id !== id.trim() ||
    descriptors.length !== 1 ||
    descriptor === undefined ||
    validateUiLayoutStrategyDescriptor(descriptor, input.layoutProperties).length > 0 ||
    mappings.length !== 1 ||
    mapping === undefined ||
    !['overlay', 'row', 'column', 'vertical-list', 'horizontal-list', 'grid'].includes(mapping.mode)
  ) {
    return fail(`Strategy "${id}" needs one valid descriptor and known mapping.`);
  }
  const supported = createLayoutPropertySupport(descriptor);
  const fields = [
    [mapping.placementPropertyId, 'child', 'layout.canvas-placement'],
    [mapping.linearParticipationPropertyId, 'child', 'layout.linear-child'],
    [mapping.containerPropertyId, 'container', 'layout.flex-container'],
    [mapping.gapPropertyId, 'container', 'layout.dimension'],
    [mapping.paddingPropertyId, 'container', 'layout.dimension'],
    [mapping.columnsPropertyId, 'container', 'layout.grid-tracks'],
  ] as const;
  const seen = new Set<string>();
  for (const [propertyId, scope, type] of fields) {
    if (propertyId === undefined) continue;
    const property = input.layoutProperties.find((entry) => entry.id === propertyId);
    if (
      seen.has(propertyId) ||
      property === undefined ||
      !supported(property) ||
      property.scope !== scope ||
      property.value.type !== type
    ) {
      fail(`Property "${propertyId}" has an incompatible projection scope or type.`);
    }
    seen.add(propertyId);
  }
  if (!seen.has(mapping.placementPropertyId)) fail('A child placement mapping is required.');
  if (
    isLinear(mapping) &&
    (mapping.linearParticipationPropertyId === undefined ||
      mapping.containerPropertyId === undefined)
  )
    fail('Row/Column require container and linear participation mappings.');
  if (mapping.mode === 'grid' && mapping.columnsPropertyId === undefined)
    fail('Grid requires columns.');
  return mapping;
}

function literal(values: Readonly<Record<string, UiValueSource>>, id: string): unknown {
  const source = values[id];
  if (!exact(source, ['kind', 'value']) || source.kind !== 'literal')
    return fail(`Property "${id}" requires an exact literal.`);
  return source.value;
}

function pixels(value: unknown): number {
  if (
    !exact(value, ['kind', 'value', 'unit']) ||
    value.kind !== 'length' ||
    value.unit !== 'px' ||
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value)
  )
    return fail('Dimensions must be exact finite px lengths.');
  return value.value;
}

function spacing(values: Readonly<Record<string, UiValueSource>>, id?: string): number {
  if (id === undefined) return 0;
  const value = pixels(literal(values, id));
  if (!Number.isInteger(value) || value < 0 || value > 64)
    fail('Gap and padding must be integer px lengths in 0..64.');
  return value;
}

function validateNode(node: GenericWidget, input: UiProportionalLayoutNodeProjectionV3Input) {
  if (
    Object.prototype.hasOwnProperty.call(node, 'flex') ||
    Object.prototype.hasOwnProperty.call(node, 'flexFit')
  )
    fail('Raw flex/flexFit participation is not authored layout.');
  for (const key of [
    'width',
    'height',
    'left',
    'top',
    'right',
    'bottom',
    'zIndex',
    'gap',
    'padding',
    'columns',
    'rows',
  ]) {
    if (node[key] !== undefined && (typeof node[key] !== 'number' || !Number.isFinite(node[key]))) {
      fail(`Raw geometry "${key}" must be finite.`);
    }
  }
  const authoring = readUiDocumentNodeAuthoringV3(node);
  if (!authoring || typeof node.id !== 'string' || !node.id || node.id !== node.id.trim())
    return fail('An authored node with a canonical id is required.');
  const layout = authoring.layout;
  if (!layout) return { authoring, mapping: undefined };
  const mapping = mappingFor(layout.strategyId, input);
  const descriptor = input.layoutStrategies.find((entry) => entry.id === layout.strategyId)!;
  const consumed = new Set([mapping.placementPropertyId, mapping.linearParticipationPropertyId]);
  if (isLinear(mapping)) {
    consumed.add(mapping.containerPropertyId);
    consumed.add(mapping.gapPropertyId);
    consumed.add(mapping.paddingPropertyId);
  } else if (mapping.mode !== 'overlay') {
    consumed.add(mapping.gapPropertyId);
    if (mapping.mode === 'grid') consumed.add(mapping.columnsPropertyId);
  }
  for (const [id, source] of Object.entries(layout.values)) {
    const property = input.layoutProperties.find((entry) => entry.id === id);
    if (
      !property ||
      !createLayoutPropertySupport(descriptor)(property) ||
      !isStructurallyValidUiValueSource(source) ||
      validateUiLayoutPropertyValue(property, source).length > 0
    )
      fail(`Property "${id}" has an invalid value or descriptor.`);
    if (!consumed.has(id)) fail(`Property "${id}" is not consumed by this projection mapping.`);
    // Every consumed value is literal, including dormant child participation.
    literal(layout.values, id);
  }
  if (layout.values[mapping.placementPropertyId] !== undefined) placement(node, mapping);
  if (
    isLinear(mapping) &&
    mapping.containerPropertyId !== undefined &&
    layout.values[mapping.containerPropertyId] !== undefined
  ) {
    const config = literal(layout.values, mapping.containerPropertyId);
    if (
      !exact(config, ['kind', 'direction', 'wrap', 'mainAxisAlignment', 'crossAxisAlignment']) ||
      config.kind !== 'flex-container' ||
      config.direction !== mapping.mode ||
      config.wrap !== 'nowrap'
    ) {
      fail('Linear configuration requires exact matching direction and nowrap.');
    }
  }
  return { authoring, mapping };
}

function placement(
  node: GenericWidget,
  mapping: UiProportionalLayoutProjectionStrategy,
): UiCanvasPlacementValue {
  const values = readUiDocumentNodeAuthoringV3(node)!.layout!.values;
  const value = literal(values, mapping.placementPropertyId);
  if (
    !exact(value, ['kind', 'x', 'y', 'width', 'height', 'anchor', 'zIndex']) ||
    value.kind !== 'canvas-placement' ||
    value.anchor !== 'top-start' ||
    typeof value.zIndex !== 'number' ||
    !Number.isFinite(value.zIndex) ||
    !Number.isInteger(value.zIndex)
  )
    fail('Placement requires an exact top-start canvas placement.');
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const size = pixels(value[key]);
    if ((key === 'width' || key === 'height') && size <= 0)
      fail('Preferred dimensions must be positive.');
  }
  return value as unknown as UiCanvasPlacementValue;
}

function participation(
  node: GenericWidget,
  mapping: UiProportionalLayoutProjectionStrategy,
): UiLinearChildValue {
  const values = readUiDocumentNodeAuthoringV3(node)!.layout!.values;
  const id = mapping.linearParticipationPropertyId;
  return id === undefined || values[id] === undefined
    ? { kind: 'linear-child', sizing: 'fixed' }
    : (literal(values, id) as UiLinearChildValue);
}

function linearChild(
  child: GenericWidget,
  input: UiProportionalLayoutNodeProjectionV3Input,
  mode: 'row' | 'column',
  stretch: boolean,
): GenericWidget {
  const { mapping } = validateNode(child, input);
  if (!mapping) return fail('Linear children require placement.');
  const value = participation(child, mapping);
  const { width, height, ...rest } = child;
  let size =
    value.sizing === 'intrinsic' ? (mode === 'row' ? { height } : { width }) : { width, height };
  if (value.sizing === 'intrinsic') {
    const contentType =
      mapping.mode === 'grid'
        ? 'grid'
        : mapping.mode === 'horizontal-list'
          ? 'row'
          : mapping.mode === 'vertical-list'
            ? 'column'
            : undefined;
    const content =
      child.type === 'stack' && Array.isArray(child.children) && child.children.length === 1
        ? child.children[0]
        : undefined;
    if (
      contentType !== undefined &&
      record(content) &&
      content.type === contentType &&
      content.id === undefined &&
      content.$authoring === undefined
    ) {
      const main = mode === 'row' ? 'width' : 'height';
      const extent = content[main];
      // Ordered projection already owns the equal-slot content extent.
      if (typeof extent === 'number' && Number.isFinite(extent) && extent >= 0)
        size = { ...size, [main]: extent };
    }
  }
  // The allocator reads preferred/measured basis first. Fixed/intrinsic then
  // consume that rect, including cross stretch, rather than overriding it.
  if (value.sizing !== 'weighted') return { ...rest, ...size, flexFit: 'tight' };
  const looseSize =
    value.fit === 'loose' && stretch ? (mode === 'row' ? { width } : { height }) : size;
  return { ...rest, ...looseSize, flex: value.weight, flexFit: value.fit };
}

function geometryFree(node: GenericWidget): GenericWidget {
  const {
    children: _children,
    child: _child,
    left: _left,
    top: _top,
    right: _right,
    bottom: _bottom,
    width: _width,
    height: _height,
    zIndex: _zIndex,
    gap: _gap,
    padding: _padding,
    columns: _columns,
    rows: _rows,
    align: _align,
    mainAxisAlignment: _main,
    crossAxisAlignment: _cross,
    col: _col,
    row: _row,
    colSpan: _colSpan,
    rowSpan: _rowSpan,
    ...metadata
  } = node;
  return metadata;
}

/**
 * Projects one node without source mutation. Row/Column reuse JDW allocation;
 * ordered modes delegate to the unchanged equal-slot adapter with ephemeral
 * sanitized input. Child participation is dormant outside Row/Column.
 * Root sizes must be the actual finite viewport, not template preferred sizes.
 */
export function projectUiProportionalLayoutNodeV3(
  input: UiProportionalLayoutNodeProjectionV3Input,
): GenericWidget {
  const { node, projectedChildren, rootSize } = input;
  const { authoring, mapping } = validateNode(node, input);
  const parent =
    input.parentStrategyId === undefined ? undefined : mappingFor(input.parentStrategyId, input);
  for (const child of projectedChildren ?? []) validateNode(child, input);
  let frame: { left: number; top: number; width: number; height: number; zIndex: number };
  if (rootSize) {
    if (
      ![rootSize.width, rootSize.height].every(
        (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
      )
    )
      fail('Root dimensions must be finite and nonnegative.');
    frame = { left: 0, top: 0, width: rootSize.width, height: rootSize.height, zIndex: 0 };
  } else {
    if (!mapping) return fail('A nonroot node requires placement.');
    const value = placement(node, mapping);
    frame = {
      left: parent?.mode === 'overlay' ? pixels(value.x) : 0,
      top: parent?.mode === 'overlay' ? pixels(value.y) : 0,
      width: pixels(value.width),
      height: pixels(value.height),
      zIndex: parent?.mode === 'overlay' ? value.zIndex : 0,
    };
  }
  const viewport = { ...geometryFree(node), ...frame };
  if (projectedChildren === undefined) return viewport;
  if (!mapping || !authoring.layout) return fail('A container requires a layout strategy.');
  const values = authoring.layout.values;
  if (mapping.mode === 'overlay')
    return { ...viewport, type: 'stack', children: [...projectedChildren] };
  if (mapping.mode === 'row' || mapping.mode === 'column') {
    const value = literal(values, mapping.containerPropertyId!);
    if (
      !exact(value, ['kind', 'direction', 'wrap', 'mainAxisAlignment', 'crossAxisAlignment']) ||
      value.kind !== 'flex-container' ||
      value.direction !== mapping.mode ||
      value.wrap !== 'nowrap'
    )
      fail('Linear configuration requires exact matching direction and nowrap.');
    const config = value as unknown as UiFlexContainerValue;
    const totalWeight = projectedChildren.reduce((total, child) => {
      const childMapping = validateNode(child, input).mapping;
      if (!childMapping) return fail('Linear children require placement.');
      const value = participation(child, childMapping);
      return total + (value.sizing === 'weighted' ? value.weight : 0);
    }, 0);
    if (!Number.isFinite(totalWeight)) fail('Aggregate linear weight must remain finite.');
    const main = {
      'space-between': 'spaceBetween',
      'space-around': 'spaceAround',
      'space-evenly': 'spaceEvenly',
    };
    return {
      ...viewport,
      type: mapping.mode,
      gap: spacing(values, mapping.gapPropertyId),
      padding: spacing(values, mapping.paddingPropertyId),
      mainAxisAlignment:
        config.mainAxisAlignment in main
          ? main[config.mainAxisAlignment as keyof typeof main]
          : config.mainAxisAlignment,
      crossAxisAlignment: config.crossAxisAlignment,
      children: projectedChildren.map((child) =>
        linearChild(
          child,
          input,
          mapping.mode as 'row' | 'column',
          config.crossAxisAlignment === 'stretch',
        ),
      ),
    };
  }
  spacing(values, mapping.gapPropertyId);
  // Only this node's descriptor/values are required by A; child viewports are
  // already projected. Never pass dormant participation or generated raw flex.
  const allowed = [
    mapping.placementPropertyId,
    mapping.gapPropertyId,
    mapping.mode === 'grid' ? mapping.columnsPropertyId : undefined,
  ].filter((id): id is string => id !== undefined);
  const descriptor = input.layoutStrategies.find((entry) => entry.id === mapping.strategyId)!;
  const sanitized = {
    ...node,
    $authoring: {
      ...authoring,
      layout: {
        strategyId: mapping.strategyId,
        values: Object.fromEntries(Object.entries(values).filter(([id]) => allowed.includes(id))),
      },
    },
  };
  const orderedMapping: UiLayoutProjectionStrategy = {
    strategyId: mapping.strategyId,
    mode: mapping.mode,
    placementPropertyId: mapping.placementPropertyId,
    ...(mapping.gapPropertyId === undefined ? {} : { gapPropertyId: mapping.gapPropertyId }),
    ...(mapping.mode !== 'grid' ? {} : { columnsPropertyId: mapping.columnsPropertyId }),
  };
  const ordered = projectUiLayoutNodeV3({
    node: sanitized,
    projectedChildren,
    layoutProperties: input.layoutProperties.filter((entry) => allowed.includes(entry.id)),
    layoutStrategies: [
      {
        ...descriptor,
        supportedContainerProperties: descriptor.supportedContainerProperties.filter((id) =>
          allowed.includes(id),
        ),
        supportedChildProperties: descriptor.supportedChildProperties.filter((id) =>
          allowed.includes(id),
        ),
      },
    ],
    strategies: [orderedMapping],
    rootSize: { width: frame.width, height: frame.height },
  });
  return { ...ordered, ...frame, $authoring: node.$authoring };
}
