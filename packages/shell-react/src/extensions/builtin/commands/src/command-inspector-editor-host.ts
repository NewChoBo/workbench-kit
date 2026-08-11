import { parseCommandInspectorUri } from '@workbench-kit/react/workbench/management';
import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

export const COMMAND_INSPECTOR_EDITOR_ID = 'workbench-kit.builtin.commands.inspector' as const;
export const COMMAND_INSPECTOR_EDITOR_HOST_RENDER_KIND =
  'workbench-kit.builtin.commands/inspector' as const;

export interface CommandInspectorEditorHostRenderData {
  readonly commandId: string;
  readonly kind: typeof COMMAND_INSPECTOR_EDITOR_HOST_RENDER_KIND;
  readonly resourceUri: string;
}

export interface CommandInspectorEditorHostOptions {
  readonly resourceUri: string;
}

export class CommandInspectorEditorHost implements EditorHost {
  readonly title: string;
  dirty = false;
  onDidChangeDirty?: (dirty: boolean) => void;

  private readonly commandId: string;

  constructor(private readonly options: CommandInspectorEditorHostOptions) {
    const commandId = parseCommandInspectorUri(options.resourceUri);
    if (!commandId) {
      throw new Error(`Invalid command inspector resource URI: ${options.resourceUri}`);
    }

    this.commandId = commandId;
    this.title = commandId;
  }

  dispose(): void {
    this.onDidChangeDirty = undefined;
  }

  render(): CommandInspectorEditorHostRenderData {
    return {
      commandId: this.commandId,
      kind: COMMAND_INSPECTOR_EDITOR_HOST_RENDER_KIND,
      resourceUri: this.options.resourceUri,
    };
  }
}

export function isCommandInspectorEditorHostRenderData(
  value: unknown,
): value is CommandInspectorEditorHostRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CommandInspectorEditorHostRenderData>;
  return (
    candidate.kind === COMMAND_INSPECTOR_EDITOR_HOST_RENDER_KIND &&
    typeof candidate.commandId === 'string' &&
    typeof candidate.resourceUri === 'string'
  );
}
