import { extensionOfPath } from './path';

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
  return EXTENSION_MIME[extensionOfPath(path)] ?? 'text/plain';
}
