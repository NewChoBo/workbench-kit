import type { Preview } from '@storybook/react-vite';
import { createElement } from 'react';
// Side-effect first: install workers without importing the monaco barrel (Editor/loader).
import './preview-monaco-environment';
import '../packages/react/src/styles.css';
import './preview.css';
import monitorViewports from './monitor-viewports';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = 'dark';
}

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const grid = context.parameters.storybookGrid ?? {};
      const fullHeightShell = context.parameters.fullHeightShell as string | undefined;
      const isGridEnabled = grid.enabled !== false && !fullHeightShell;
      const gridSize = grid.size ?? 16;
      const gridColor = grid.color ?? 'rgba(255,255,255,0.12)';
      const gridBackground = isGridEnabled
        ? `linear-gradient(${gridColor} 1px, transparent 0) 0 0 / ${gridSize}px ${gridSize}px,
         linear-gradient(90deg, ${gridColor} 1px, transparent 0) 0 0 / ${gridSize}px ${gridSize}px`
        : 'none';

      const shellHeight = fullHeightShell ?? '100%';

      return createElement(
        'div',
        {
          style: {
            width: '100%',
            height: shellHeight,
            minHeight: fullHeightShell ?? '100%',
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
    options: {
      storySort: {
        order: ['Workbench Sample', 'React'],
        method: 'alphabetical',
        locales: 'en-US',
      },
    },
    layout: 'fullscreen',
    backgrounds: {
      options: {
        workbench: { name: 'workbench', value: '#0d1117' },
        surface: { name: 'surface', value: '#161b22' },
        light: { name: 'light', value: '#ffffff' },
      },
    },
    viewport: {
      options: monitorViewports,
    },
    storybookGrid: {
      enabled: true,
      size: 16,
      color: 'rgba(255,255,255,0.12)',
    },
  },

  initialGlobals: {
    viewport: {
      value: 'monitor-1366x768',
      isRotated: false,
    },

    backgrounds: {
      value: 'workbench',
    },
  },
};

export default preview;
