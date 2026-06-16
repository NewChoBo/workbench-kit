import type { CommandRegistry } from '@workbench-kit/platform';
import type { EditorHost, WorkbenchEditorSavePort } from '@workbench-kit/workbench-extension-sdk';
import type { Disposable } from '@workbench-kit/base';

import type { EditorService } from './editor-service.js';

export const EDITOR_SAVE_COMMAND_ID = 'editor.save' as const;

export interface SaveActiveEditorInput {
  readonly editorSavePort: WorkbenchEditorSavePort;
  readonly editorService: EditorService;
}

export interface SaveActiveEditorResult {
  readonly resourceUri?: string | undefined;
  readonly saved: boolean;
  readonly transactionId?: string | undefined;
}

interface TextEditorHostLike extends EditorHost {
  getContent?(): string;
  setDirty?(dirty: boolean): void;
}

export function saveActiveEditor(input: SaveActiveEditorInput): SaveActiveEditorResult {
  const activeTab = input.editorService.getActiveTab();
  if (!activeTab?.dirty) {
    return { saved: false };
  }

  const host = input.editorService.getEditorHost(activeTab.id);
  const content = getTextEditorHostContent(host);
  if (content === undefined) {
    return { saved: false, resourceUri: activeTab.resourceUri };
  }

  const applied = input.editorSavePort.applySave(activeTab.resourceUri, content);
  if (!applied) {
    return { saved: false, resourceUri: activeTab.resourceUri };
  }

  clearEditorHostDirty(host);
  input.editorService.setDirty(activeTab.id, false);

  return {
    resourceUri: activeTab.resourceUri,
    saved: true,
    transactionId: applied.transactionId,
  };
}

export function registerEditorSaveCommand(
  commands: CommandRegistry,
  input: SaveActiveEditorInput,
): Disposable {
  return commands.registerCommand({
    handler: () => saveActiveEditor(input),
    id: EDITOR_SAVE_COMMAND_ID,
    title: 'Save',
  });
}

function getTextEditorHostContent(host: EditorHost | undefined): string | undefined {
  if (!host || typeof (host as TextEditorHostLike).getContent !== 'function') {
    return undefined;
  }

  return (host as TextEditorHostLike).getContent?.();
}

function clearEditorHostDirty(host: EditorHost | undefined): void {
  if (!host || typeof (host as TextEditorHostLike).setDirty !== 'function') {
    return;
  }

  (host as TextEditorHostLike).setDirty?.(false);
}
