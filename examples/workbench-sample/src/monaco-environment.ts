import { installMonacoEnvironment } from '@workbench-kit/monaco/environment';
import cssWorkerUrl from 'monaco-editor/language/css/css.worker?worker&url';
import htmlWorkerUrl from 'monaco-editor/language/html/html.worker?worker&url';
import jsonWorkerUrl from 'monaco-editor/language/json/json.worker?worker&url';
import tsWorkerUrl from 'monaco-editor/language/typescript/ts.worker?worker&url';
import editorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url';

installMonacoEnvironment({
  css: cssWorkerUrl,
  editor: editorWorkerUrl,
  html: htmlWorkerUrl,
  json: jsonWorkerUrl,
  typescript: tsWorkerUrl,
});
