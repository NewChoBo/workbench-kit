import { cxCodicon } from '../../utils/codicon';
import {
  JDW_DOCUMENT_MIME,
  JDW_SCHEMA_DOCUMENT_MIME,
  isJdwDocumentPath,
  isJdwSchemaDocumentPath,
} from '../../jdw/document';
import { extensionOfPath, fileNameOfPath } from './path';

export type WorkspaceFileIconKind =
  | 'archive'
  | 'config'
  | 'css'
  | 'default'
  | 'env'
  | 'folder'
  | 'git'
  | 'html'
  | 'image'
  | 'jdw'
  | 'jdw-schema'
  | 'javascript'
  | 'json'
  | 'lock'
  | 'markdown'
  | 'package'
  | 'pdf'
  | 'schema'
  | 'sql'
  | 'text'
  | 'typescript'
  | 'vue'
  | 'xml'
  | 'yaml';

export function fileIconKindForPath(path: string, mimeType?: string): WorkspaceFileIconKind {
  const fileName = fileNameOfPath(path).toLowerCase();
  const extension = extensionOfPath(path);

  if (fileName === 'package.json') return 'package';
  if (fileName.endsWith('.lock') || fileName.includes('lock')) return 'lock';
  if (fileName.startsWith('.env')) return 'env';
  if (fileName.startsWith('.git')) return 'git';
  if (isJdwSchemaDocumentPath(path) || mimeType === JDW_SCHEMA_DOCUMENT_MIME) return 'jdw-schema';
  if (isJdwDocumentPath(path) || mimeType === JDW_DOCUMENT_MIME) return 'jdw';
  if (fileName.endsWith('.schema.json') || mimeType === 'application/schema+json') return 'schema';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';

  switch (extension) {
    case '7z':
    case 'gz':
    case 'rar':
    case 'tar':
    case 'zip':
      return 'archive';
    case 'css':
    case 'less':
    case 'scss':
      return 'css';
    case 'html':
      return 'html';
    case 'jpeg':
    case 'jpg':
    case 'png':
    case 'svg':
    case 'webp':
      return 'image';
    case 'cjs':
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'vue':
      return 'vue';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'ini':
    case 'toml':
      return 'config';
    case 'txt':
      return 'text';
    default:
      return 'default';
  }
}

export function codiconForFileKind(kind: WorkspaceFileIconKind) {
  switch (kind) {
    case 'archive':
      return 'codicon-file-zip';
    case 'config':
      return 'codicon-settings';
    case 'css':
      return 'codicon-symbol-color';
    case 'env':
      return 'codicon-key';
    case 'folder':
      return 'codicon-folder';
    case 'git':
      return 'codicon-source-control';
    case 'html':
      return 'codicon-code';
    case 'image':
      return 'codicon-file-media';
    case 'jdw':
      return 'codicon-layout';
    case 'jdw-schema':
      return 'codicon-symbol-property';
    case 'javascript':
      return 'codicon-symbol-method';
    case 'json':
      return 'codicon-json';
    case 'lock':
      return 'codicon-lock';
    case 'markdown':
      return 'codicon-markdown';
    case 'package':
      return 'codicon-package';
    case 'pdf':
      return 'codicon-file-pdf';
    case 'schema':
      return 'codicon-symbol-property';
    case 'sql':
      return 'codicon-database';
    case 'text':
      return 'codicon-file-text';
    case 'typescript':
      return 'codicon-symbol-class';
    case 'vue':
      return 'codicon-symbol-object';
    case 'xml':
      return 'codicon-code';
    case 'yaml':
      return 'codicon-symbol-property';
    default:
      return 'codicon-file';
  }
}

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
  const kind = directory ? 'folder' : fileIconKindForPath(path, mimeType);
  const icon = directory && expanded ? 'codicon-folder-opened' : codiconForFileKind(kind);

  return (
    <i
      aria-hidden="true"
      className={cxCodicon(icon, 'workspace-file-icon', className)}
      data-file-kind={kind}
    />
  );
}
