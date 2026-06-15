import { WorkbenchProvider, WorkbenchShell } from '@workbench-kit/workbench-react';

import { extensionsConfig, initialLayout, workspaceInfo } from './bootstrap.js';

export function App() {
  return (
    <WorkbenchProvider extensionsConfig={extensionsConfig} initialLayout={initialLayout}>
      <WorkbenchShell editorArea={<SampleEditorArea />} rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  );
}

function SampleEditorArea() {
  return (
    <main className="workbench-sample-editor" aria-label="Editor area">
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
        <p className="workbench-sample-editor__hint">
          Select <strong>Explorer</strong> in the activity bar to open the built-in explorer view.
        </p>
      </section>
    </main>
  );
}
