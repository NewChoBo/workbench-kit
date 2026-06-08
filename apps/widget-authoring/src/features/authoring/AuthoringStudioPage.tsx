import { useCallback, useState } from 'react';
import {
  EMPTY_PLAYGROUND_DOCUMENT,
  WELCOME_PLAYGROUND_DOCUMENT,
  type PlaygroundStarterTemplate,
} from '@workbench-kit/react/json-widget/playground';

import { TemplateGallery } from '../templates/TemplateGallery.js';
import { AuthoringStudioWorkbench } from './AuthoringStudioWorkbench.js';
import {
  clearPersistedDocument,
  loadPersistedDocument,
  persistDocument,
} from './document-storage.js';

type StudioScreen = 'gallery' | 'editor';

export function AuthoringStudioPage() {
  const [initialDocument] = useState(() => loadPersistedDocument(WELCOME_PLAYGROUND_DOCUMENT));
  const [value, setValue] = useState(initialDocument);
  const [baseline, setBaseline] = useState(initialDocument);
  const [screen, setScreen] = useState<StudioScreen>('gallery');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2400);
  }, []);

  const handleDocumentChange = useCallback((next: string) => {
    setValue(next);
    persistDocument(next);
  }, []);

  const handleSaveDocument = useCallback(
    (next: string) => {
      persistDocument(next);
      setBaseline(next);
      showStatus('Layout saved locally.');
    },
    [showStatus],
  );

  const handleReset = useCallback(() => {
    clearPersistedDocument();
    setValue(WELCOME_PLAYGROUND_DOCUMENT);
    setBaseline(WELCOME_PLAYGROUND_DOCUMENT);
    setScreen('gallery');
    showStatus('Restored welcome starter layout.');
  }, [showStatus]);

  const handleSelectTemplate = useCallback(
    (template: PlaygroundStarterTemplate) => {
      setValue(template.document);
      setBaseline(template.document);
      persistDocument(template.document);
      setScreen('editor');
      showStatus(`Loaded template: ${template.label}`);
    },
    [showStatus],
  );

  const handleStartBlank = useCallback(() => {
    setValue(EMPTY_PLAYGROUND_DOCUMENT);
    setBaseline(EMPTY_PLAYGROUND_DOCUMENT);
    persistDocument(EMPTY_PLAYGROUND_DOCUMENT);
    setScreen('editor');
    showStatus('Started with a blank canvas.');
  }, [showStatus]);

  return (
    <div className="widget-authoring-app">
      <header className="widget-authoring-app__header">
        <div className="widget-authoring-app__brand">
          <span className="widget-authoring-app__title">Widget Authoring Studio</span>
          <span className="widget-authoring-app__subtitle">
            Compose layouts, add widgets, and preview JSON-driven UI.
          </span>
        </div>
        <div className="widget-authoring-app__header-actions">
          {statusMessage ? (
            <span className="widget-authoring-app__status" role="status">
              {statusMessage}
            </span>
          ) : null}
          {screen === 'editor' ? (
            <button
              className="widget-authoring-app__reset"
              type="button"
              onClick={() => setScreen('gallery')}
            >
              Templates
            </button>
          ) : null}
          <button className="widget-authoring-app__reset" type="button" onClick={handleReset}>
            Reset to welcome
          </button>
        </div>
      </header>
      <main className="widget-authoring-app__main">
        {screen === 'gallery' ? (
          <TemplateGallery
            onSelectTemplate={handleSelectTemplate}
            onStartBlank={handleStartBlank}
          />
        ) : (
          <AuthoringStudioWorkbench
            baselineValue={baseline}
            exportFilename="widget-layout.json"
            initialValue={initialDocument}
            value={value}
            onDocumentChange={handleDocumentChange}
            onSaveDocument={handleSaveDocument}
          />
        )}
      </main>
    </div>
  );
}
