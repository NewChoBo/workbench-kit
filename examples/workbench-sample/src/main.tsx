import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import cssWorkerUrl from 'monaco-editor/language/css/css.worker?worker&url';
import htmlWorkerUrl from 'monaco-editor/language/html/html.worker?worker&url';
import jsonWorkerUrl from 'monaco-editor/language/json/json.worker?worker&url';
import tsWorkerUrl from 'monaco-editor/language/typescript/ts.worker?worker&url';
import editorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url';

import '@workbench-kit/react/styles.css';

import { createSampleHost } from './createSampleHost.js';
import './host.css';

const monacoEnvironmentGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker?: (_moduleId: string, label: string) => Worker;
  };
};

monacoEnvironmentGlobal.MonacoEnvironment = {
  ...monacoEnvironmentGlobal.MonacoEnvironment,
  getWorker: (_moduleId: string, label: string) => {
    const workerUrl = getMonacoWorkerUrl(label);
    return new Worker(workerUrl, { name: `monaco-${label}-worker`, type: 'module' });
  },
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Sample host root element #root was not found.');
}

createRoot(rootElement).render(<StrictMode>{createSampleHost()}</StrictMode>);

function getMonacoWorkerUrl(label: string): string {
  if (label === 'json') return jsonWorkerUrl;
  if (label === 'css' || label === 'scss' || label === 'less') return cssWorkerUrl;
  if (label === 'html' || label === 'handlebars' || label === 'razor') return htmlWorkerUrl;
  if (label === 'typescript' || label === 'javascript') return tsWorkerUrl;

  return editorWorkerUrl;
}
