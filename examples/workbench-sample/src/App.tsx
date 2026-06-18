import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@workbench-kit/react/primitives';
import type { StatusBarSectionModel } from '@workbench-kit/react/workbench/shell';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import {
  EditorArea,
  WorkbenchProvider,
  WorkbenchShell,
  useWorkbench,
  type EditorViewMode,
  type WorkbenchThemeOption,
} from '@workbench-kit/workbench-react';

import {
  extensionsConfig,
  initialLayout,
  initialWorkspace,
  SAMPLE_BUTTON_PATH,
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
  workspaceInfo,
} from './bootstrap.js';
import { DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY } from '@workbench-kit/workbench-react';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();
let sampleWorkspaceInitialized = false;

type SampleTheme = WorkspaceEditorTheme;

const SAMPLE_THEME_OPTIONS = [
  {
    description: 'Dim workbench surfaces for editor-first review.',
    id: 'dark',
    label: 'Dark',
  },
  {
    description: 'Light workbench surfaces for shell and layout review.',
    id: 'light',
    label: 'Light',
  },
] satisfies readonly WorkbenchThemeOption[];

export function App() {
  const [theme, setTheme] = useState<SampleTheme>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <WorkbenchProvider
      extensionsConfig={extensionsConfig}
      initialLayout={initialLayout}
      layoutStorageKey={DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY}
      persistLayout
      workspaceHostPort={workspaceHostPort}
    >
      <SampleWorkbenchHost theme={theme} onThemeChange={setTheme} />
    </WorkbenchProvider>
  );
}

interface SampleWorkbenchHostProps {
  onThemeChange: (theme: SampleTheme) => void;
  theme: SampleTheme;
}

