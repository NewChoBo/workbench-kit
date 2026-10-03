import {
  isStructurallyValidUiValueSource,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  type UiCanvasPlacementValue,
  type UiLayoutPropertyDescriptor,
  type UiLayoutStrategyDescriptor,
  type UiValueSource,
} from '@workbench-kit/contracts';

import type { GenericWidget } from '../widget/tree.js';
import { readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import { createLayoutPropertySupport } from './layout-property-support.js';
import type { UiDocumentAtomicCommandV3, UiDocumentNodeAuthoringV3 } from './types.js';

/**
 * Explicit meanings for the bounded canvas/fixed-preferred-size ordered profile.
 * This mapping is not a general JDW layout resolver.
 */
export interface UiLayoutProjectionStrategy {
  readonly strategyId: string;
  readonly mode: 'canvas' | 'vertical-list' | 'horizontal-list' | 'grid';
  readonly placementPropertyId: string;
  /** A literal layout.dimension length in px. Omission means no gap. */
  readonly gapPropertyId?: string;
  /**
   * Grid requires one literal grid-repeat of one max-content track. This selects
   * equal global slots, not standard CSS per-track max-content sizing.
   */
  readonly columnsPropertyId?: string;
}

interface LayoutDescriptorContext {
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
}

export interface UiLayoutNodeProjectionV3Input extends LayoutDescriptorContext {
  /** Render type and host metadata may already be projected; retain original $authoring. */
  readonly node: GenericWidget;
  /** Undefined is a leaf; an empty array is an empty container. */
  readonly projectedChildren?: readonly GenericWidget[];
  readonly strategies: readonly UiLayoutProjectionStrategy[];
  readonly parentStrategyId?: string;
  /** Also use for expanded composition roots, with the instance viewport size. */
  readonly rootSize?: { readonly width: number; readonly height: number };
}

export interface UiContainerLayoutCommandV3Input extends LayoutDescriptorContext {
  readonly nodeId: string;
  readonly commandId: string;
  readonly currentLayout: UiDocumentNodeAuthoringV3['layout'];
  readonly targetStrategyId: string;
  /** Complete replacement container configuration. Child-scoped values are not accepted. */
  readonly containerValues: Readonly<Record<string, UiValueSource>>;
}

function fail(message: string): never {
  throw new TypeError(`UI layout projection: ${message}`);
}

function canonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function strategyFor(id: string, context: LayoutDescriptorContext): UiLayoutStrategyDescriptor {
  const candidates = context.layoutStrategies.filter((strategy) => strategy.id === id);
  const strategy = candidates.length === 1 ? candidates[0] : undefined;
  if (
    !canonicalText(id) ||
    strategy === undefined ||
    validateUiLayoutStrategyDescriptor(strategy, context.layoutProperties).length > 0
  ) {
    return fail(`Strategy "${id}" is unavailable or invalid.`);
  }
  return strategy;
}

function propertyFor(
  id: string,
  strategy: UiLayoutStrategyDescriptor,
  context: LayoutDescriptorContext,
): UiLayoutPropertyDescriptor {
  const property = context.layoutProperties.find((candidate) => candidate.id === id);
  if (property === undefined || !createLayoutPropertySupport(strategy)(property)) {
    return fail(`Property "${id}" is unavailable for strategy "${strategy.id}".`);
  }
  return property;
}

function validateValues(
  values: Readonly<Record<string, UiValueSource>>,
  strategy: UiLayoutStrategyDescriptor,
  context: LayoutDescriptorContext,
): void {
  for (const [id, source] of Object.entries(values)) {
    const property = propertyFor(id, strategy, context);
    if (
      !isStructurallyValidUiValueSource(source) ||
      validateUiLayoutPropertyValue(property, source).length > 0
    ) {
      fail(`Property "${id}" has an invalid value.`);
    }
  }
}

function rejectRawFlexParticipation(node: GenericWidget): void {
  if (
    Object.prototype.hasOwnProperty.call(node, 'flex') ||
    Object.prototype.hasOwnProperty.call(node, 'flexFit')
  ) {
    fail('Raw flex/flexFit participation is outside the fixed-preferred-size profile.');
  }
}

function validateConsumedValues(
  values: Readonly<Record<string, UiValueSource>>,
  mapping: UiLayoutProjectionStrategy,
): void {
  const consumed = new Set([mapping.placementPropertyId]);
  if (mapping.mode !== 'canvas' && mapping.gapPropertyId !== undefined) {
    consumed.add(mapping.gapPropertyId);
  }
  if (mapping.mode === 'grid' && mapping.columnsPropertyId !== undefined) {
    consumed.add(mapping.columnsPropertyId);
  }
  for (const id of Object.keys(values)) {
    if (!consumed.has(id)) fail(`Property "${id}" is not consumed by this projection mapping.`);
  }
}

function projectionFor(
  id: string,
  input: UiLayoutNodeProjectionV3Input,
): UiLayoutProjectionStrategy {
  const descriptor = strategyFor(id, input);
  const candidates = input.strategies.filter((strategy) => strategy.strategyId === id);
  const mapping = candidates.length === 1 ? candidates[0] : undefined;
  if (
    mapping === undefined ||
    !['canvas', 'vertical-list', 'horizontal-list', 'grid'].includes(mapping.mode)
  ) {
    return fail(`Strategy "${id}" needs one known projection mapping.`);
  }
  const placement = propertyFor(mapping.placementPropertyId, descriptor, input);
  if (placement.scope !== 'child' || placement.value.type !== 'layout.canvas-placement') {
    fail('Placement must map to a child-scoped canvas placement.');
  }
  for (const [propertyId, type] of [
    [mapping.gapPropertyId, 'layout.dimension'],
    [mapping.columnsPropertyId, 'layout.grid-tracks'],
  ] as const) {
    if (propertyId === undefined) continue;
    const property = propertyFor(propertyId, descriptor, input);
    if (property.scope !== 'container' || property.value.type !== type) {
      fail(`Property "${propertyId}" has an incompatible projection scope or type.`);
    }
  }
  if (mapping.mode === 'grid' && mapping.columnsPropertyId === undefined) {
    fail('Grid projection requires a columns property mapping.');
  }
  return mapping;
}

function literal(values: Readonly<Record<string, UiValueSource>>, id: string): unknown {
  const source = values[id];
  if (!record(source) || !exactKeys(source, ['kind', 'value']) || source.kind !== 'literal') {
    return fail(`Property "${id}" requires a literal.`);
  }
  return source.value;
}

function pixelLength(value: unknown): number {
  if (
    !record(value) ||
    !exactKeys(value, ['kind', 'value', 'unit']) ||
    value.kind !== 'length' ||
    value.unit !== 'px' ||
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value)
  ) {
    return fail('Dimensions must be finite px lengths.');
  }
  return value.value;
}

function positiveSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fail('Preferred child dimensions must be finite and positive.');
  }
  return value;
}

function gridColumns(value: unknown): number {
  if (
    !record(value) ||
    !exactKeys(value, ['kind', 'tracks']) ||
    value.kind !== 'grid-track-list' ||
    !Array.isArray(value.tracks) ||
    value.tracks.length !== 1
  ) {
    return fail('Grid columns require exactly one repeated max-content track.');
  }
  const repeat: unknown = value.tracks[0];
  if (
    !record(repeat) ||
    !exactKeys(repeat, ['kind', 'count', 'tracks']) ||
    repeat.kind !== 'grid-repeat' ||
    typeof repeat.count !== 'number' ||
    !Number.isInteger(repeat.count) ||
    repeat.count <= 0 ||
    !Array.isArray(repeat.tracks) ||
    repeat.tracks.length !== 1
  ) {
    return fail('Grid repeat count must be a positive integer.');
  }
  const track: unknown = repeat.tracks[0];
  if (
    !record(track) ||
    !exactKeys(track, ['kind', 'value']) ||
    track.kind !== 'intrinsic-size' ||
    track.value !== 'max-content'
  ) {
    return fail('Grid columns only support max-content intrinsic tracks.');
  }
  return repeat.count;
}

/**
 * Projects one admitted authored node in the bounded canvas/fixed-preferred-size
 * ordered profile without changing its source or identity. This is not a general
 * JDW layout resolver: existing row/column, flex-ratio, percentage and grid-track
 * APIs remain unchanged and are separate supported layout routes.
 * Ordered content and equal slots have no authored id or selection metadata.
 * Their explicit sizes let layoutWidget use its existing linear/grid engines;
 * actual children retain their preferred dimensions at each slot's origin.
 * Grid slots share the global maximum child width and height, intentionally
 * differing from standard CSS per-track max-content sizing.
 * Invalid mappings, unconsumed authored layout values, raw flex/flexFit fields,
 * unsupported literal shapes or nonfinite geometry throw TypeError. Ordered
 * placement x/y/zIndex remain authored dormant values, as defined by this profile.
 */
