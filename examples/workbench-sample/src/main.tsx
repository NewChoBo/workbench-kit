import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@workbench-kit/react/styles.css';

import { App } from './App.js';
import './host.css';

document.documentElement.dataset.theme = 'dark';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Sample host root element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