function SampleWorkbenchHost({ onThemeChange, theme }: SampleWorkbenchHostProps) {
  const { layoutService } = useWorkbench();
  const [layout, setLayout] = useState(() => layoutService.getState());

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      setLayout(state);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService]);

  const statusSections = useMemo(
    () =>
      createSampleStatusSections({
        sideBarVisible: layout.sideBar.visible,
        theme,
      }),
    [layout.sideBar.visible, theme],
  );

  const handleThemeChange = useCallback((nextTheme: string) => {
    if (isSampleTheme(nextTheme)) {
      onThemeChange(nextTheme);
    }
  }, [onThemeChange]);

  const handleStatusItemActivate = useCallback(
    (item: { id: string }) => {
      if (item.id === 'sample.theme') {
        onThemeChange(nextSampleTheme(theme));
        return;
      }

      if (item.id === 'sample.sidebar') {
        layoutService.setSideBarVisible(!layout.sideBar.visible);
      }
    },
    [layout.sideBar.visible, layoutService, onThemeChange, theme],
  );

  return (
    <>
      <WorkspaceInitCommand />
      <WorkbenchShell
        editorArea={
          <SampleEditorFrame theme={theme}>
            <EditorSaveShortcut />
          </SampleEditorFrame>
        }
        helpContent={<SampleHelpContent />}
        onStatusItemActivate={handleStatusItemActivate}
        onThemeChange={handleThemeChange}
        rootClassName="ide-root"
        statusSections={statusSections}
        theme={theme}
        themeOptions={SAMPLE_THEME_OPTIONS}
        title="Workbench Sample"
        titleBarActions={<SampleTitleBarActions />}
        titleMeta={<Badge variant="muted">{workspaceInfo.fileCount} files</Badge>}
      />
    </>
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

function SampleEditorFrame({ children, theme }: { children: ReactNode; theme: SampleTheme }) {
  return (
    <section className="workbench-sample-editor-frame" aria-label="Sample editor workspace">
      {children}
      <EditorArea defaultViewModeForResource={getSampleDefaultViewMode} theme={theme} />
    </section>
  );
}

function SampleTitleBarActions() {
  const { executeCommand } = useWorkbench();

  return (
    <div className="workbench-sample-titlebar-actions">
      <button
        aria-label="Open example"
        className="ui-icon-button ui-icon-button--compact workbench-shell-titlebar__action"
        title="Open example"
        type="button"
        onClick={() => {
          void executeCommand('workspace.open', { path: SAMPLE_EXAMPLE_JDW_PATH });
        }}
      >
        <i aria-hidden className="codicon codicon-preview" />
      </button>
    </div>
  );
}

function SampleHelpContent() {
  return (
    <div className="workbench-sample-help">
      <section className="workbench-sample-help__section">
        <h2>Sample workspace</h2>
        <p>
          <code>{SAMPLE_EXAMPLE_JDW_PATH}</code> opens on startup. Use Code, Form, or Preview to
          review the JDW editor flow.
        </p>
        <p>
          Open <code>{SAMPLE_README_PATH}</code> and switch to Preview for markdown rendering.
        </p>
      </section>
      <section className="workbench-sample-help__section">
        <h2>Explorer and search</h2>
        <ul>
          <li>
            Right-click files or folders in Explorer for rename, delete, and create actions.
          </li>
          <li>
            Drag files to move them; inline rename works on the selected item.
          </li>
          <li>
            Search for <code>button</code> to find <code>{SAMPLE_BUTTON_PATH}</code>.
          </li>
        </ul>
      </section>
      <section className="workbench-sample-help__section">
        <h2>Workbench surfaces</h2>
        <ul>
          <li>
            Explorer, editor tabs, status bar, and settings are contributed through the shell.
          </li>
          <li>Chat and AI Chat are available from the activity bar for sidebar chat testing.</li>
          <li>
            Layout preferences such as activity order and the active sidebar are restored from
            browser local storage (`workbench-kit/.workbench/layout`).
          </li>
          <li>
            Theme selection is exposed in Settings, with a status bar shortcut for quick checks.
          </li>
          <li>
            Toggle the primary sidebar from the status bar to review layout persistence.
          </li>
        </ul>
      </section>
    </div>
  );
}

interface SampleStatusSectionsInput {
  sideBarVisible: boolean;
  theme: SampleTheme;
}

function createSampleStatusSections({
  sideBarVisible,
  theme,
}: SampleStatusSectionsInput): StatusBarSectionModel[] {
  return [
    {
      id: 'sample-primary',
      items: [
        {
          icon: 'root-folder',
          id: 'sample.workspace',
          label: workspaceInfo.name,
          title: 'Sample workspace',
        },
        {
          active: sideBarVisible,
          icon: 'layout-sidebar-left',
          id: 'sample.sidebar',
          label: sideBarVisible ? 'sidebar: shown' : 'sidebar: hidden',
          title: sideBarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
        },
        {
          active: true,
          icon: 'color-mode',
          id: 'sample.theme',
          label: `theme: ${theme}`,
          title: 'Toggle sample theme',
        },
      ],
    },
    {
      align: 'end',
      id: 'sample-meta',
      items: [
        {
          icon: 'files',
          id: 'sample.files',
          label: `${workspaceInfo.fileCount} files`,
          title: 'Virtual workspace files',
        },
        {
          icon: 'folder',
          id: 'sample.folders',
          label: `${workspaceInfo.folderCount} folders`,
          title: 'Virtual workspace folders',
        },
        {
          icon: 'extensions',
          id: 'sample.extensions',
          label: `${extensionsConfig.enabled.length} extensions`,
          title: 'Enabled built-in extensions',
        },
      ],
    },
  ];
}

function nextSampleTheme(theme: SampleTheme): SampleTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

function isSampleTheme(value: string): value is SampleTheme {
  return value === 'dark' || value === 'light';
}

function getSampleDefaultViewMode(resourceUri: string): EditorViewMode | undefined {
  return resourceUri.endsWith(`/${SAMPLE_EXAMPLE_JDW_PATH}`) ? 'preview' : undefined;
}
