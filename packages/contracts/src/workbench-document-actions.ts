import type {
  WorkbenchDocument,
  WorkbenchDocumentAction,
  WorkbenchDocumentActionResult,
  WorkbenchDocumentNode,
  WorkbenchPage,
} from './workbench-document';

export function createPatchFromWorkbenchDocumentAction(
  action: WorkbenchDocumentAction,
  document: WorkbenchDocument,
): WorkbenchDocumentActionResult {
  const findPage = (pageId: string): { page: WorkbenchPage; index: number } | null => {
    const pageIndex = document.pages.findIndex((page) => page.id === pageId);
    if (pageIndex < 0) {
      return null;
    }
    return { page: document.pages[pageIndex], index: pageIndex };
  };

  const findNode = (
    pageId: string,
    nodeId: string,
  ): { index: number; path: string } | null => {
    const entry = findPage(pageId);
    if (!entry) return null;
    const nodeIndex = entry.page.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex < 0) {
      return null;
    }
    return {
      index: nodeIndex,
      path: `/pages/${entry.index}/nodes/${nodeIndex}`,
    };
  };

  switch (action.action) {
    case 'create': {
      const found = findPage(action.pageId);
      if (!found) {
        throw new Error(`Page not found: ${action.pageId}`);
      }

      const insertIndex =
        action.insertAfterId === undefined
          ? found.page.nodes.length
          : (() => {
              const index = found.page.nodes.findIndex((node) => node.id === action.insertAfterId);
              if (index < 0) throw new Error(`Insert after node not found: ${action.insertAfterId}`);
              return index + 1;
            })();

      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [
            {
              op: 'add',
              path: `/pages/${found.index}/nodes/${insertIndex}`,
              value: action.node as WorkbenchDocumentNode,
            },
          ],
        },
      };
    }
    case 'delete': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'remove', path: found.path }],
        },
      };
    }
    case 'move': {
      const source = findNode(action.pageId, action.nodeId);
      if (!source) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      const pageEntry = findPage(action.pageId);
      if (!pageEntry) {
        throw new Error(`Page not found: ${action.pageId}`);
      }
      const targetIndex =
        action.insertAfterId === undefined
          ? pageEntry.page.nodes.length
          : (() => {
              const index = pageEntry.page.nodes.findIndex((node) => node.id === action.insertAfterId);
              if (index < 0) throw new Error(`Insert after node not found: ${action.insertAfterId}`);
              const offset = source.index <= index ? -1 : 0;
              return index + 1 + offset;
            })();
      const clampedTargetIndex = Math.max(Math.min(targetIndex, pageEntry.page.nodes.length), 0);
      const insertPath = `/pages/${pageEntry.index}/nodes/${clampedTargetIndex}`;
      const fromPath = source.path;
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'move', from: fromPath, path: insertPath }],
        },
      };
    }
    case 'rename': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [
            {
              op: 'replace',
              path: `${found.path}/name`,
              value: action.name,
            },
          ],
        },
      };
    }
    case 'replace-style': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'replace', path: `${found.path}/style`, value: action.style }],
        },
      };
    }
    case 'replace-layout': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'replace', path: `${found.path}/layout`, value: action.layout }],
        },
      };
    }
    case 'replace-content': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'replace', path: `${found.path}/content`, value: action.content }],
        },
      };
    }
    case 'replace': {
      const found = findNode(action.pageId, action.nodeId);
      if (!found) {
        throw new Error(`Node not found: ${action.nodeId}`);
      }
      return {
        previewId: action.sourcePatchId ?? cryptoRandomId(),
        patch: {
          id: action.sourcePatchId ?? cryptoRandomId(),
          schemaVersion: document.schemaVersion,
          timestamp: action.timestamp ?? new Date().toISOString(),
          actor: action.actor,
          ops: [{ op: 'replace', path: found.path, value: action.node }],
        },
      };
    }
    case 'apply-patch': {
      if (action.patch.schemaVersion !== document.schemaVersion) {
        throw new Error('apply-patch schemaVersion mismatch');
      }
      return {
        previewId: action.sourcePatchId ?? action.patch.id,
        patch: action.patch,
      };
    }
    default:
      throw new Error(`Unsupported action ${(action as WorkbenchDocumentAction).action}`);
  }
}

function cryptoRandomId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `patch-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
