import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button } from '@workbench-kit/react/primitives';
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
          <SampleEditorFrame theme={theme} onThemeChange={setTheme}>
            <EditorSaveShortcut />
          </SampleEditorFrame>
        }
        onStatusItemActivate={(item) => {
          if (item.id === 'sample.theme') {
            setTheme((current) => nextSampleTheme(current));
          }
        }}
        rootClassName="ide-root"
        statusSections={statusSections}
        theme={theme}
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

function SampleEditorFrame({
  children,
  theme,
  onThemeChange,
}: {
  children: ReactNode;
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
  return (
    <section className="workbench-sample-editor-frame" aria-label="Sample editor workspace">
      <SampleWorkbenchToolbar theme={theme} onThemeChange={onThemeChange} />
      {children}
      <EditorArea defaultViewModeForResource={getSampleDefaultViewMode} theme={theme} />
    </section>
  );
}

function SampleWorkbenchToolbar({
  theme,
  onThemeChange,
}: {
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
  const { executeCommand } = useWorkbench();

  return (
    <header className="workbench-sample-toolbar">
      <div className="workbench-sample-toolbar__title">
        <i aria-hidden className="codicon codicon-layout" />
        <span>Workbench Sample</span>
        <Badge variant="muted">{workspaceInfo.fileCount} files</Badge>
      </div>
      <div className="workbench-sample-toolbar__actions">
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
        <Button
          compact
          icon="codicon-preview"
          onClick={() => {
            void executeCommand('workspace.open', { path: SAMPLE_EXAMPLE_JDW_PATH });
          }}
        >
          Open example
        </Button>
      </div>
    </header>
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
