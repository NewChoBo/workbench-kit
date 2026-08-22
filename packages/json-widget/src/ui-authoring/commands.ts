import type { UiValueSource } from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { WidgetPath } from '../document/path.js';
import { isContainerWidget } from '../widget/child-ops.js';
import { applyWidgetPatch, type WidgetPatch } from '../widget/patch.js';
import { isGenericWidget, isSingleChildContainerType } from '../widget/type-guards.js';
import { collectWidgetNodes, getWidgetChildren, type GenericWidget } from '../widget/tree.js';
import {
  createUiDocumentFromRoot,
  isStructurallyValidUiValueSource,
  readUiDocumentNodeAuthoring,
  validateUiDocumentRoot,
} from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  ApplyUiDocumentCommandResult,
  UiDocument,
  UiDocumentCommand,
  UiDocumentCommandIssue,
  UiDocumentIssue,
  UiDocumentNode,
} from './types.js';

interface CommandIndexEntry {
  readonly node: UiDocumentNode;
  readonly path: WidgetPath;
}

type CommandIndex = ReadonlyMap<string, CommandIndexEntry>;

function isCanonicalText(value: string): boolean {
  return value.length > 0 && value === value.trim();
}

function fail(
  document: UiDocument,
  ...issues: readonly (UiDocumentIssue | UiDocumentCommandIssue)[]
): ApplyUiDocumentCommandResult {
  return {
    document,
    transaction: null,
    issues: Object.freeze([...issues]),
    changed: false,
  };
}

function createCommandIndex(document: UiDocument): CommandIndex {
  return new Map(
    collectWidgetNodes(document.root).map((entry) => [
      entry.widget.id as string,
      { node: entry.widget as UiDocumentNode, path: entry.path },
    ]),
  );
}

function widgetPathEquals(left: WidgetPath, right: WidgetPath): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => {
      const candidate = right[index];
      return (
        segment.kind === candidate?.kind &&
        (segment.kind === 'child' ||
          (candidate?.kind === 'children' && segment.index === candidate.index))
      );
    })
  );
}

function widgetPathStartsWith(path: WidgetPath, prefix: WidgetPath): boolean {
  return (
    path.length >= prefix.length &&
    prefix.every((segment, index) => {
      const candidate = path[index];
      return (
        segment.kind === candidate?.kind &&
        (segment.kind === 'child' ||
          (candidate?.kind === 'children' && segment.index === candidate.index))
      );
    })
  );
}

function replaceAuthoringNode(
  index: CommandIndex,
  nodeId: string,
  update: (node: UiDocumentNode) => UiDocumentNode,
): WidgetPatch | UiDocumentCommandIssue {
  const resolved = index.get(nodeId);
  if (!resolved) {
    return {
      code: 'node-not-found',
      message: `UI document node "${nodeId}" was not found.`,
      nodeId,
    };
  }
  return {
    type: 'replace-widget',
    path: resolved.path,
    widget: update(resolved.node),
  };
}

function createOwnValueMap(
  values: Readonly<Record<string, UiValueSource>>,
): Record<string, UiValueSource> {
  return Object.fromEntries(Object.entries(values)) as Record<string, UiValueSource>;
}

