import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, IconButton } from '@workbench-kit/react/primitives';
import {
  resolveActiveThemePreset,
  useResolvedWorkbenchTheme,
  type WorkbenchAppearanceSettings,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench';
import type { StatusBarSectionModel } from '@workbench-kit/react/workbench/shell';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import {
  createWorkspaceResourceStatusItems,
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  EditorArea,
  getWorkbenchCommandPaletteShortcutLabel,
  isWorkspaceResourceService,
  mergeWorkbenchStatusSections,
  usePersistedWorkbenchAppearance,
  WorkbenchProvider,
  WorkbenchDevtoolsShell,
  WorkbenchShell,
  WorkbenchStartupGate,
  useWorkbench,
  useWorkspaceResourceState,
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
import {
  createSamplePaletteCommandRunner,
  SAMPLE_OPEN_PERMISSION_ROLE_SETTINGS_COMMAND_ID,
  sampleAdditionalPaletteCommands,
} from './sample-palette-commands.js';
import {
  readPersistedSamplePermissionRoleOverride,
  writePersistedSamplePermissionRoleOverride,
  type SamplePermissionRoleOverride,
} from './sample-permission-role-storage.js';
import { createSamplePermissionRoleSettingsCategory } from './sample-permission-role-settings.js';
import { createSamplePermissionRoleProfileExtra } from './sample-permission-role-profile.js';
import { SampleAuthShell } from './SampleAuthShell.js';
import { useSampleAccount } from './useSampleAuth.js';
import {
  createSamplePermissionContextKeys,
  resolveSampleExtensionsConfig,
  resolveSampleWorkbenchRole,
} from './sample-permission-context.js';
import {
  createSampleInstalledExtensionsStorageKey,
  getSampleInstalledExtensionsStorage,
} from './sample-installed-extension-storage.js';

const WORKBENCH_SETTINGS_CAPABILITY_ID = 'workbench.settings';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();

export interface AppProps {
  readonly devtools?: boolean | undefined;
}

export function App({ devtools = false }: AppProps) {
  const [appearance, setAppearance] = usePersistedWorkbenchAppearance();
  const [permissionRoleOverride, setPermissionRoleOverride] =
    useState<SamplePermissionRoleOverride>(() => readPersistedSamplePermissionRoleOverride());

  useEffect(() => {
    writePersistedSamplePermissionRoleOverride(permissionRoleOverride);
  }, [permissionRoleOverride]);

  return (
    <SampleAuthShell appearance={appearance}>
      <SampleAuthenticatedWorkbench
        appearance={appearance}
        devtools={devtools}
        permissionRoleOverride={permissionRoleOverride}
        onAppearanceChange={setAppearance}
        onPermissionRoleOverrideChange={setPermissionRoleOverride}
      />
    </SampleAuthShell>
  );
}

interface SampleAuthenticatedWorkbenchProps {
  appearance: WorkbenchAppearanceSettings;
  devtools: boolean;
  permissionRoleOverride: SamplePermissionRoleOverride;
  onAppearanceChange: (appearance: WorkbenchAppearanceSettings) => void;
  onPermissionRoleOverrideChange: (roleOverride: SamplePermissionRoleOverride) => void;
}

function SampleAuthenticatedWorkbench({
  appearance,
  devtools,
  permissionRoleOverride,
  onAppearanceChange,
  onPermissionRoleOverrideChange,
}: SampleAuthenticatedWorkbenchProps) {
  const auth = useSampleAccount();
  const accountId = auth.profile?.accountId;
  const contextKeyValues = useMemo(
    () => createSamplePermissionContextKeys(accountId, permissionRoleOverride),
    [accountId, permissionRoleOverride],
  );
  const resolvedExtensionsConfig = useMemo(
    () => resolveSampleExtensionsConfig(accountId, permissionRoleOverride),
    [accountId, permissionRoleOverride],
  );
  const installedExtensionsStorage = useMemo(() => getSampleInstalledExtensionsStorage(), []);
  const installedExtensionsStorageKey = useMemo(
    () => createSampleInstalledExtensionsStorageKey(accountId),
    [accountId],
  );

  return (
    <WorkbenchProvider
      contextKeyValues={contextKeyValues}
      extensionsConfig={resolvedExtensionsConfig}
      initialKeybindingOverrides={workbenchKeybindings}
      initialLayout={initialLayout}
      initialWorkspaceSettings={workbenchSettings}
      installedExtensionsStorage={installedExtensionsStorage}
      installedExtensionsStorageKey={installedExtensionsStorageKey}
      key={accountId ?? 'anonymous'}
      layoutStorageKey={DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY}
      persistLayout
      userCommands={workbenchUserCommands}
      workspaceHostPort={workspaceHostPort}
    >
      <WorkbenchStartupGate heading="Workbench Sample" workspaceInit={initialWorkspace}>
        {devtools ? (
          <WorkbenchDevtoolsShell>
            <SampleWorkbenchHost
              appearance={appearance}
              permissionRoleOverride={permissionRoleOverride}
              onAppearanceChange={onAppearanceChange}
              onPermissionRoleOverrideChange={onPermissionRoleOverrideChange}
            />
          </WorkbenchDevtoolsShell>
        ) : (
          <SampleWorkbenchHost
            appearance={appearance}
            permissionRoleOverride={permissionRoleOverride}
            onAppearanceChange={onAppearanceChange}
            onPermissionRoleOverrideChange={onPermissionRoleOverrideChange}
          />
        )}
      </WorkbenchStartupGate>
    </WorkbenchProvider>
  );
}

interface SampleWorkbenchHostProps {
  appearance: WorkbenchAppearanceSettings;
  permissionRoleOverride: SamplePermissionRoleOverride;
  onAppearanceChange: (appearance: WorkbenchAppearanceSettings) => void;
  onPermissionRoleOverrideChange: (roleOverride: SamplePermissionRoleOverride) => void;
}

function SampleWorkbenchHost({
  appearance,
  permissionRoleOverride,
  onAppearanceChange,
  onPermissionRoleOverrideChange,
}: SampleWorkbenchHostProps) {
  const auth = useSampleAccount();
  const { executeCommand, extensionRegistry, layoutService, workspaceHostPort } = useWorkbench();
  const workspaceState = useWorkspaceResourceState(
    isWorkspaceResourceService(workspaceHostPort?.service) ? workspaceHostPort.service : undefined,
  );
  const liveFileCount = workspaceState?.files.length ?? 0;
  const liveFolderCount = workspaceState?.folders.length ?? 0;
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
        fileCount: liveFileCount,
        folderCount: liveFolderCount,
        resolvedTheme,
        sideBarVisible: layout.sideBar.visible,
      }),
    [
      appearance,
      auth.status,
      layout.sideBar.visible,
      liveFileCount,
      liveFolderCount,
      profile?.displayName,
      resolvedTheme,
    ],
  );

  const handleAppearancePatch = useCallback(
    (patch: Partial<WorkbenchAppearanceSettings>) => {
      onAppearanceChange({ ...appearance, ...patch });
    },
    [appearance, onAppearanceChange],
  );

  const handleStatusItemActivate = useCallback(
    (item: { id: string }) => {
      if (item.id === 'sample.theme') {
        handleAppearancePatch({
          themePreference: nextSampleColorScheme(appearance.themePreference),
        });
        return;
      }

      if (item.id === 'sample.sidebar') {
        layoutService.setSideBarVisible(!layout.sideBar.visible);
      }
    },
    [appearance.themePreference, handleAppearancePatch, layout.sideBar.visible, layoutService],
  );

  const runSamplePaletteCommand = useCallback(createSamplePaletteCommandRunner(executeCommand), [
    executeCommand,
  ]);

  const permissionRoleSettingsCategory = useMemo(
    () =>
      createSamplePermissionRoleSettingsCategory({
        authDerivedRole: resolveSampleWorkbenchRole(auth.profile?.accountId),
        roleOverride: permissionRoleOverride,
        onRoleOverrideChange: onPermissionRoleOverrideChange,
      }),
    [auth.profile?.accountId, onPermissionRoleOverrideChange, permissionRoleOverride],
  );

  const permissionRoleProfileExtra = useMemo(
    () =>
      createSamplePermissionRoleProfileExtra({
        authDerivedRole: resolveSampleWorkbenchRole(auth.profile?.accountId),
        roleOverride: permissionRoleOverride,
        onRoleOverrideChange: onPermissionRoleOverrideChange,
      }),
    [auth.profile?.accountId, onPermissionRoleOverrideChange, permissionRoleOverride],
  );

  const handleRunCommand = useCallback(
    (
      command: Parameters<typeof runSamplePaletteCommand>[0],
      context: Parameters<typeof runSamplePaletteCommand>[1],
    ) => {
      if (command.id === SAMPLE_OPEN_PERMISSION_ROLE_SETTINGS_COMMAND_ID) {
        const settings = extensionRegistry.capabilityRegistry.get<{
          openSettings: (categoryId?: string) => void;
        }>(WORKBENCH_SETTINGS_CAPABILITY_ID);
        settings?.openSettings(permissionRoleSettingsCategory.id);
        return true;
      }

      return runSamplePaletteCommand(command, context);
    },
    [
      extensionRegistry.capabilityRegistry,
      permissionRoleSettingsCategory.id,
      runSamplePaletteCommand,
    ],
  );

  return (
    <WorkbenchShell
      accountManagement={accountManagement}
      additionalSettingsCategories={[permissionRoleSettingsCategory]}
      commandHost={{
        additionalCommands: sampleAdditionalPaletteCommands,
        onRunCommand: handleRunCommand,
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
      onDarkPresetChange={(nextPreset) => {
        handleAppearancePatch({ darkPreset: nextPreset });
      }}
      onLightPresetChange={(nextPreset) => {
        handleAppearancePatch({ lightPreset: nextPreset });
      }}
      onLocaleChange={setLocale}
      onStatusItemActivate={handleStatusItemActivate}
      onThemeChange={(nextTheme) => {
        if (isSampleColorScheme(nextTheme)) {
          handleAppearancePatch({ themePreference: nextTheme });
        }
      }}
      profile={profile}
      profileExtraContent={permissionRoleProfileExtra}
      rootClassName="ide-root"
      statusSections={statusSections}
      theme={appearance.themePreference}
      title="Workbench Sample"
      titleBarActions={<SampleTitleBarActions />}
      titleMeta={<Badge variant="muted">{liveFileCount} files</Badge>}
    />
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
          Demo accounts: <code>tester</code> / <code>tester</code> (administrator) and{' '}
          <code>basic</code> / <code>basic</code> (explorer and chat only). The in-browser dummy
          backend returns fixed profile and linked-account data without running a separate server.
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
            local storage (<code>{DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY}</code>).
          </li>
          <li>
            Permission role demo overrides are restored from browser local storage (
            <code>workbench-kit/.workbench/sample-permission-role</code>). Open Profile and use{' '}
            <strong>Permission (demo)</strong>, open Settings and choose{' '}
            <strong>Permissions (demo)</strong>, or run <strong>Permission Role (Demo)</strong> from
            the command palette.
          </li>
          <li>Toggle the color scheme from the status bar to review theme persistence.</li>
          <li>Toggle the primary sidebar from the status bar to review layout persistence.</li>
          <li>
            Open the profile action above Settings to review the service account and switch demo
            permission roles, or open Settings and choose <strong>Linked Accounts</strong> to review
            project integrations.
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
  appearance: WorkbenchAppearanceSettings;
  fileCount: number;
  folderCount: number;
  resolvedTheme: WorkspaceEditorTheme;
  sideBarVisible: boolean;
}

function createSampleStatusSections({
  activeAccountName,
  appearance,
  fileCount,
  folderCount,
  resolvedTheme,
  sideBarVisible,
}: SampleStatusSectionsInput): StatusBarSectionModel[] {
  const activePreset = resolveActiveThemePreset(resolvedTheme, appearance);

  return mergeWorkbenchStatusSections(
    [
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
    ],
    [
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
          ...createWorkspaceResourceStatusItems({
            fileCount,
            fileItemId: 'sample.files',
            fileTitle: 'Virtual workspace files',
            folderCount,
            folderItemId: 'sample.folders',
            folderTitle: 'Virtual workspace folders',
          }),
          {
            icon: 'extensions',
            id: 'sample.extensions',
            label: `${extensionsConfig.enabled.length} extensions`,
            title: 'Enabled built-in extensions',
          },
        ],
      },
    ],
  );
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
