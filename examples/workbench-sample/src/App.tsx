import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
} from '@workbench-kit/workbench-react';

import {
  extensionsConfig,
  initialLayout,
  initialWorkspace,
  SAMPLE_EXAMPLE_JDW_PATH,
  workspaceInfo,
} from './bootstrap.js';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();
let sampleWorkspaceInitialized = false;

type SampleTheme = WorkspaceEditorTheme;

export function App() {
  const [theme, setTheme] = useState<SampleTheme>('dark');
  const statusSections = useMemo(() => createSampleStatusSections(theme), [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <WorkbenchProvider
      extensionsConfig={extensionsConfig}
      initialLayout={initialLayout}
      workspaceHostPort={workspaceHostPort}
    >
      <WorkspaceInitCommand />
      <WorkbenchShell
        editorArea={
          <SampleEditorFrame theme={theme}>
            <EditorSaveShortcut />
          </SampleEditorFrame>
        }
        helpContent={<SampleHelpContent />}
        onStatusItemActivate={(item) => {
          if (item.id === 'sample.theme') {
            setTheme((current) => nextSampleTheme(current));
          }
        }}
        rootClassName="ide-root"
        statusSections={statusSections}
        theme={theme}
        title="Workbench Sample"
        titleBarActions={<SampleTitleBarActions theme={theme} onThemeChange={setTheme} />}
        titleMeta={<Badge variant="muted">{workspaceInfo.fileCount} files</Badge>}
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

function SampleEditorFrame({ children, theme }: { children: ReactNode; theme: SampleTheme }) {
  return (
    <section className="workbench-sample-editor-frame" aria-label="Sample editor workspace">
      {children}
      <EditorArea defaultViewModeForResource={getSampleDefaultViewMode} theme={theme} />
    </section>
  );
}

function SampleTitleBarActions({
  theme,
  onThemeChange,
}: {
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
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
      <div className="workbench-sample-theme-switch" role="group" aria-label="Workbench theme">
        <button
          aria-label="Use dark theme"
          className="workbench-sample-theme-switch__button"
          data-active={theme === 'dark' ? 'true' : undefined}
          title="Dark theme"
          type="button"
          onClick={() => onThemeChange('dark')}
        >
          <i aria-hidden className="codicon codicon-color-mode" />
        </button>
        <button
          aria-label="Use light theme"
          className="workbench-sample-theme-switch__button"
          data-active={theme === 'light' ? 'true' : undefined}
          title="Light theme"
          type="button"
          onClick={() => onThemeChange('light')}
        >
          <i aria-hidden className="codicon codicon-lightbulb" />
        </button>
      </div>
    </div>
  );
}

function SampleHelpContent() {
  return (
    <div className="workbench-sample-help">
      <section className="workbench-sample-help__section">
        <h2>Sample workspace</h2>
        <p>
          Open <code>{SAMPLE_EXAMPLE_JDW_PATH}</code> from the titlebar or explorer to review the
          JDW preview, form, and JSON code modes.
        </p>
      </section>
      <section className="workbench-sample-help__section">
        <h2>Workbench surfaces</h2>
        <ul>
          <li>
            Explorer, editor tabs, status bar, and settings are contributed through the shell.
          </li>
          <li>
            The empty editor area intentionally stays minimal until a workspace file is opened.
          </li>
          <li>Theme switching is exposed in the titlebar and status bar for quick verification.</li>
        </ul>
      </section>
    </div>
  );
}

function createSampleStatusSections(theme: SampleTheme): StatusBarSectionModel[] {
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

function getSampleDefaultViewMode(resourceUri: string): EditorViewMode | undefined {
  return resourceUri.endsWith(`/${SAMPLE_EXAMPLE_JDW_PATH}`) ? 'preview' : undefined;
}
