import {
  buildWorkspaceTree,
  type WorkspaceFile,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';

export function buildWorkspaceExplorerNodes({
  files,
  folders,
}: {
  readonly files: readonly WorkspaceFile[];
  readonly folders: readonly string[];
}): WorkspaceTreeNode[] {
  return buildWorkspaceTree([...folders], [...files]);
}

export function resolveWorkspaceExplorerSectionTitle(
  files: readonly Pick<WorkspaceFile, 'content' | 'path'>[],
): string {
  const workspaceFile = files.find((file) => file.path === '.workbench/workspace.json');
  if (!workspaceFile?.content) {
    return 'Workspace';
  }

  try {
    const parsed = JSON.parse(workspaceFile.content) as {
      folders?: Array<{ name?: unknown }>;
      name?: unknown;
    };
    const folderName = parsed.folders?.[0]?.name;
    if (typeof folderName === 'string' && folderName.trim().length > 0) {
      return folderName.trim();
    }

    const name = parsed.name;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
  } catch {
    // Ignore invalid workspace metadata and fall back to the default label.
  }

  return 'Workspace';
}
