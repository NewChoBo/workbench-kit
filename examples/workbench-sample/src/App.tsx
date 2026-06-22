import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, IconButton } from '@workbench-kit/react/primitives';
import {
  resolveActiveThemePreset,
  useResolvedWorkbenchTheme,
  type DarkThemePresetId,
  type LightThemePresetId,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench';
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
} from '@workbench-kit/shell-react';

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
import { DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY } from '@workbench-kit/shell-react';
import {
  createSamplePaletteCommandRunner,
  sampleAdditionalPaletteCommands,
} from './sample-palette-commands.js';
import {
  readPersistedSampleAppearance,
  writePersistedSampleAppearance,
  type SampleAppearanceSettings,
} from './sample-appearance-storage.js';
import { SampleAuthShell } from './SampleAuthShell.js';
import { useSampleAccount } from './sample-account-context.js';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();

export function App() {
  const [appearance, setAppearance] = useState<SampleAppearanceSettings>(() =>
    readPersistedSampleAppearance(),
  );

  useEffect(() => {
    writePersistedSampleAppearance(appearance);
  }, [appearance]);

  return (
    <SampleAuthShell appearance={appearance}>
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
          <SampleWorkbenchHost appearance={appearance} onAppearanceChange={setAppearance} />
        </WorkbenchStartupGate>
      </WorkbenchProvider>
    </SampleAuthShell>
  );
}

interface SampleWorkbenchHostProps {
  appearance: SampleAppearanceSettings;
  onAppearanceChange: (appearance: SampleAppearanceSettings) => void;
}

function SampleWorkbenchHost({ appearance, onAppearanceChange }: SampleWorkbenchHostProps) {
  const auth = useSampleAccount();
  const { executeCommand, layoutService } = useWorkbench();
  const [layout, setLayout] = useState(() => layoutService.getState());
  const [locale, setLocale] = useState('en');
  const resolvedTheme = useResolvedWorkbenchTheme(appearance.themePreference);
  const editorTheme: WorkspaceEditorTheme = resolvedTheme;

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
        appearance,
        resolvedTheme,
        sideBarVisible: layout.sideBar.visible,
      }),
    [appearance, auth.status, layout.sideBar.visible, profile?.displayName, resolvedTheme],
  );

  const handleThemeChange = useCallback(
    (nextTheme: string) => {
      if (!isSampleColorScheme(nextTheme)) {
        return;
      }

      onAppearanceChange({
        ...appearance,
        themePreference: nextTheme,
      });
    },
    [appearance, onAppearanceChange],
  );

  const handleLightPresetChange = useCallback(
    (nextPreset: LightThemePresetId) => {
      onAppearanceChange({
        ...appearance,
        lightPreset: nextPreset,
      });
    },
    [appearance, onAppearanceChange],
  );

  const handleDarkPresetChange = useCallback(
    (nextPreset: DarkThemePresetId) => {
      onAppearanceChange({
        ...appearance,
        darkPreset: nextPreset,
      });
    },
    [appearance, onAppearanceChange],
  );

  const handleStatusItemActivate = useCallback(
    (item: { id: string }) => {
      if (item.id === 'sample.theme') {
        onAppearanceChange({
          ...appearance,
          themePreference: nextSampleColorScheme(appearance.themePreference),
        });
        return;
      }

      if (item.id === 'sample.sidebar') {
        layoutService.setSideBarVisible(!layout.sideBar.visible);
      }
    },
    [appearance, layout.sideBar.visible, layoutService, onAppearanceChange],
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
        darkPreset={appearance.darkPreset}
        editorArea={
          <SampleEditorFrame>
            <EditorArea defaultViewModeForResource={getSampleDefaultViewMode} theme={editorTheme} />
          </SampleEditorFrame>
        }
        helpContent={<SampleHelpContent />}
        lightPreset={appearance.lightPreset}
        locale={locale}
        onDarkPresetChange={handleDarkPresetChange}
        onLightPresetChange={handleLightPresetChange}
        onLocaleChange={setLocale}
        onStatusItemActivate={handleStatusItemActivate}
        onThemeChange={handleThemeChange}
        profile={profile}
        rootClassName="ide-root"
        statusSections={statusSections}
        theme={appearance.themePreference}
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
      <IconButton
        className="workbench-shell-titlebar__action"
        compact
        icon="preview"
        label="Open example"
        onClick={() => {
          void executeCommand('workspace.open', { path: SAMPLE_EXAMPLE_JDW_PATH });
        }}
      />
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
            Appearance settings (color scheme, light preset, dark preset) are restored from browser
            local storage (`workbench-kit/.workbench/sample-appearance`).
          </li>
          <li>Toggle the color scheme from the status bar to review theme persistence.</li>
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
  appearance: SampleAppearanceSettings;
  resolvedTheme: WorkspaceEditorTheme;
  sideBarVisible: boolean;
}

function createSampleStatusSections({
  activeAccountName,
  appearance,
  resolvedTheme,
  sideBarVisible,
}: SampleStatusSectionsInput): StatusBarSectionModel[] {
  const activePreset = resolveActiveThemePreset(resolvedTheme, appearance);

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
          label: `scheme: ${appearance.themePreference} · ${activePreset}`,
          title: 'Cycle color scheme (system, light, dark)',
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

function nextSampleColorScheme(
  scheme: WorkbenchColorSchemePreference,
): WorkbenchColorSchemePreference {
  if (scheme === 'system') {
    return 'light';
  }

  if (scheme === 'light') {
    return 'dark';
  }

  return 'system';
}

function isSampleColorScheme(value: string): value is WorkbenchColorSchemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function getSampleDefaultViewMode(resourceUri: string): EditorViewMode | undefined {
  return resourceUri.endsWith(`/${SAMPLE_EXAMPLE_JDW_PATH}`) ? 'preview' : undefined;
}
