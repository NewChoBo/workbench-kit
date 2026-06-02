import type { Preview } from '@storybook/react-vite';
import '../packages/react/src/styles.css';
import './preview.css';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = 'dark';
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
