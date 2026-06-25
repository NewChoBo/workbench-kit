import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import {
  COMMAND_INSPECTOR_EDITOR_ID,
  CommandInspectorEditorHost,
  parseCommandInspectorUri,
} from './command-inspector-editor-host.js';

export const EXTENSION_ID = 'workbench-kit.builtin.commands' as const;
export const COMMANDS_VIEW_ID = 'workbench-kit.builtin.commands.panel' as const;
export const COMMANDS_VIEW_RENDER_KIND = 'workbench-kit.builtin.commands.view' as const;
export const FOCUS_COMMAND_ID = 'workbench-kit.builtin.commands.focus' as const;
export const REFRESH_COMMAND_ID = 'workbench-kit.builtin.commands.refresh' as const;

export interface BuiltinCommandsViewRenderData {
  readonly kind: typeof COMMANDS_VIEW_RENDER_KIND;
}

export {
  COMMAND_INSPECTOR_EDITOR_HOST_RENDER_KIND,
  COMMAND_INSPECTOR_EDITOR_ID,
  CommandInspectorEditorHost,
  isCommandInspectorEditorHostRenderData,
  parseCommandInspectorUri,
  type CommandInspectorEditorHostRenderData,
} from './command-inspector-editor-host.js';

export function activate(context: ExtensionContext): void {
  context.editorResolvers.registerResolver({
    id: 'command-inspector',
    priority: 20,
    canResolve: ({ resourceUri }) => parseCommandInspectorUri(resourceUri) !== undefined,
    resolve: () => COMMAND_INSPECTOR_EDITOR_ID,
  });

  context.editorHostFactories.registerFactory({
    id: 'workbench-kit.builtin.commands.inspectorHost',
    priority: 20,
    canCreate: ({ editorId }) => editorId === COMMAND_INSPECTOR_EDITOR_ID,
    create: ({ resourceUri }) => {
      return new CommandInspectorEditorHost({ resourceUri });
    },
  });

  context.commands.registerCommand(FOCUS_COMMAND_ID, () => ({
    focused: true,
    viewId: COMMANDS_VIEW_ID,
  }));

  context.commands.registerCommand(REFRESH_COMMAND_ID, () => ({
    refreshed: true,
    viewId: COMMANDS_VIEW_ID,
  }));

  context.views.registerViewProvider({
    viewId: COMMANDS_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinCommandsViewRenderData => ({
        kind: COMMANDS_VIEW_RENDER_KIND,
      }),
      title: 'Commands',
    }),
  });
}
