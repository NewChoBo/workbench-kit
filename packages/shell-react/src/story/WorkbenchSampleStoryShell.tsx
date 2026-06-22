import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  WorkbenchStoryHost,
  type WorkbenchAppearanceSettings,
} from '@workbench-kit/react/workbench';
import { JDW_WIDGET_DOCUMENT_MIME } from '@workbench-kit/react/jdw/document';
import { createWorkbenchPermissionContextKeys } from '@workbench-kit/platform';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';
import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';

import {
  EditorArea,
  useWorkbench,
  WorkbenchProvider,
  WorkbenchShell,
  WorkbenchStartupGate,
} from '../index.js';

export const SAMPLE_APP_PATH = 'src/App.tsx';
export const SAMPLE_BUTTON_PATH = 'src/components/Button.tsx';
export const SAMPLE_README_PATH = 'README.md';
export const SAMPLE_EXAMPLE_JDW_PATH = 'example.jdw.json';

const sampleOwnerExtensionsConfig: WorkbenchExtensionsConfig = {
  recommendations: [
    'workbench-kit.builtin.explorer',
    'workbench-kit.builtin.search',
    'workbench-kit.builtin.chat',
    'workbench-kit.builtin.commands',
    'workbench-kit.builtin.extensions',
    'workbench-kit.builtin.settings',
    'workbench-kit.builtin.workspace',
    'workbench-kit.samples.hello-world',
    'workbench-kit.samples.theme-alt',
  ],
  enabled: [
    'workbench-kit.builtin.accounts',
    'workbench-kit.builtin.chat',
    'workbench-kit.builtin.commands',
    'workbench-kit.builtin.editor',
    'workbench-kit.builtin.extensions',
    'workbench-kit.builtin.explorer',
    'workbench-kit.builtin.search',
    'workbench-kit.builtin.keybindings',
    'workbench-kit.builtin.settings',
    'workbench-kit.builtin.workspace',
    'workbench-kit.samples.hello-world',
    'workbench-kit.samples.theme-alt',
  ],
};

const VIEWER_ROLE_EXTENSION_IDS = [
  'workbench-kit.builtin.accounts',
  'workbench-kit.builtin.editor',
  'workbench-kit.builtin.explorer',
  'workbench-kit.builtin.keybindings',
  'workbench-kit.builtin.workspace',
] as const;

export const sampleInitialLayout = {
  activityBar: {
    itemOrder: ['explorer', 'search', 'commands', 'chatting', 'aiChat'],
    visible: true,
  },
  sideBar: {
    activeViewContainer: 'explorer',
    visible: true,
  },
} as const;

