import type { Preview } from '@storybook/react-vite';
import { createElement } from 'react';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import '../packages/react/src/styles.css';
import './preview.css';
import monitorViewports from './monitor-viewports';

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
  decorators: [
    (Story, context) => {
      const grid = context.parameters.storybookGrid ?? {};
      const isGridEnabled = grid.enabled !== false;
      const gridSize = grid.size ?? 16;
      const gridColor = grid.color ?? 'rgba(255,255,255,0.12)';
      const gridBackground = isGridEnabled
        ? `linear-gradient(${gridColor} 1px, transparent 0) 0 0 / ${gridSize}px ${gridSize}px,
         linear-gradient(90deg, ${gridColor} 1px, transparent 0) 0 0 / ${gridSize}px ${gridSize}px`
        : 'none';

      return createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            minHeight: '100%',
            minWidth: '100%',
            overflow: 'hidden',
            backgroundImage: gridBackground,
            backgroundPosition: 'center center',
          },
        },
        createElement(Story),
      );
    },
  ],
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
    viewport: {
      viewports: monitorViewports,
      defaultViewport: 'monitor-1366x768',
    },
    storybookGrid: {
      enabled: true,
      size: 16,
      color: 'rgba(255,255,255,0.12)',
    },
  },
};

export default preview;
