import type { UiValueSource } from '@workbench-kit/contracts';
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
