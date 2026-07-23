import './monaco-environment.js';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@workbench-kit/react/styles.css';

import { createSampleHost } from './createSampleHost.js';
import './host.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Sample host root element #root was not found.');
}

createRoot(rootElement).render(<StrictMode>{createSampleHost()}</StrictMode>);
