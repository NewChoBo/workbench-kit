import type { Preview } from '@storybook/react-vite';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import '../packages/react/src/styles.css';
import './preview.css';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = 'dark';
}

if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();

      return new editorWorker();
    },
  };
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'workbench',
      values: [
        { name: 'workbench', value: '#0d1117' },
        { name: 'surface', value: '#161b22' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
