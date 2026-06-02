import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@newchobo-ui/react/styles.css';
import './sample.css';
import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
