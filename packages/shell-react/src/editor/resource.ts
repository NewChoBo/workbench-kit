import {
  JDW_SCHEMA_DOCUMENT_FILE_EXTENSION,
  JDW_SCHEMA_DOCUMENT_MIME,
  JDW_WIDGET_DOCUMENT_FILE_EXTENSION,
  JDW_WIDGET_DOCUMENT_MIME,
} from '@workbench-kit/react/jdw/document';
import { parseWorkspaceResourceUri } from '@workbench-kit/workspace';

export function pathForResource(resourceUri: string): string {
  const workspaceUri = parseWorkspaceResourceUri(resourceUri);
  return workspaceUri?.kind === 'file' ? workspaceUri.path : resourceUri;
}

export function copyResourcePath(resourceUri: string): void {
  const path = pathForResource(resourceUri);
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) return;

  void clipboard.writeText(path).catch(() => undefined);
}

export function mimeTypeForResource(resourceUri: string): string | undefined {
  const path = pathForResource(resourceUri).toLowerCase();

  if (path.endsWith(JDW_SCHEMA_DOCUMENT_FILE_EXTENSION)) return JDW_SCHEMA_DOCUMENT_MIME;
  if (path.endsWith(JDW_WIDGET_DOCUMENT_FILE_EXTENSION)) return JDW_WIDGET_DOCUMENT_MIME;
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text/typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.md') || path.endsWith('.mdx')) return 'text/markdown';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'text/yaml';

  return undefined;
}
