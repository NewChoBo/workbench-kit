import type {
  StatusBarItemModel,
  StatusBarSectionModel,
} from '@workbench-kit/react/workbench/shell';

export interface WorkspaceResourceStatusItemsInput {
  fileCount: number;
  fileItemId?: string | undefined;
  fileTitle?: string | undefined;
  folderCount: number;
  folderItemId?: string | undefined;
  folderTitle?: string | undefined;
}

export function createWorkspaceResourceStatusItems({
  fileCount,
  fileItemId = 'workbench.workspace.files',
  fileTitle = 'Workspace files',
  folderCount,
  folderItemId = 'workbench.workspace.folders',
  folderTitle = 'Workspace folders',
}: WorkspaceResourceStatusItemsInput): StatusBarItemModel[] {
  return [
    {
      icon: 'files',
      id: fileItemId,
      label: `${fileCount} files`,
      title: fileTitle,
    },
    {
      icon: 'folder',
      id: folderItemId,
      label: `${folderCount} folders`,
      title: folderTitle,
    },
  ];
}

export function mergeWorkbenchStatusSections(
  ...sectionGroups: ReadonlyArray<readonly StatusBarSectionModel[]>
): StatusBarSectionModel[] {
  return sectionGroups.flat().filter((section) => section.items.length > 0);
}
