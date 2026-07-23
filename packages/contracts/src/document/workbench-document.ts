export interface WorkbenchDocumentMeta {
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

export type WorkbenchNodeType =
  | 'frame'
  | 'group'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'image'
  | 'vector'
  | 'component'
  | 'instance'
  | (string & {});

export interface WorkbenchVisualStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  boxShadow?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontWeight?: number | string;
  [key: string]: unknown;
}

export interface WorkbenchNodeLayout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotate?: number;
  zIndex?: number;
}

export interface WorkbenchNodeConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  lockedAspectRatio?: boolean;
  preserveAspect?: boolean;
}

export interface WorkbenchDocumentNodeBase {
  id: string;
  type: WorkbenchNodeType;
  name: string;
  parentId?: string;
  visible?: boolean;
  locked?: boolean;
  style?: WorkbenchVisualStyle;
  layout?: WorkbenchNodeLayout;
  constraints?: WorkbenchNodeConstraints;
  metadata?: Record<string, unknown>;
}

export interface WorkbenchDocumentLeafNode extends WorkbenchDocumentNodeBase {
  type: 'text' | 'rectangle' | 'circle' | 'image' | 'vector';
  children?: never;
  content?: string;
  src?: string;
}

export interface WorkbenchDocumentContainerNode extends WorkbenchDocumentNodeBase {
  type: 'frame' | 'group' | 'component' | 'instance';
  children: string[];
}

export type WorkbenchDocumentNode = WorkbenchDocumentLeafNode | WorkbenchDocumentContainerNode;

export interface WorkbenchPage {
  id: string;
  name: string;
  width?: number;
  height?: number;
  background?: string;
  nodes: WorkbenchDocumentNode[];
}

export interface WorkbenchDocument {
  version: string;
  schemaVersion: 1;
  metadata?: WorkbenchDocumentMeta;
  pages: WorkbenchPage[];
}

export type WorkbenchDocumentPatchOp =
  | { op: 'add'; path: string; value: WorkbenchDocumentNode }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string };

export interface WorkbenchDocumentPatch {
  id: string;
  schemaVersion: 1;
  timestamp: string;
  actor?: string;
  ops: WorkbenchDocumentPatchOp[];
}

export interface WorkbenchDocumentAdapter {
  toDocument: (files: readonly unknown[]) => WorkbenchDocument;
  fromDocument: (document: WorkbenchDocument) => unknown[];
}

export interface WorkbenchDocumentRenderContext {
  scale?: number;
  selectedNodeIds?: readonly string[];
  hoveredNodeId?: string;
}

export interface WorkspaceToWorkbenchDocumentOptions {
  pageId?: string;
  pageName?: string;
  version?: string;
}

export interface WorkbenchToWorkspaceConversionOptions {
  includeNonTextNodes?: boolean;
}

export type WorkbenchDocumentActionType =
  | 'create'
  | 'delete'
  | 'move'
  | 'rename'
  | 'replace-style'
  | 'replace-layout'
  | 'replace-content'
  | 'replace'
  | 'apply-patch';

export interface WorkbenchDocumentActionBase {
  action: WorkbenchDocumentActionType;
  actor?: string;
  sourcePatchId?: string;
  timestamp?: string;
}

export interface WorkbenchDocumentCreateAction extends WorkbenchDocumentActionBase {
  action: 'create';
  pageId: string;
  node: WorkbenchDocumentNode;
  insertAfterId?: string;
}

export interface WorkbenchDocumentDeleteAction extends WorkbenchDocumentActionBase {
  action: 'delete';
  pageId: string;
  nodeId: string;
}

export interface WorkbenchDocumentMoveAction extends WorkbenchDocumentActionBase {
  action: 'move';
  pageId: string;
  nodeId: string;
  insertAfterId?: string;
}

export interface WorkbenchDocumentRenameAction extends WorkbenchDocumentActionBase {
  action: 'rename';
  pageId: string;
  nodeId: string;
  name: string;
}

export interface WorkbenchDocumentReplaceContentAction extends WorkbenchDocumentActionBase {
  action: 'replace-content';
  pageId: string;
  nodeId: string;
  content: string;
}

export interface WorkbenchDocumentReplaceStyleAction extends WorkbenchDocumentActionBase {
  action: 'replace-style';
  pageId: string;
  nodeId: string;
  style: Record<string, unknown>;
}

export interface WorkbenchDocumentReplaceLayoutAction extends WorkbenchDocumentActionBase {
  action: 'replace-layout';
  pageId: string;
  nodeId: string;
  layout: Record<string, unknown>;
}

export interface WorkbenchDocumentReplaceAction extends WorkbenchDocumentActionBase {
  action: 'replace';
  pageId: string;
  nodeId: string;
  node: WorkbenchDocumentNode;
}

export interface WorkbenchDocumentPatchAction extends WorkbenchDocumentActionBase {
  action: 'apply-patch';
  patch: WorkbenchDocumentPatch;
}

export type WorkbenchDocumentAction =
  | WorkbenchDocumentCreateAction
  | WorkbenchDocumentDeleteAction
  | WorkbenchDocumentMoveAction
  | WorkbenchDocumentRenameAction
  | WorkbenchDocumentReplaceStyleAction
  | WorkbenchDocumentReplaceLayoutAction
  | WorkbenchDocumentReplaceContentAction
  | WorkbenchDocumentReplaceAction
  | WorkbenchDocumentPatchAction;

export interface WorkbenchDocumentActionResult {
  patch: WorkbenchDocumentPatch;
  previewId: string;
}
