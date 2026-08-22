import { formatWidgetDocumentJson } from '../document/document.js';
import { getWidgetAtPath } from '../widget/tree.js';
import { applyWidgetPatch, type WidgetPatch } from '../widget/patch.js';
import {
  createUiDocumentFromRoot,
  findUiDocumentNodePath,
  readUiDocumentNodeAuthoring,
} from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  ApplyUiDocumentCommandResult,
  UiDocument,
  UiDocumentCommand,
  UiDocumentCommandIssue,
  UiDocumentNode,
} from './types.js';

function isCanonicalText(value: string): boolean {
  return value.length > 0 && value === value.trim();
}

function fail(document: UiDocument, issue: UiDocumentCommandIssue): ApplyUiDocumentCommandResult {
  return {
    document,
    transaction: null,
    issues: Object.freeze([issue]),
    changed: false,
  };
}

function resolveNode(
  document: UiDocument,
  nodeId: string,
): {
  readonly node: UiDocumentNode;
  readonly path: NonNullable<ReturnType<typeof findUiDocumentNodePath>>;
} | null {
  const path = findUiDocumentNodePath(document, nodeId);
  if (path === null) return null;
  const node = getWidgetAtPath(document.root, path);
  return node ? { node: node as UiDocumentNode, path } : null;
}

function replaceAuthoringNode(
  document: UiDocument,
  nodeId: string,
  update: (node: UiDocumentNode) => UiDocumentNode,
): WidgetPatch | UiDocumentCommandIssue {
  const resolved = resolveNode(document, nodeId);
  if (resolved === null) {
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

function toPatch(
  document: UiDocument,
  command: UiDocumentCommand,
): WidgetPatch | UiDocumentCommandIssue {
  switch (command.type) {
    case 'insert-node': {
      const parentPath = findUiDocumentNodePath(document, command.parentId);
      if (parentPath === null) {
        return {
          code: 'node-not-found',
          message: `UI document parent node "${command.parentId}" was not found.`,
          nodeId: command.parentId,
        };
      }
      return {
        type: 'insert-child',
        parentPath,
        index: command.index,
        child: command.node,
      };
    }
    case 'remove-node': {
      const path = findUiDocumentNodePath(document, command.nodeId);
      if (path === null) {
        return {
          code: 'node-not-found',
          message: `UI document node "${command.nodeId}" was not found.`,
          nodeId: command.nodeId,
        };
      }
      if (path.length === 0) {
        return {
          code: 'root-structural-command',
          message: 'The UI document root cannot be removed.',
          nodeId: command.nodeId,
        };
      }
      return { type: 'remove-widget', path };
    }
    case 'replace-node': {
      const path = findUiDocumentNodePath(document, command.nodeId);
      if (path === null) {
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
      return { type: 'replace-widget', path, widget: command.node };
    }
    case 'move-node': {
      const fromPath = findUiDocumentNodePath(document, command.nodeId);
      const toParentPath = findUiDocumentNodePath(document, command.targetParentId);
      if (fromPath === null || toParentPath === null) {
        const missingId = fromPath === null ? command.nodeId : command.targetParentId;
        return {
          code: 'node-not-found',
          message: `UI document node "${missingId}" was not found.`,
          nodeId: missingId,
        };
      }
      if (fromPath.length === 0) {
        return {
          code: 'root-structural-command',
          message: 'The UI document root cannot be moved.',
          nodeId: command.nodeId,
        };
      }
      return {
        type: 'reparent-widget',
        fromPath,
        toParentPath,
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
      return replaceAuthoringNode(document, command.nodeId, (node) => {
        const authoring = readUiDocumentNodeAuthoring(node)!;
        const properties: Record<string, unknown> = { ...authoring.properties };
        if (command.value === undefined) {
          delete properties[command.propertyId];
        } else {
          properties[command.propertyId] = command.value;
        }
        return {
          ...node,
          $authoring: {
            ...authoring,
            properties,
          },
        } as UiDocumentNode;
      });
    }
    case 'set-layout':
      return replaceAuthoringNode(document, command.nodeId, (node) => {
        const authoring = readUiDocumentNodeAuthoring(node)!;
        return {
          ...node,
          $authoring: {
            ...authoring,
            layout: {
              strategyId: command.strategyId,
              values: { ...command.values },
            },
          },
        } as UiDocumentNode;
      });
  }
}

export function applyUiDocumentCommand(
  document: UiDocument,
  command: UiDocumentCommand,
): ApplyUiDocumentCommandResult {
  if (!isCanonicalText(command.commandId)) {
    return fail(document, {
      code: 'blank-command-id',
      message: 'UI document command id must be non-blank and already trimmed.',
    });
  }

  const patch = toPatch(document, command);
  if ('code' in patch) return fail(document, patch);

  const applied = applyWidgetPatch(document.root, patch);
  if (!applied.changed) {
    return {
      document,
      transaction: null,
      issues: Object.freeze([]),
      changed: false,
    };
  }

  const nextRevision = document.revision + 1;
  const nextResult = createUiDocumentFromRoot(document.documentId, nextRevision, applied.root);
  if (nextResult.document === null) {
    return {
      document,
      transaction: null,
      issues: nextResult.issues,
      changed: false,
    };
  }
  const beforeCanonical = formatWidgetDocumentJson(document.root);
  if (beforeCanonical === nextResult.document.source) {
    return {
      document,
      transaction: null,
      issues: Object.freeze([]),
      changed: false,
    };
  }

  const transaction = deepFreezeUiAuthoringValue({
    transactionId: `${command.commandId}@${document.revision}->${nextRevision}`,
    command: cloneUiAuthoringJsonValue(command),
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
