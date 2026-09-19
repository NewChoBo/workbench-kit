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

const root = createRoot(rootElement);
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('backend-lab')) {
  void import('./testing/SampleBackendLab.js').then(({ SampleBackendLab }) => {
    root.render(
      <StrictMode>
        <SampleBackendLab />
      </StrictMode>,
    );
  });
} else {
  root.render(<StrictMode>{createSampleHost()}</StrictMode>);
}