export const sampleVirtualWorkspace: VirtualWorkspaceInitialState = {
  expandedPaths: ['src', 'src/components'],
  openPaths: [SAMPLE_EXAMPLE_JDW_PATH],
  folders: ['src', 'src/components'],
  files: [
    {
      content: [
        'import { WorkbenchProvider, WorkbenchShell } from "@workbench-kit/shell-react";',
        '',
        'export function App() {',
        '  return <WorkbenchShell />;',
        '}',
      ].join('\n'),
      path: SAMPLE_APP_PATH,
    },
    {
      content: [
        "import type { ComponentPropsWithRef } from 'react';",
        '',
        "type ButtonVariant = 'default' | 'primary' | 'danger';",
        '',
        "interface ButtonProps extends ComponentPropsWithRef<'button'> {",
        '  variant?: ButtonVariant;',
        '}',
        '',
        'export function Button({ variant = "default", ...props }: ButtonProps) {',
        '  return <button data-variant={variant} {...props} />;',
        '}',
      ].join('\n'),
      path: SAMPLE_BUTTON_PATH,
    },
    {
      content: [
        '# Workbench Kit Sample',
        '',
        'Frontend-only host demonstrating Workbench Kit package integration.',
        '',
        '- `example.jdw.json` is the editable JDW showcase document.',
        '- Open this file in Code or Preview to review markdown rendering.',
      ].join('\n'),
      path: SAMPLE_README_PATH,
    },
    {
      content: formatSampleJson({
        type: 'column',
        args: {
          gap: 12,
          padding: 24,
          background: '#111827',
          children: [
            {
              type: 'text',
              args: {
                text: 'Workbench Kit Sample',
                fontSize: 22,
                color: '#f8fafc',
              },
            },
            {
              type: 'text',
              args: {
                text: 'Open in Code, Form, or Preview to review the editor flow.',
                fontSize: 13,
                color: '#cbd5e1',
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_EXAMPLE_JDW_PATH,
    },
  ],
};

const defaultAppearance: WorkbenchAppearanceSettings = {
  darkPreset: DEFAULT_DARK_THEME_PRESET,
  lightPreset: DEFAULT_LIGHT_THEME_PRESET,
  themePreference: 'dark',
};

function createSamplePermissionContextKeys(role: WorkbenchPermissionRole) {
  return createWorkbenchPermissionContextKeys({ role });
}

function resolveSampleExtensionsForRole(role: WorkbenchPermissionRole): WorkbenchExtensionsConfig {
  if (role === 'owner') {
    return sampleOwnerExtensionsConfig;
  }

  const enabled = new Set<string>(VIEWER_ROLE_EXTENSION_IDS);
  return {
    ...sampleOwnerExtensionsConfig,
    enabled: sampleOwnerExtensionsConfig.enabled.filter((extensionId) => enabled.has(extensionId)),
  };
}

function formatSampleJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function OpenWorkspacePathsOnReady({ paths }: { paths: readonly string[] }) {
  const { executeCommand } = useWorkbench();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current || paths.length === 0) {
      return;
    }

    openedRef.current = true;
    void (async () => {
      for (const path of paths) {
        await executeCommand('workspace.open', { path });
      }
    })();
  }, [executeCommand, paths]);

  return null;
}

export interface WorkbenchSampleStoryShellProps {
  appearance?: WorkbenchAppearanceSettings;
  permissionRole?: WorkbenchPermissionRole;
  workspaceInit?: VirtualWorkspaceInitialState;
}

export function WorkbenchSampleStoryShell({
  appearance: appearanceInput,
  permissionRole = 'owner',
  workspaceInit = sampleVirtualWorkspace,
}: WorkbenchSampleStoryShellProps) {
  const [appearance, setAppearance] = useState<WorkbenchAppearanceSettings>(
    appearanceInput ?? defaultAppearance,
  );
  const extensionsConfig = resolveSampleExtensionsForRole(permissionRole);
  const contextKeyValues = createSamplePermissionContextKeys(permissionRole);

  return (
    <WorkbenchStoryHost theme={appearance.themePreference === 'light' ? 'light' : 'dark'}>
      <WorkbenchProvider
        contextKeyValues={contextKeyValues}
        extensionsConfig={extensionsConfig}
        initialLayout={sampleInitialLayout}
        persistEditorState={false}
        persistLayout={false}
        workspaceHostPort={createWorkbenchWorkspaceHostPort()}
      >
        <WorkbenchStartupGate heading="Workbench Sample" workspaceInit={workspaceInit}>
          <OpenWorkspacePathsOnReady paths={workspaceInit.openPaths ?? []} />
          <WorkbenchShell
            darkPreset={appearance.darkPreset}
            editorArea={<EditorArea theme="dark" />}
            lightPreset={appearance.lightPreset}
            rootClassName="ide-root"
            theme={appearance.themePreference}
            title="Workbench Sample"
            onDarkPresetChange={(nextPreset) => {
              setAppearance((current) => ({ ...current, darkPreset: nextPreset }));
            }}
            onLightPresetChange={(nextPreset) => {
              setAppearance((current) => ({ ...current, lightPreset: nextPreset }));
            }}
            onThemeChange={(nextTheme) => {
              if (nextTheme === 'system' || nextTheme === 'light' || nextTheme === 'dark') {
                setAppearance((current) => ({ ...current, themePreference: nextTheme }));
              }
            }}
          />
        </WorkbenchStartupGate>
      </WorkbenchProvider>
    </WorkbenchStoryHost>
  );
}
