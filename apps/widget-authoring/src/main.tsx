import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@workbench-kit/react/styles.css';

import { AuthoringStudioPage } from './features/authoring/AuthoringStudioPage.js';
import './app.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <AuthoringStudioPage />
  </StrictMode>,
);
