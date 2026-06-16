import {
  EditorArea,
  WorkbenchProvider,
  WorkbenchShell,
  useEditorService,
} from '@workbench-kit/workbench-react';

import { extensionsConfig, initialLayout, workspaceInfo } from './bootstrap.js';

const SAMPLE_APP_RESOURCE_URI = 'workspace://file/src/App.tsx';
const SAMPLE_README_RESOURCE_URI = 'workspace://file/README.md';

export function App() {
  return (
    <WorkbenchProvider extensionsConfig={extensionsConfig} initialLayout={initialLayout}>
      <WorkbenchShell
        editorArea={<EditorArea emptyState={<SampleEditorEmptyState />} />}
        rootClassName="ide-root"
        theme="dark"
      />
    </WorkbenchProvider>
  );
}

function SampleEditorEmptyState() {
  const editorService = useEditorService();

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
            editorService.openEditor({
              pinned: true,
              resourceUri: SAMPLE_APP_RESOURCE_URI,
              title: 'App.tsx',
            });
          }}
          type="button"
        >
          Open App.tsx
        </button>
        <button
          className="workbench-sample-editor__action"
          onClick={() => {
            editorService.openEditor({
              preview: true,
              resourceUri: SAMPLE_README_RESOURCE_URI,
              title: 'README.md',
            });
          }}
          type="button"
        >
          Preview README.md
        </button>
      </div>
      <p className="workbench-sample-editor__hint">
        Select <strong>Explorer</strong> in the activity bar to open the built-in explorer view.
      </p>
    </section>
  );
}