export function projectUiLayoutNodeV3(input: UiLayoutNodeProjectionV3Input): GenericWidget {
  const { node, projectedChildren, rootSize } = input;
  rejectRawFlexParticipation(node);
  for (const child of projectedChildren ?? []) rejectRawFlexParticipation(child);
  const authoring = readUiDocumentNodeAuthoringV3(node);
  if (authoring === null || !canonicalText(node.id))
    fail('An authored node with an id is required.');
  const layout = authoring.layout;
  const mapping = layout === undefined ? undefined : projectionFor(layout.strategyId, input);
  if (layout !== undefined && mapping !== undefined) {
    validateValues(layout.values, strategyFor(layout.strategyId, input), input);
    validateConsumedValues(layout.values, mapping);
  }
  const parent =
    input.parentStrategyId === undefined ? undefined : projectionFor(input.parentStrategyId, input);
  let frame: { left: number; top: number; width: number; height: number; zIndex: number };
  if (rootSize !== undefined) {
    if (![rootSize.width, rootSize.height].every((value) => Number.isFinite(value) && value >= 0)) {
      fail('Root dimensions must be finite and nonnegative.');
    }
    frame = { left: 0, top: 0, ...rootSize, zIndex: 0 };
  } else {
    if (layout === undefined || mapping === undefined) fail('A nonroot node requires placement.');
    const placement = literal(layout.values, mapping.placementPropertyId) as UiCanvasPlacementValue;
    const consumesPosition = parent?.mode === 'canvas';
    if (consumesPosition && placement.anchor !== 'top-start')
      fail('Canvas projection requires top-start anchoring.');
    frame = {
      left: consumesPosition ? pixelLength(placement.x) : 0,
      top: consumesPosition ? pixelLength(placement.y) : 0,
      width: positiveSize(pixelLength(placement.width)),
      height: positiveSize(pixelLength(placement.height)),
      zIndex: consumesPosition ? placement.zIndex : 0,
    };
  }
  // Tree edges and geometry are projection-owned, not caller metadata.
  const { children: _children, child: _child, right: _right, bottom: _bottom, ...metadata } = node;
  const viewport: GenericWidget = { ...metadata, ...frame };
  if (projectedChildren === undefined) return viewport;
  if (mapping === undefined || layout === undefined)
    fail('A container requires a layout strategy.');
  if (mapping.mode === 'canvas')
    return { ...viewport, type: 'stack', children: [...projectedChildren] };

  const gap =
    mapping.gapPropertyId === undefined
      ? 0
      : pixelLength(literal(layout.values, mapping.gapPropertyId));
  if (!Number.isInteger(gap) || gap < 0) fail('Gap must be a nonnegative integer px length.');
  const columns =
    mapping.mode === 'grid'
      ? gridColumns(literal(layout.values, mapping.columnsPropertyId!))
      : mapping.mode === 'horizontal-list'
        ? projectedChildren.length
        : 1;
  let slotWidth = 0;
  let slotHeight = 0;
  for (const child of projectedChildren) {
    slotWidth = Math.max(slotWidth, positiveSize(child.width));
    slotHeight = Math.max(slotHeight, positiveSize(child.height));
  }
  const rows = projectedChildren.length === 0 ? 0 : Math.ceil(projectedChildren.length / columns);
  const width = projectedChildren.length === 0 ? 0 : columns * slotWidth + (columns - 1) * gap;
  const height = rows === 0 ? 0 : rows * slotHeight + (rows - 1) * gap;
  if (![width, height].every(Number.isFinite)) fail('Ordered content extent must remain finite.');
  const content: GenericWidget = {
    type: mapping.mode === 'grid' ? 'grid' : mapping.mode === 'horizontal-list' ? 'row' : 'column',
    width,
    height,
    gap,
    ...(mapping.mode === 'grid' ? { columns, rows } : {}),
    children: projectedChildren.map((child) => ({
      type: 'stack',
      width: slotWidth,
      height: slotHeight,
      children: [{ ...child, left: 0, top: 0, zIndex: 0 }],
    })),
  };
  return { ...viewport, type: 'stack', children: [content] };
}

/**
 * Builds one descriptor-generic command; applying, admission and history remain
 * with the caller. All declared child-scoped values are preserved, including
 * values outside projectUiLayoutNodeV3's bounded profile. That projection rejects
 * such unconsumed values; other existing layout routes can support them.
 */
export function createUiContainerLayoutCommandV3(
  input: UiContainerLayoutCommandV3Input,
): Extract<UiDocumentAtomicCommandV3, { readonly type: 'set-layout' }> | null {
  try {
    if (!canonicalText(input.nodeId) || !canonicalText(input.commandId)) return null;
    const target = strategyFor(input.targetStrategyId, input);
    const entries: [string, UiValueSource][] = [];
    if (input.currentLayout !== undefined) {
      const current = strategyFor(input.currentLayout.strategyId, input);
      validateValues(input.currentLayout.values, current, input);
      for (const [id, value] of Object.entries(input.currentLayout.values)) {
        if (propertyFor(id, current, input).scope === 'child') entries.push([id, value]);
      }
    }
    for (const [id, value] of Object.entries(input.containerValues)) {
      if (propertyFor(id, target, input).scope !== 'container') return null;
      entries.push([id, value]);
    }
    const values = cloneUiAuthoringJsonValue(Object.fromEntries(entries));
    validateValues(values, target, input);
    return deepFreezeUiAuthoringValue({
      type: 'set-layout',
      commandId: input.commandId,
      nodeId: input.nodeId,
      strategyId: target.id,
      values,
    });
  } catch {
    return null;
  }
}
