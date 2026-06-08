import type { WorkspaceFile } from './save';
import type {
  WorkbenchDocument,
  WorkbenchDocumentContainerNode,
  WorkbenchDocumentLeafNode,
  WorkbenchDocumentNode,
  WorkbenchPage,
  WorkbenchToWorkspaceConversionOptions,
  WorkspaceToWorkbenchDocumentOptions,
} from './workbench-document';

const DEFAULT_PAGE_ID = 'page-main';
const DEFAULT_PAGE_NAME = 'Main';
const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_VERSION = '1.0.0';

function toNodeId(path: string): string {
  return `node:${path}`;
}

function toFrameId(path: string): string {
  return `frame:${path}`;
}

function folderParts(path: string): string[] {
  const trimmed = path.replace(/^[\\/]+|[\\/]+$/g, '');
  if (!trimmed) {
    return [];
  }
  return trimmed.split(/[\\/]+/);
}

function ensureFrameNode(
  registry: Map<string, WorkbenchDocumentContainerNode>,
  pageNodes: WorkbenchDocumentNode[],
  parts: string[],
): string | undefined {
  if (!parts.length) {
    return undefined;
  }

  const folderPath = parts.join('/');
  const id = toFrameId(folderPath);
  if (registry.has(id)) {
    return id;
  }

  const node: WorkbenchDocumentContainerNode = {
    id,
    type: 'component',
    name: parts[parts.length - 1],
    children: [],
    style: {
      backgroundColor: 'transparent',
    },
    metadata: {
      workspacePath: folderPath,
      workspaceType: 'folder',
    },
  };

  registry.set(id, node);
  pageNodes.push(node);

  const parentPath = parts.slice(0, -1);
  const parentId =
    parentPath.length > 0 ? ensureFrameNode(registry, pageNodes, parentPath) : undefined;
  if (parentId) {
    const parent = registry.get(parentId);
    if (parent) {
      parent.children = Array.from(new Set([...parent.children, node.id]));
      node.parentId = parent.id;
    }
  }

  return node.id;
}

function createTextNode(file: WorkspaceFile, path: string): WorkbenchDocumentLeafNode {
  const nameParts = path.split(/[\\/]+/);
  return {
    id: toNodeId(path),
    type: 'text',
    name: nameParts[nameParts.length - 1] ?? path,
    content: file.content,
    style: {
      fontSize: 12,
      color: '#0f172a',
      fontFamily: 'monospace',
    },
    layout: {
      x: 0,
      y: 0,
      width: 320,
      height: 180,
    },
    metadata: {
      workspacePath: path,
      workspaceType: 'file',
      updatedAt: file.updatedAt,
      mimeType: file.mimeType,
      source: file.source,
    },
  };
}

export function workspaceFilesToDocument(
  files: readonly WorkspaceFile[],
  options: WorkspaceToWorkbenchDocumentOptions = {},
): WorkbenchDocument {
  const pageId = options.pageId ?? DEFAULT_PAGE_ID;
  const pageName = options.pageName ?? DEFAULT_PAGE_NAME;
  const pageNodes: WorkbenchDocumentNode[] = [];
  const frameRegistry = new Map<string, WorkbenchDocumentContainerNode>();

  for (const file of files) {
    const parts = folderParts(file.path);
    const folderPartsOnly = parts.slice(0, -1);
    const leafNode = createTextNode(file, file.path);
    const parentId =
      folderPartsOnly.length > 0
        ? ensureFrameNode(frameRegistry, pageNodes, folderPartsOnly)
        : undefined;
    if (parentId) {
      leafNode.parentId = parentId;
      const parent = frameRegistry.get(parentId);
      if (parent) {
        parent.children = Array.from(new Set([...parent.children, leafNode.id]));
      }
    }
    pageNodes.push(leafNode);
  }

  const sortedNodes = pageNodes.sort((left, right) => left.id.localeCompare(right.id));
  const page: WorkbenchPage = {
    id: pageId,
    name: pageName,
    nodes: sortedNodes,
  };

  return {
    version: options.version ?? DEFAULT_VERSION,
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    metadata: {
      createdAt: new Date().toISOString(),
      description: 'Workspace document map',
    },
    pages: [page],
  };
}

export function documentNodesToWorkspaceFiles(
  document: WorkbenchDocument,
  options: WorkbenchToWorkspaceConversionOptions = {},
): WorkspaceFile[] {
  const files: WorkspaceFile[] = [];
  const includeNonTextNodes = options.includeNonTextNodes === true;

  for (const page of document.pages) {
    for (const node of page.nodes) {
      const isLeafNode =
        node.type === 'text' ||
        node.type === 'rectangle' ||
        node.type === 'circle' ||
        node.type === 'vector' ||
        node.type === 'image';

      if (!isLeafNode && !includeNonTextNodes) {
        continue;
      }

      if (
        node.type === 'frame' ||
        node.type === 'group' ||
        node.type === 'component' ||
        node.type === 'instance'
      ) {
        continue;
      }

      const textNode = node as WorkbenchDocumentLeafNode;
      const workspacePath =
        typeof textNode.metadata?.workspacePath === 'string'
          ? textNode.metadata.workspacePath
          : textNode.id;
      files.push({
        content: typeof textNode.content === 'string' ? textNode.content : '',
        path: workspacePath,
        updatedAt:
          typeof textNode.metadata?.updatedAt === 'string'
            ? textNode.metadata.updatedAt
            : undefined,
        mimeType:
          typeof textNode.metadata?.mimeType === 'string' ? textNode.metadata.mimeType : undefined,
        source:
          typeof textNode.metadata?.source === 'string'
            ? (textNode.metadata?.source as WorkspaceFile['source'])
            : undefined,
      });
    }
  }

  return files;
}

export function buildWorkspaceDocumentLookup(
  document: WorkbenchDocument,
): Map<string, WorkbenchDocumentNode> {
  const map = new Map<string, WorkbenchDocumentNode>();
  for (const page of document.pages) {
    for (const node of page.nodes) {
      map.set(node.id, node);
    }
  }
  return map;
}
