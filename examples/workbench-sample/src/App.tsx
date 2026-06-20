import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@workbench-kit/react/primitives';
import type { StatusBarSectionModel } from '@workbench-kit/react/workbench/shell';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import {
  EditorArea,
  getWorkbenchCommandPaletteShortcutLabel,
  WorkbenchProvider,
  WorkbenchShell,
  WorkbenchStartupGate,
  useWorkbench,
  type EditorViewMode,
  type WorkbenchProfileInput,
  type WorkbenchThemeOption,
} from '@workbench-kit/workbench-react';

import {
  extensionsConfig,
  initialLayout,
  initialWorkspace,
  SAMPLE_BUTTON_PATH,
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
  workbenchKeybindings,
  workbenchSettings,
  workbenchUserCommands,
  workspaceInfo,
} from './bootstrap.js';
import { DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY } from '@workbench-kit/workbench-react';
import {
  createSamplePaletteCommandRunner,
  sampleAdditionalPaletteCommands,
} from './sample-palette-commands.js';
import { SampleAuthShell } from './SampleAuthShell.js';
import { useSampleAccount } from './sample-account-context.js';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();

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

  return (
    <SampleAuthShell theme={theme}>
      <WorkbenchProvider
        extensionsConfig={extensionsConfig}
        initialKeybindingOverrides={workbenchKeybindings}
        initialLayout={initialLayout}
        initialWorkspaceSettings={workbenchSettings}
        layoutStorageKey={DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY}
        persistLayout
        userCommands={workbenchUserCommands}
        workspaceHostPort={workspaceHostPort}
      >
        <WorkbenchStartupGate heading="Workbench Sample" workspaceInit={initialWorkspace}>
          <SampleWorkbenchHost theme={theme} onThemeChange={setTheme} />
        </WorkbenchStartupGate>
      </WorkbenchProvider>
    </SampleAuthShell>
  );
}

interface SampleWorkbenchHostProps {
  onThemeChange: (theme: SampleTheme) => void;
  theme: SampleTheme;
}

function SampleWorkbenchHost({ onThemeChange, theme }: SampleWorkbenchHostProps) {
  const auth = useSampleAccount();
  const { executeCommand, layoutService } = useWorkbench();
  const [layout, setLayout] = useState(() => layoutService.getState());
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      setLayout(state);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService]);

  const profile = useMemo<WorkbenchProfileInput | undefined>(
    () =>
      auth.status === 'authenticated' && auth.profile
        ? {
            accountId: auth.profile.accountId,
            displayName: auth.profile.displayName,
            email: auth.profile.email,
            providerLabel: auth.profile.providerLabel,
            roleLabel: auth.profile.roleLabel,
            onSignOut: () => {
              auth.signOut();
            },
            sessionLabel: auth.profile.sessionLabel,
            statusLabel: auth.profile.statusLabel,
            workspaceLabel: auth.profile.workspaceLabel ?? workspaceInfo.name,
          }
        : undefined,
    [auth],
  );
  const accountManagement = useMemo(
    () =>
      auth.status === 'authenticated'
        ? {
            accounts: auth.linkedAccounts,
            automationHint:
              'Linked accounts are fixed responses from the dummy backend and remain separate from the Workbench service profile.',
            sessionLabel:
              'Dummy backend returns project integrations without starting a separate server.',
          }
        : undefined,
    [auth.linkedAccounts, auth.status],
  );

  const statusSections = useMemo(
    () =>
      createSampleStatusSections({
        activeAccountName: auth.status === 'authenticated' ? profile?.displayName : undefined,
        sideBarVisible: layout.sideBar.visible,
        theme,
      }),
    [auth.status, layout.sideBar.visible, profile?.displayName, theme],
  );

  const handleThemeChange = useCallback(
    (nextTheme: string) => {
      if (isSampleTheme(nextTheme)) {
        onThemeChange(nextTheme);
      }
    },
    [onThemeChange],
  );

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

  const runSamplePaletteCommand = useCallback(createSamplePaletteCommandRunner(executeCommand), [
    executeCommand,
  ]);

  return (
    <>
      <WorkbenchShell
        accountManagement={accountManagement}
        commandHost={{
          additionalCommands: sampleAdditionalPaletteCommands,
          onRunCommand: runSamplePaletteCommand,
        }}
        editorArea={
          <SampleEditorFrame>
            <EditorArea defaultViewModeForResource={getSampleDefaultViewMode} theme={theme} />
          </SampleEditorFrame>
        }
        helpContent={<SampleHelpContent />}
        locale={locale}
        onLocaleChange={setLocale}
        onStatusItemActivate={handleStatusItemActivate}
        onThemeChange={handleThemeChange}
        profile={profile}
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

function SampleEditorFrame({ children }: { children: ReactNode }) {
  return (
    <section className="workbench-sample-editor-frame" aria-label="Sample editor workspace">
      {children}
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
        <h2>Sign in</h2>
        <p>
          Demo account: <code>tester</code> / <code>tester</code>. The in-browser dummy backend
          returns fixed profile and linked-account data without running a separate server.
        </p>
      </section>
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
          <li>Right-click files or folders in Explorer for rename, delete, and create actions.</li>
          <li>Drag files to move them; inline rename works on the selected item.</li>
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
          <li>Toggle the primary sidebar from the status bar to review layout persistence.</li>
          <li>
            Open the profile action above Settings to review the service account, or open Settings
            and choose <strong>Linked Accounts</strong> to review project integrations.
          </li>
          <li>
            Press <code>{getWorkbenchCommandPaletteShortcutLabel()}</code> and run{' '}
            <strong>Manage Commands</strong> or <strong>Manage Linked Accounts</strong>.
          </li>
        </ul>
      </section>
    </div>
  );
}

interface SampleStatusSectionsInput {
  activeAccountName?: string | undefined;
  sideBarVisible: boolean;
  theme: SampleTheme;
}

function createSampleStatusSections({
  activeAccountName,
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
        ...(activeAccountName
          ? [
              {
                icon: 'account' as const,
                id: 'workbench.account',
                label: activeAccountName,
                title: 'Open profile',
              },
            ]
          : []),
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
