import { useEffect } from 'react';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import {
  EditorArea,
  WorkbenchProvider,
  WorkbenchShell,
  useWorkbench,
} from '@workbench-kit/workbench-react';

import { extensionsConfig, initialLayout, initialWorkspace, workspaceInfo } from './bootstrap.js';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();

const SAMPLE_APP_PATH = 'src/App.tsx';
const SAMPLE_README_PATH = 'README.md';
const SAMPLE_CONFIG_PATH = 'config.json';
let sampleWorkspaceInitialized = false;

export function App() {
  return (
    <WorkbenchProvider
      extensionsConfig={extensionsConfig}
      initialLayout={initialLayout}
      workspaceHostPort={workspaceHostPort}
    >
      <WorkspaceInitCommand />
      <WorkbenchShell
        editorArea={
          <>
            <EditorSaveShortcut />
            <EditorArea emptyState={<SampleEditorEmptyState />} />
          </>
        }
        rootClassName="ide-root"
        theme="dark"
      />
    </WorkbenchProvider>
  );
}

function WorkspaceInitCommand() {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    if (sampleWorkspaceInitialized) {
      return;
    }

    sampleWorkspaceInitialized = true;
    void executeCommand('workspace.init', initialWorkspace).catch(() => {
      sampleWorkspaceInitialized = false;
    });
  }, [executeCommand]);

  return null;
}

function EditorSaveShortcut() {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void executeCommand('editor.save');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [executeCommand]);

  return null;
}

function SampleEditorEmptyState() {
  const { executeCommand } = useWorkbench();

  return (
    <section className="workbench-sample-editor__card">
      <h1>Workbench Kit Sample Host</h1>
      <p>
        Frontend-only shell using <code>@workbench-kit/workbench-react</code> and bundled built-in
        extensions.
      </p>
      <dl className="workbench-sample-editor__meta">
        <div>
          <dt>Workspace</dt>
          <dd>{workspaceInfo.name}</dd>
        </div>
        <div>
          <dt>Folders</dt>
          <dd>{workspaceInfo.folderCount}</dd>
        </div>
        <div>
          <dt>Extensions</dt>
          <dd>{extensionsConfig.enabled.length} enabled</dd>
        </div>
      </dl>
      <div className="workbench-sample-editor__actions">
        <button
          className="workbench-sample-editor__action"
          onClick={() => {
            void executeCommand('workspace.open', { path: SAMPLE_APP_PATH });
          }}
          type="button"
        >
          Open App.tsx
        </button>
        <button
          className="workbench-sample-editor__action"
          onClick={() => {
            void executeCommand('workspace.open', { path: SAMPLE_README_PATH });
          }}
          type="button"
        >
          Preview README.md
        </button>
        <button
          className="workbench-sample-editor__action"
          onClick={() => {
            void executeCommand('workspace.open', { path: SAMPLE_CONFIG_PATH });
          }}
          type="button"
        >
          Open config.json
        </button>
      </div>
      <p className="workbench-sample-editor__hint">
        Select <strong>Explorer</strong> in the activity bar to open the built-in explorer view.
      </p>
    </section>
  );
}
