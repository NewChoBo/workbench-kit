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

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownUiDocumentCommand(value: unknown): value is UiDocumentCommand {
  if (!isPlainRecord(value) || typeof value.type !== 'string') return false;
  switch (value.type) {
    case 'insert-node':
      return (
        typeof value.commandId === 'string' &&
        typeof value.parentId === 'string' &&
        Number.isInteger(value.index) &&
        isGenericWidget(value.node)
      );
    case 'remove-node':
      return typeof value.commandId === 'string' && typeof value.nodeId === 'string';
    case 'replace-node':
      return (
        typeof value.commandId === 'string' &&
        typeof value.nodeId === 'string' &&
        isGenericWidget(value.node)
      );
    case 'move-node':
      return (
        typeof value.commandId === 'string' &&
        typeof value.nodeId === 'string' &&
        typeof value.targetParentId === 'string' &&
        Number.isInteger(value.index)
      );
    case 'set-property':
      return (
        typeof value.commandId === 'string' &&
        typeof value.nodeId === 'string' &&
        typeof value.propertyId === 'string'
      );
    case 'set-layout':
      return (
        typeof value.commandId === 'string' &&
        typeof value.nodeId === 'string' &&
        typeof value.strategyId === 'string' &&
        isPlainRecord(value.values)
      );
    default:
      return false;
  }
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
  const protectedStateIssues = validateV1ProtectedAuthoringState(command, index);
  if (protectedStateIssues.length > 0) return protectedStateIssues;

  const issues: UiDocumentIssue[] = [];

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

interface ProtectedAuthoringState {
  readonly documentSchemaVersion: unknown;
  readonly hasDocumentSchemaVersion: boolean;
  readonly bindings: readonly (readonly [string, string])[];
  readonly hasBindings: boolean;
}

function protectedAuthoringState(widget: GenericWidget): ProtectedAuthoringState {
  const candidate = (widget as unknown as Readonly<Record<string, unknown>>).$authoring;
  const raw: Readonly<Record<string, unknown>> = isPlainRecord(candidate)
    ? candidate
    : Object.freeze({});
  const rawBindings = raw.bindings;
  const bindings =
    rawBindings !== null && typeof rawBindings === 'object' && !Array.isArray(rawBindings)
      ? Object.entries(rawBindings as Readonly<Record<string, unknown>>)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .sort(([left], [right]) => left.localeCompare(right))
      : [];
  return {
    documentSchemaVersion: raw.documentSchemaVersion,
    hasDocumentSchemaVersion: Object.prototype.hasOwnProperty.call(raw, 'documentSchemaVersion'),
    bindings,
    hasBindings: Object.prototype.hasOwnProperty.call(raw, 'bindings'),
  };
}

function protectedStateEquals(
  left: ProtectedAuthoringState,
  right: ProtectedAuthoringState,
): boolean {
  return (
    left.hasDocumentSchemaVersion === right.hasDocumentSchemaVersion &&
    Object.is(left.documentSchemaVersion, right.documentSchemaVersion) &&
    left.hasBindings === right.hasBindings &&
    left.bindings.length === right.bindings.length &&
    left.bindings.every(
      ([inputId, bindingId], index) =>
        inputId === right.bindings[index]?.[0] && bindingId === right.bindings[index]?.[1],
    )
  );
}

function validateV1ProtectedAuthoringState(
  command: Extract<UiDocumentCommand, { readonly type: 'insert-node' | 'replace-node' }>,
  index: CommandIndex,
): readonly UiDocumentIssue[] {
  if (command.type === 'insert-node') {
    for (const entry of collectWidgetNodes(command.node)) {
      const state = protectedAuthoringState(entry.widget);
      if (state.hasBindings || state.hasDocumentSchemaVersion) {
        return [
          {
            code: state.hasBindings
              ? 'bindings-require-document-schema-version'
              : 'nonroot-document-schema-version',
            message: 'V1 insert-node cannot introduce V2 document version or input binding state.',
            path: 'command.node.$authoring',
            nodeId: entry.widget.id as string,
          },
        ];
      }
    }
    return [];
  }

  const current = index.get(command.nodeId);
  if (!current) return [];
  const before = new Map(
    collectWidgetNodes(current.node).map((entry) => [
      entry.widget.id as string,
      protectedAuthoringState(entry.widget),
    ]),
  );
  const after = new Map(
    collectWidgetNodes(command.node).map((entry) => [
      entry.widget.id as string,
      protectedAuthoringState(entry.widget),
    ]),
  );
  const protectedNodeIds = new Set([...before.keys(), ...after.keys()]);
  for (const nodeId of protectedNodeIds) {
    const previous = before.get(nodeId);
    const next = after.get(nodeId);
    const previousProtected =
      previous !== undefined && (previous.hasBindings || previous.hasDocumentSchemaVersion);
    const nextProtected = next !== undefined && (next.hasBindings || next.hasDocumentSchemaVersion);
    if (
      previousProtected !== nextProtected ||
      (previousProtected && nextProtected && !protectedStateEquals(previous!, next!))
    ) {
      return [
        {
          code: 'invalid-input-binding',
          message: 'V1 replace-node must preserve existing V2 authoring state exactly.',
          path: 'command.node.$authoring',
          nodeId,
        },
      ];
    }
  }
  return [];
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
  const existingIssues = validateUiDocumentRoot(document.root);
  if (existingIssues.length > 0) return fail(document, ...existingIssues);

  let safeCommand: UiDocumentCommand;
  try {
    safeCommand = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(command));
  } catch (error) {
    return fail(document, {
      code: 'invalid-command-payload',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!isKnownUiDocumentCommand(safeCommand)) {
    return fail(document, {
      code: 'invalid-command-payload',
      message: 'UI document command payload is not a recognized canonical command.',
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
