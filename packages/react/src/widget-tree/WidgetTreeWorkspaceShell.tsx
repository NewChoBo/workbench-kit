import { useMemo, useState } from 'react';
import {
  integratedShellWorkspaceFiles,
  integratedShellWorkspaceFolders,
} from '@workbench-kit/adapters';

import { SideBarViewFrame } from '../layout/SideBarViewFrame.js';
import { WorkbenchShell } from '../workbench/WorkbenchShell.js';
import type { StatusBarSectionModel } from '../workbench/StatusBar.js';
import {
  useVirtualWorkspace,
  WorkspaceDraftsProvider,
  WorkspaceEditorPanel,
  WorkspaceExplorer,
  type WorkspaceEditorTheme,
  type WorkspaceFile,
} from '../workbench/workspace/index.js';
import { createWidgetStudioWorkspaceEditorRenderer } from '../widget-studio/create-widget-studio-workspace-editor.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';

const JDW_WORKSPACE_DEFAULT_WIDGET_PATH = 'src/widgets/home.jdw.json';

function withJdwWelcomeDocument(files: readonly WorkspaceFile[]): WorkspaceFile[] {
  return files.map((file) =>
    file.path === JDW_WORKSPACE_DEFAULT_WIDGET_PATH
      ? { ...file, content: WIDGET_TREE_WELCOME_DOCUMENT }
      : file,
  );
}

const statusSections: StatusBarSectionModel[] = [
  {
    id: 'main',
    items: [{ id: 'label', label: 'JDW Workspace' }],
  },
];

export interface WidgetTreeWorkspaceShellProps {
  readonly initialSelectedPath?: string | undefined;
  readonly initialTheme?: WorkspaceEditorTheme | undefined;
}

export function WidgetTreeWorkspaceShell({
  initialSelectedPath = JDW_WORKSPACE_DEFAULT_WIDGET_PATH,
  initialTheme = 'dark',
}: WidgetTreeWorkspaceShellProps = {}) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarSizePercent, setSidebarSizePercent] = useState(20);

  const workspaceFiles = useMemo(() => withJdwWelcomeDocument(integratedShellWorkspaceFiles), []);

  const workspace = useVirtualWorkspace({
    expandedPaths: ['src', 'src/widgets', 'src/widgets/assets'],
    files: workspaceFiles,
    folders: [...integratedShellWorkspaceFolders],
    openPaths: [initialSelectedPath],
    selectedPath: initialSelectedPath,
  });

  const {
    closeAll,
    closeOthers,
    closePath,
    deleteFile,
    expandedPaths,
    files,
    openFile,
    openPaths,
    saveFile,
    selectedPath,
    toggleFolder,
    workspaceTree,
  } = workspace;

  const widgetStudioEditorRenderer = useMemo(
    () =>
      createWidgetStudioWorkspaceEditorRenderer({
        registry: WIDGET_TREE_DEMO_REGISTRY,
      }),
    [],
  );

  return (
    <div className="jdw-workspace-shell-host" data-testid="jdw-workspace-shell">
      <WorkspaceDraftsProvider>
        <WorkbenchShell
          activityBar={{
            items: [
              {
                active: sidebarVisible,
                icon: <i className="codicon codicon-files" aria-hidden />,
                id: 'explorer',
                label: 'Explorer',
              },
            ],
            onItemActivate: () => setSidebarVisible((visible) => !visible),
          }}
          compactStatus
          primarySidebar={{
            className: 'ui-workbench-story-shell-split',
            isVisible: sidebarVisible,
            maxPrimarySizePercent: 36,
            minPrimarySizePercent: 16,
            node: (
              <aside aria-label="Explorer sidebar" className="workbench-primary-side-bar">
                <SideBarViewFrame title="Explorer">
                  <WorkspaceExplorer
                    activePath={selectedPath}
                    expandedPaths={expandedPaths}
                    nodes={workspaceTree}
                    onActivateFile={openFile}
                    onToggleFolder={toggleFolder}
                  />
                </SideBarViewFrame>
              </aside>
            ),
            onSizePercentChange: setSidebarSizePercent,
            primarySizePercent: sidebarSizePercent,
          }}
          rootClassName="ide-root jdw-workspace-shell"
          rootStyle={{ height: '100%', minHeight: 0 }}
          secondaryArea={
            <main className="workbench-editor-area jdw-workspace-shell__editor">
              <WorkspaceEditorPanel
                files={files}
                openPaths={openPaths}
                renderEditor={(context) =>
                  widgetStudioEditorRenderer({ ...context, workspaceFiles: files })
                }
                selectedPath={selectedPath}
                theme={initialTheme}
                onCloseAll={closeAll}
                onCloseOthers={closeOthers}
                onClosePath={closePath}
                onDeletePath={deleteFile}
                onSaveFile={(path, content) => {
                  saveFile(path, { content, source: 'user' });
                  return {
                    file: files.find((file) => file.path === path) ?? { content, path },
                    kind: 'save:success' as const,
                    outcome: 'unchanged' as const,
                  };
                }}
                onSelectedPathChange={openFile}
              />
            </main>
          }
          statusSections={statusSections}
          theme={initialTheme}
        />
      </WorkspaceDraftsProvider>
    </div>
  );
}
