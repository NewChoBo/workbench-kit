import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installMonacoEnvironment } from '@workbench-kit/monaco';
import cssWorkerUrl from 'monaco-editor/language/css/css.worker?worker&url';
import htmlWorkerUrl from 'monaco-editor/language/html/html.worker?worker&url';
import jsonWorkerUrl from 'monaco-editor/language/json/json.worker?worker&url';
import tsWorkerUrl from 'monaco-editor/language/typescript/ts.worker?worker&url';
import editorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url';

import '@workbench-kit/react/styles.css';

import { createSampleHost } from './createSampleHost.js';
import './host.css';

installMonacoEnvironment({
  css: cssWorkerUrl,
  editor: editorWorkerUrl,
  html: htmlWorkerUrl,
  json: jsonWorkerUrl,
  typescript: tsWorkerUrl,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Sample host root element #root was not found.');
}

createRoot(rootElement).render(<StrictMode>{createSampleHost()}</StrictMode>);
