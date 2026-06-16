import { extensionOfPath } from './path';
import { JDW_DOCUMENT_FILE_EXTENSION, JDW_DOCUMENT_MIME } from '../../jdw/document';

const EXTENSION_MIME: Record<string, string> = {
  css: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  jsx: 'text/javascript',
  md: 'text/markdown',
  mjs: 'text/javascript',
  png: 'image/png',
  sql: 'text/x-sql',
  svg: 'image/svg+xml',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  txt: 'text/plain',
  vue: 'text/html',
  xml: 'application/xml',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  zip: 'application/zip',
};

export function mimeTypeForPath(path: string): string {
  if (path.toLowerCase().endsWith(JDW_DOCUMENT_FILE_EXTENSION)) {
    return JDW_DOCUMENT_MIME;
  }

  return EXTENSION_MIME[extensionOfPath(path)] ?? 'text/plain';
}
