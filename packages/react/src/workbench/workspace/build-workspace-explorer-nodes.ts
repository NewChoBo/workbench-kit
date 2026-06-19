import { buildWorkspaceTree, type WorkspaceFile, type WorkspaceTreeNode } from '@workbench-kit/workspace';

export function buildWorkspaceExplorerNodes({
  files,
  folders,
}: {
  readonly files: readonly WorkspaceFile[];
  readonly folders: readonly string[];
}): WorkspaceTreeNode[] {
  return buildWorkspaceTree([...folders], [...files]);
}
