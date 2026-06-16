import {
  parseWorkbenchExtensionsConfig,
  parseWorkbenchLayoutConfig,
} from '@workbench-kit/workbench-config';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';

import extensionsJson from '../../../.workbench/extensions.json';
import layoutJson from '../../../.workbench/layout.default.json';
import workspaceJson from '../../../.workbench/workspace.json';

export interface SampleWorkspaceInfo {
  readonly name: string;
  readonly folderCount: number;
}

export const extensionsConfig = parseWorkbenchExtensionsConfig(extensionsJson);

export const initialLayout = (() => {
  const layout = parseWorkbenchLayoutConfig(layoutJson);

  return {
    sideBar: {
      activeViewContainer: layout.sideBar.activeViewContainer,
      visible: layout.sideBar.visible,
    },
  };
})();

export const workspaceInfo: SampleWorkspaceInfo = {
  name: readWorkspaceName(workspaceJson),
  folderCount: readWorkspaceFolderCount(workspaceJson),
};

export const initialWorkspace: VirtualWorkspaceInitialState = {
  files: [
    {
      content: [
        'import { WorkbenchProvider, WorkbenchShell } from "@workbench-kit/workbench-react";',
        '',
        'export function App() {',
        '  return <WorkbenchShell />;',
        '}',
      ].join('\n'),
      path: 'src/App.tsx',
    },
    {
      content: [
        '# Workbench Kit Sample',
        '',
        'Frontend-only host demonstrating editor tabs and workspace save.',
      ].join('\n'),
      path: 'README.md',
    },
  ],
  folders: ['src'],
};

function readWorkspaceName(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return 'Workbench';
  }

  const name = (value as { name?: unknown }).name;
  return typeof name === 'string' && name.trim().length > 0 ? name : 'Workbench';
}

function readWorkspaceFolderCount(value: unknown): number {
  if (typeof value !== 'object' || value === null) {
    return 0;
  }

  const folders = (value as { folders?: unknown }).folders;
  return Array.isArray(folders) ? folders.length : 0;
}
