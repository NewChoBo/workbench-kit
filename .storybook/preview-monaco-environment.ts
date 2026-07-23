import { installMonacoEnvironment } from '@workbench-kit/monaco/environment';
import cssWorker from 'monaco-editor/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';

if (typeof window !== 'undefined') {
  installMonacoEnvironment({
    css: () => new cssWorker(),
    editor: () => new editorWorker(),
    html: () => new htmlWorker(),
    json: () => new jsonWorker(),
    typescript: () => new tsWorker(),
  });
}