function setOwnValue(
  target: Record<string, UiValueSource>,
  propertyId: string,
  value: UiValueSource,
): void {
  Object.defineProperty(target, propertyId, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function toPatch(
  index: CommandIndex,
  command: UiDocumentCommand,
): WidgetPatch | UiDocumentCommandIssue {
  switch (command.type) {
    case 'insert-node': {
      const parent = index.get(command.parentId);
      if (!parent) {
        return {
          code: 'node-not-found',
          message: `UI document parent node "${command.parentId}" was not found.`,
          nodeId: command.parentId,
        };
      }
      return {
        type: 'insert-child',
        parentPath: parent.path,
        index: command.index,
        child: command.node,
      };
    }
    case 'remove-node': {
      const resolved = index.get(command.nodeId);
      if (!resolved) {
        return {
          code: 'node-not-found',
          message: `UI document node "${command.nodeId}" was not found.`,
          nodeId: command.nodeId,
        };
      }
      if (resolved.path.length === 0) {
        return {
          code: 'root-structural-command',
          message: 'The UI document root cannot be removed.',
          nodeId: command.nodeId,
        };
      }
      return { type: 'remove-widget', path: resolved.path };
    }
    case 'replace-node': {
      const resolved = index.get(command.nodeId);
      if (!resolved) {
        return {
          code: 'node-not-found',
          message: `UI document node "${command.nodeId}" was not found.`,
          nodeId: command.nodeId,
        };
      }
      if (command.node.id !== command.nodeId) {
        return {
          code: 'replacement-id-mismatch',
          message: 'A replacement node must preserve the target root node id.',
          nodeId: command.nodeId,
        };
      }
      return { type: 'replace-widget', path: resolved.path, widget: command.node };
    }
    case 'move-node': {
      const source = index.get(command.nodeId);
      const target = index.get(command.targetParentId);
      if (!source || !target) {
        const missingId = !source ? command.nodeId : command.targetParentId;
        return {
          code: 'node-not-found',
          message: `UI document node "${missingId}" was not found.`,
          nodeId: missingId,
        };
      }
      if (source.path.length === 0) {
        return {
          code: 'root-structural-command',
          message: 'The UI document root cannot be moved.',
          nodeId: command.nodeId,
        };
      }
      if (widgetPathStartsWith(target.path, source.path)) {
        return {
          code: 'patch-rejected',
          message: 'A UI document node cannot be moved into itself or its descendant.',
          nodeId: command.nodeId,
        };
      }
      return {
        type: 'reparent-widget',
        fromPath: source.path,
        toParentPath: target.path,
        insertIndex: command.index,
      };
    }
    case 'set-property': {
      if (!isCanonicalText(command.propertyId)) {
        return {
          code: 'blank-property-id',
          message: 'UI document property id must be non-blank and already trimmed.',
          nodeId: command.nodeId,
        };
      }
      return replaceAuthoringNode(index, command.nodeId, (node) => {
        const authoring = readUiDocumentNodeAuthoring(node)!;
        const properties = createOwnValueMap(authoring.properties);
        if (command.value === undefined) {
          delete properties[command.propertyId];
        } else {
          setOwnValue(properties, command.propertyId, command.value);
        }
        return {
          ...node,
          $authoring: { ...authoring, properties },
        } as UiDocumentNode;
      });
    }
    case 'set-layout':
      return replaceAuthoringNode(index, command.nodeId, (node) => {
        const authoring = readUiDocumentNodeAuthoring(node)!;
        return {
          ...node,
          $authoring: {
            ...authoring,
            layout: {
              strategyId: command.strategyId,
              values: createOwnValueMap(command.values),
            },
          },
        } as UiDocumentNode;
      });
  }
}

function validateSubtreeIdentityAgainstDocument(
  command: Extract<UiDocumentCommand, { readonly type: 'insert-node' | 'replace-node' }>,
  index: CommandIndex,
): readonly UiDocumentIssue[] {
  const issues = [...validateUiDocumentRoot(command.node)];
  if (issues.length > 0) return issues;

  const replacedPath =
    command.type === 'replace-node' ? index.get(command.nodeId)?.path : undefined;
  for (const entry of collectWidgetNodes(command.node)) {
    const existing = index.get(entry.widget.id as string);
    if (
      existing &&
      (replacedPath === undefined || !widgetPathStartsWith(existing.path, replacedPath))
    ) {
      issues.push({
        code: 'duplicate-node-id',
        message: `UI document node id "${entry.widget.id as string}" already exists.`,
        path: 'command.node.id',
        nodeId: entry.widget.id as string,
      });
    }
  }
  return issues;
}

function validateCommandPayload(
  command: UiDocumentCommand,
  index: CommandIndex,
): readonly UiDocumentIssue[] {
  if (command.type === 'insert-node' || command.type === 'replace-node') {
    return validateSubtreeIdentityAgainstDocument(command, index);
  }
  if (command.type === 'set-property' && command.value !== undefined) {
    return isStructurallyValidUiValueSource(command.value)
      ? []
      : [
          {
            code: 'invalid-property-value',
            message: 'UI document property command requires a structurally valid UiValueSource.',
            path: 'command.value',
            nodeId: command.nodeId,
            propertyId: command.propertyId,
          },
        ];
  }
  if (command.type === 'set-layout') {
    const issues: UiDocumentIssue[] = [];
    if (!isCanonicalText(command.strategyId)) {
      issues.push({
        code: 'invalid-layout-strategy',
        message: 'UI document layout commands require a canonical strategy id.',
        path: 'command.strategyId',
        nodeId: command.nodeId,
      });
    }
    for (const [propertyId, value] of Object.entries(command.values)) {
      if (!isCanonicalText(propertyId) || !isStructurallyValidUiValueSource(value)) {
        issues.push({
          code: 'invalid-layout-value',
          message: 'UI document layout commands require canonical property ids and values.',
          path: `command.values.${propertyId}`,
          nodeId: command.nodeId,
          propertyId,
        });
      }
    }
    return issues;
  }
  return [];
}

function canAcceptChild(parent: GenericWidget, index: number, movingNodeId?: string): boolean {
  if (!Number.isInteger(index) || index < 0 || !isContainerWidget(parent)) return false;
  const existingSingleChild = isGenericWidget(parent.child) ? parent.child : null;
  if (isSingleChildContainerType(parent.type) || existingSingleChild !== null) {
    return (
      index === 0 &&
      (existingSingleChild === null ||
        (movingNodeId !== undefined && existingSingleChild.id === movingNodeId))
    );
  }
  return index <= getWidgetChildren(parent).length;
}

function validateStructuralTarget(
  command: UiDocumentCommand,
  index: CommandIndex,
): UiDocumentCommandIssue | null {
  if (command.type === 'insert-node') {
    const parent = index.get(command.parentId)?.node;
    if (parent && !canAcceptChild(parent, command.index)) {
      return {
        code: 'patch-rejected',
        message: 'The target parent cannot accept the inserted UI document node.',
        nodeId: command.parentId,
      };
    }
  }
  if (command.type === 'move-node') {
    const parent = index.get(command.targetParentId)?.node;
    if (parent && !canAcceptChild(parent, command.index, command.nodeId)) {
      return {
        code: 'patch-rejected',
        message: 'The target parent cannot accept the moved UI document node.',
        nodeId: command.targetParentId,
      };
    }
  }
  return null;
}

function isLegitimateMoveNoop(command: UiDocumentCommand, index: CommandIndex): boolean {
  if (command.type !== 'move-node') return false;
  const sourcePath = index.get(command.nodeId)?.path;
  const targetPath = index.get(command.targetParentId)?.path;
  if (!sourcePath || !targetPath) return false;
  const sourceParentPath = sourcePath.slice(0, -1);
  const sourceSegment = sourcePath[sourcePath.length - 1];
  if (!widgetPathEquals(sourceParentPath, targetPath)) return false;
  if (sourceSegment?.kind === 'child') return command.index === 0;
  if (sourceSegment?.kind !== 'children') return false;
  const adjustedIndex = command.index > sourceSegment.index ? command.index - 1 : command.index;
  return adjustedIndex === sourceSegment.index;
}

export function applyUiDocumentCommand(
  document: UiDocument,
  command: UiDocumentCommand,
): ApplyUiDocumentCommandResult {
  let safeCommand: UiDocumentCommand;
  try {
    safeCommand = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(command));
  } catch (error) {
    return fail(document, {
      code: 'invalid-command-payload',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!isCanonicalText(safeCommand.commandId)) {
    return fail(document, {
      code: 'blank-command-id',
      message: 'UI document command id must be non-blank and already trimmed.',
    });
  }

  const index = createCommandIndex(document);
  const payloadIssues = validateCommandPayload(safeCommand, index);
  if (payloadIssues.length > 0) return fail(document, ...payloadIssues);

  const structuralIssue = validateStructuralTarget(safeCommand, index);
  if (structuralIssue) return fail(document, structuralIssue);

  const patch = toPatch(index, safeCommand);
  if ('code' in patch) return fail(document, patch);

  const applied = applyWidgetPatch(document.root, patch);
  if (!applied.changed) {
    if (
      safeCommand.type === 'insert-node' ||
      safeCommand.type === 'remove-node' ||
      (safeCommand.type === 'move-node' && !isLegitimateMoveNoop(safeCommand, index))
    ) {
      return fail(document, {
        code: 'patch-rejected',
        message: 'The UI document structural patch was rejected by the current tree.',
        ...('nodeId' in safeCommand ? { nodeId: safeCommand.nodeId } : {}),
      });
    }
    return { document, transaction: null, issues: Object.freeze([]), changed: false };
  }

  const nextRevision = document.revision + 1;
  const nextResult = createUiDocumentFromRoot(document.documentId, nextRevision, applied.root);
  if (nextResult.document === null) return fail(document, ...nextResult.issues);

  const beforeCanonical = formatWidgetDocumentJson(document.root);
  if (beforeCanonical === nextResult.document.source) {
    return { document, transaction: null, issues: Object.freeze([]), changed: false };
  }

  const transaction = deepFreezeUiAuthoringValue({
    transactionId: `${safeCommand.commandId}@${document.revision}->${nextRevision}`,
    command: safeCommand,
    baseRevision: document.revision,
    nextRevision,
    patches: [cloneUiAuthoringJsonValue(patch)],
  } as const);
  return {
    document: nextResult.document,
    transaction,
    issues: Object.freeze([]),
    changed: true,
  };
}
