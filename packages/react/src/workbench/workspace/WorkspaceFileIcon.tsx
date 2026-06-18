import { codiconForFileKind, fileIconKindForPath, type FileIconKind } from '../../icons/file-icon';
import { FileIcon } from '../../primitives/FileIcon';

export interface WorkspaceFileIconProps {
  className?: string;
  directory?: boolean;
  expanded?: boolean;
  mimeType?: string;
  path: string;
}

export function WorkspaceFileIcon({
  className,
  directory,
  expanded,
  mimeType,
  path,
}: WorkspaceFileIconProps) {
  const kind: FileIconKind = directory ? 'folder' : fileIconKindForPath(path, mimeType);
  const icon = directory && expanded ? 'codicon-folder-opened' : codiconForFileKind(kind);

  return <FileIcon className={className} icon={icon} kind={kind} />;
}
