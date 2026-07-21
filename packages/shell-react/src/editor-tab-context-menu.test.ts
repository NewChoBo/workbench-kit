import {
  ExtensionRegistry,
  type EditorService,
  type EditorTabState,
} from '@workbench-kit/workbench-core';
import { describe, expect, it } from 'vitest';

import { createEditorTabContextMenuItems } from './editor-tab-context-menu.js';

describe('createEditorTabContextMenuItems', () => {
  it('appends extension editor tab context menu contributions', () => {
    const extensionRegistry = new ExtensionRegistry();
    const calls: string[] = [];

    extensionRegistry.commands.registerCommand({
      id: 'sample.action.inspectTab',
      title: 'Inspect Tab',
    });
    extensionRegistry.menus.registerMenuItem({
      command: 'sample.action.inspectTab',
      menu: 'editor/tab/context',
      when: 'editor.isPinned',
    });

    const items = createEditorTabContextMenuItems({
      editorService: createEditorServiceStub(),
      executeExtensionCommand: (commandId) => calls.push(commandId),
      extensionRegistry,
      groupId: 'group-1',
      tab: createEditorTab({ pinned: true }),
      tabs: [createEditorTab({ pinned: true })],
    });

    expect(items.map((item) => item.id)).toContain('editor-tab-extension-separator');
    expect(items.map((item) => item.id)).toContain('editor/tab/context:sample.action.inspectTab:0');

    const item = items.find(
      (candidate) => candidate.id === 'editor/tab/context:sample.action.inspectTab:0',
    );
    if (!item || item.type === 'separator') {
      throw new Error('Extension menu item not found.');
    }

    item.onSelect();

    expect(calls).toEqual(['sample.action.inspectTab']);
  });
});

function createEditorTab(overrides: Partial<EditorTabState> = {}): EditorTabState {
  return {
    dirty: false,
    editorId: 'workbench.editor.default',
    id: 'tab-1',
    pinned: false,
    preview: false,
    resourceUri: 'workspace://file/src/app.ts',
    title: 'app.ts',
    ...overrides,
  };
}

function createEditorServiceStub(): EditorService {
  return {
    closeEditor: () => undefined,
    splitEditor: () => undefined,
    togglePinnedEditor: () => undefined,
  } as unknown as EditorService;
}
