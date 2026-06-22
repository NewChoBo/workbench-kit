import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  WorkbenchStoryHost,
  type WorkbenchAppearanceSettings,
} from '@workbench-kit/react/workbench';
import { createWorkbenchPermissionContextKeys } from '@workbench-kit/platform';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';

import {
  EditorArea,
  useWorkbench,
  WorkbenchProvider,
  WorkbenchShell,
  WorkbenchStartupGate,
} from '../index.js';
import {
  resolveSampleExtensionsForRole,
  sampleInitialLayout,
  sampleVirtualWorkspace,
} from './sample-workspace.seed.js';

export {
  SAMPLE_APP_PATH,
  SAMPLE_BUTTON_PATH,
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
  sampleVirtualWorkspace,
  sampleWorkspaceWithOpenPaths,
  sampleWorkspaceWithoutOpenTabs,
} from './sample-workspace.seed.js';

const defaultAppearance: WorkbenchAppearanceSettings = {
  darkPreset: DEFAULT_DARK_THEME_PRESET,
  lightPreset: DEFAULT_LIGHT_THEME_PRESET,
  themePreference: 'dark',
};

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
        await executeCommand('workspace.open', {
          kind: 'file',
          path,
          paths: [path],
        });
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
  const contextKeyValues = createWorkbenchPermissionContextKeys({ role: permissionRole });

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
