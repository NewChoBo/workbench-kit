import type {
  EditorService,
  EditorState,
  ActivityRegistry,
  ExtensionDependencyDiagnostic,
  LayoutService,
  MenuRegistry,
  ViewRegistry,
  WorkbenchLayoutState,
} from '@workbench-kit/workbench-core';
import type { CommandRegistry, KeybindingRegistry } from '@workbench-kit/platform';
import type {
  WorkbenchWorkspaceHostPort as WorkspaceHostPort,
  WorkspaceResourceTransaction,
} from '@workbench-kit/workspace';

import type {
  WorkbenchExtensionActivationStateReader,
  WorkbenchExtensionCatalogReader,
  WorkbenchWorkspaceHostPort,
} from '../shell/provider.js';

export interface WorkbenchDevtoolsSnapshot {
  readonly activeExtensions: readonly { readonly extensionId: string }[];
  readonly activities: readonly {
    readonly icon?: string;
    readonly id: string;
    readonly title?: string;
  }[];
  readonly capabilities: readonly string[];
  readonly capturedAt: string;
  readonly commands: readonly {
    readonly category?: string;
    readonly id: string;
    readonly title?: string;
  }[];
  readonly contextKeys: Readonly<Record<string, boolean | number | string>>;
  readonly dependencyDiagnostics: readonly ExtensionDependencyDiagnostic[];
  readonly editor: EditorState;
  readonly keybindings: readonly {
    readonly command: string;
    readonly key: string;
    readonly when?: string | undefined;
  }[];
  readonly layout: WorkbenchLayoutState;
  readonly menus: readonly {
    readonly command: string;
    readonly group?: string | undefined;
    readonly menu: string;
    readonly order?: number | undefined;
    readonly when?: string | undefined;
  }[];
  readonly transactions: readonly WorkspaceResourceTransaction[];
  readonly viewContainers: readonly {
    readonly icon?: string;
    readonly id: string;
    readonly location: string;
    readonly title?: string;
  }[];
  readonly views: readonly {
    readonly containerId: string;
    readonly id: string;
    readonly name?: string;
  }[];
}

export interface CollectWorkbenchDevtoolsSnapshotInput {
  readonly activities: ActivityRegistry;
  readonly capturedAt?: string | undefined;
  readonly commands: CommandRegistry;
  readonly editorService: EditorService;
  readonly extensionActivationState: WorkbenchExtensionActivationStateReader;
  readonly extensionCatalog: WorkbenchExtensionCatalogReader;
  readonly keybindings: KeybindingRegistry;
  readonly layoutService: LayoutService;
  readonly menus: MenuRegistry;
  readonly views: ViewRegistry;
  readonly workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

export function collectWorkbenchDevtoolsSnapshot({
  activities,
  capturedAt = new Date().toISOString(),
  commands,
  editorService,
  extensionActivationState,
  extensionCatalog,
  keybindings,
  layoutService,
  menus,
  views,
  workspaceHostPort,
}: CollectWorkbenchDevtoolsSnapshotInput): WorkbenchDevtoolsSnapshot {
  const layout = layoutService.getState();
  const editor = editorService.getState();
  const activeTabCount = editor.groups.reduce((count, group) => count + group.tabs.length, 0);

  return {
    activeExtensions: extensionActivationState.getActiveExtensions().map(({ extensionId }) => ({
      extensionId,
    })),
    activities: activities.getActivities().map((activity) => ({
      icon: activity.icon,
      id: activity.id,
      title: activity.title,
    })),
    capabilities: extensionCatalog.listCapabilityProviderIds(),
    capturedAt,
    commands: commands.getCommands().map((command) => ({
      category: command.category,
      id: command.id,
      title: command.title,
    })),
    contextKeys: {
      'editor.activeGroupId': editor.activeGroupId ?? '',
      'editor.openTabCount': activeTabCount,
      'layout.activityBar.visible': layout.activityBar.visible,
      'layout.auxiliaryBar.visible': layout.auxiliaryBar.visible,
      'layout.panel.visible': layout.panel.visible,
      'layout.sideBar.activeViewContainer': layout.sideBar.activeViewContainer ?? '',
      'layout.sideBar.visible': layout.sideBar.visible,
      'workspace.hasHostPort': workspaceHostPort !== undefined,
    },
    dependencyDiagnostics: extensionCatalog.getDependencyDiagnostics(),
    editor,
    keybindings: keybindings.getKeybindings().map((binding) => ({
      command: binding.command,
      key: binding.key,
      when: binding.when,
    })),
    layout,
    menus: menus.getMenuItems().map((menu) => ({
      command: menu.command,
      group: menu.group,
      menu: menu.menu,
      order: menu.order,
      when: menu.when,
    })),
    transactions: readWorkspaceTransactionJournal(workspaceHostPort),
    viewContainers: views.getViewContainers().map((container) => ({
      icon: container.icon,
      id: container.id,
      location: container.location,
      title: container.title,
    })),
    views: views.getViews().map((view) => ({
      containerId: view.containerId,
      id: view.id,
      name: view.name,
    })),
  };
}

function readWorkspaceTransactionJournal(
  workspaceHostPort: WorkbenchWorkspaceHostPort | undefined,
): readonly WorkspaceResourceTransaction[] {
  const port = workspaceHostPort as WorkspaceHostPort | undefined;
  return port?.service.getTransactionJournal() ?? [];
}
