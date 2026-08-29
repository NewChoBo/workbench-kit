import type { UiCanvasPlacementValue, UiValueSource } from '@workbench-kit/contracts';
import type { UiResponsiveEditingTarget } from '@workbench-kit/jdw';

import type { UiAuthoringSurfaceActionV3 } from './types.js';

export interface WorkbenchAuthoringPropertyActionInput {
  readonly commandId: string;
  readonly editingTarget: UiResponsiveEditingTarget;
  readonly nodeId: string;
  readonly propertyId: string;
  /** Omit to clear the value at the exact editing target. */
  readonly value?: UiValueSource;
}

export interface WorkbenchAuthoringLayoutActionInput {
  readonly commandId: string;
  readonly editingTarget: UiResponsiveEditingTarget;
  readonly nodeId: string;
  /** Omit to clear the layout at the exact editing target. */
  readonly layout?: {
    readonly strategyId: string;
    readonly values: Readonly<Record<string, UiValueSource>>;
  };
}

export interface WorkbenchAuthoringCommandIdInput {
  readonly documentId: string;
  readonly documentRevision: number;
  readonly editingTarget: UiResponsiveEditingTarget;
  readonly nodeId: string;
  readonly operation: string;
}

export type WorkbenchCanvasPlacementResizeEdge =
  'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

export type WorkbenchCanvasPlacementTransform =
  | { readonly kind: 'move'; readonly deltaX: number; readonly deltaY: number }
  | {
      readonly kind: 'resize';
      readonly edge: WorkbenchCanvasPlacementResizeEdge;
      readonly deltaX: number;
      readonly deltaY: number;
    };

export interface WorkbenchAuthoringCanvasPlacementActionInput {
  readonly commandId: string;
  readonly editingTarget: UiResponsiveEditingTarget;
  readonly layoutValues: Readonly<Record<string, UiValueSource>>;
  readonly nodeId: string;
  readonly placementPropertyId: string;
  readonly strategyId: string;
  readonly transform: WorkbenchCanvasPlacementTransform;
}

/**
 * Stable within one projection revision, different after every committed edit.
 * This lets independent surfaces create byte-equivalent canonical commands
 * without owning a counter or document state.
 */
export function createWorkbenchAuthoringCommandId({
  documentId,
  documentRevision,
  editingTarget,
  nodeId,
  operation,
}: WorkbenchAuthoringCommandIdInput): string {
  const target = editingTarget.kind === 'base' ? 'base' : `variant:${editingTarget.variantId}`;
  return ['authoring-v3', documentId, documentRevision, target, nodeId, operation]
    .map((part) => encodeURIComponent(String(part)))
    .join(':');
}

/** Pure canonical command factory shared by Canvas and Inspector property controls. */
export function createWorkbenchAuthoringPropertyActionV3({
  commandId,
  editingTarget,
  nodeId,
  propertyId,
  value,
}: WorkbenchAuthoringPropertyActionInput): UiAuthoringSurfaceActionV3 {
  if (editingTarget.kind === 'base') {
    return {
      kind: 'document-command-v3',
      command: {
        type: 'set-property',
        commandId,
        nodeId,
        propertyId,
        ...(value === undefined ? {} : { value }),
      },
    };
  }

  return {
    kind: 'document-command-v3',
    command:
      value === undefined
        ? {
            type: 'clear-responsive-property',
            commandId,
            nodeId,
            variantId: editingTarget.variantId,
            propertyId,
          }
        : {
            type: 'set-responsive-property',
            commandId,
            nodeId,
            variantId: editingTarget.variantId,
            propertyId,
            value,
          },
  };
}

/** Pure canonical command factory shared by Canvas and Inspector layout controls. */
export function createWorkbenchAuthoringLayoutActionV3({
  commandId,
  editingTarget,
  layout,
  nodeId,
}: WorkbenchAuthoringLayoutActionInput): UiAuthoringSurfaceActionV3 {
  if (editingTarget.kind === 'base') {
    if (layout === undefined) {
      throw new TypeError('The canonical base layout command requires a layout value.');
    }
    return {
      kind: 'document-command-v3',
      command: {
        type: 'set-layout',
        commandId,
        nodeId,
        strategyId: layout.strategyId,
        values: layout.values,
      },
    };
  }

  return {
    kind: 'document-command-v3',
    command:
      layout === undefined
        ? {
            type: 'clear-responsive-layout',
            commandId,
            nodeId,
            variantId: editingTarget.variantId,
          }
        : {
            type: 'set-responsive-layout',
            commandId,
            nodeId,
            variantId: editingTarget.variantId,
            strategyId: layout.strategyId,
            values: layout.values,
          },
  };
}

function pixelLength(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Readonly<Record<string, unknown>>;
  return candidate.kind === 'length' &&
    candidate.unit === 'px' &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value)
    ? candidate.value
    : null;
}

export function createWorkbenchAuthoringCanvasPlacementActionV3({
  commandId,
  editingTarget,
  layoutValues,
  nodeId,
  placementPropertyId,
  strategyId,
  transform,
}: WorkbenchAuthoringCanvasPlacementActionInput): UiAuthoringSurfaceActionV3 | null {
  if (
    (transform.kind !== 'move' && transform.kind !== 'resize') ||
    !Number.isFinite(transform.deltaX) ||
    !Number.isFinite(transform.deltaY)
  ) {
    return null;
  }
  if (
    transform.kind === 'resize' &&
    !(
      [
        'top',
        'right',
        'bottom',
        'left',
        'top-left',
        'top-right',
        'bottom-right',
        'bottom-left',
      ] as const
    ).includes(transform.edge)
  ) {
    return null;
  }
  const source = layoutValues[placementPropertyId];
  if (source?.kind !== 'literal' || typeof source.value !== 'object' || source.value === null) {
    return null;
  }
  const placement = source.value as UiCanvasPlacementValue;
  if (placement.kind !== 'canvas-placement') return null;
  const initialX = pixelLength(placement.x);
  const initialY = pixelLength(placement.y);
  const initialWidth = pixelLength(placement.width);
  const initialHeight = pixelLength(placement.height);
  if (initialX === null || initialY === null || initialWidth === null || initialHeight === null) {
    return null;
  }

  let x = initialX;
  let y = initialY;
  let width = initialWidth;
  let height = initialHeight;
  if (transform.kind === 'move') {
    x += transform.deltaX;
    y += transform.deltaY;
  } else {
    if (transform.edge.includes('left')) {
      x += transform.deltaX;
      width -= transform.deltaX;
    }
    if (transform.edge.includes('right')) width += transform.deltaX;
    if (transform.edge.includes('top')) {
      y += transform.deltaY;
      height -= transform.deltaY;
    }
    if (transform.edge.includes('bottom')) height += transform.deltaY;
  }
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  if (x === initialX && y === initialY && width === initialWidth && height === initialHeight) {
    return null;
  }

  const nextPlacement: UiCanvasPlacementValue = {
    ...placement,
    x: { kind: 'length', value: x, unit: 'px' },
    y: { kind: 'length', value: y, unit: 'px' },
    width: { kind: 'length', value: width, unit: 'px' },
    height: { kind: 'length', value: height, unit: 'px' },
  };
  return createWorkbenchAuthoringLayoutActionV3({
    commandId,
    editingTarget,
    nodeId,
    layout: {
      strategyId,
      values: {
        ...layoutValues,
        [placementPropertyId]: { kind: 'literal', value: nextPlacement },
      },
    },
  });
}
