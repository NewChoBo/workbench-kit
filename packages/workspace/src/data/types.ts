export type WorkspaceNodeType = 'file' | 'folder';
export type WorkspaceFileSource = 'assistant' | 'user';
export type WorkspaceSearchMatchKind = 'Content match' | 'Path match';

export interface WorkspaceFile {
  content: string;
  mimeType?: string;
  path: string;
  source?: WorkspaceFileSource;
  updatedAt?: string;
}

export interface WorkspaceTreeNode {
  children: WorkspaceTreeNode[];
  file?: WorkspaceFile;
  name: string;
  path: string;
  type: WorkspaceNodeType;
}

export interface VisibleWorkspaceNode {
  depth: number;
  node: WorkspaceTreeNode;
}

export interface WorkspaceSearchResult {
  file: WorkspaceFile;
  id: string;
  line: number;
  matchedBy: WorkspaceSearchMatchKind;
  path: string;
  preview: string;
}

export interface WorkspaceHighlightPart {
  match: boolean;
  text: string;
}
