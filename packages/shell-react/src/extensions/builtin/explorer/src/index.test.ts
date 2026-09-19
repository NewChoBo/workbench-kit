import type { CommandServiceHandler } from '@workbench-kit/platform';
import {
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  type ExtensionContext,
  type WorkbenchEditorServiceCapability,
} from '@workbench-kit/workbench-extension-sdk';
import {
  createEditorHostFactoryRegistry,
  createEditorService,
  saveActiveEditor,
  type EditorService,
} from '@workbench-kit/workbench-core';
import { describe, expect, it } from 'vitest';

import { WorkspaceResourceService } from '@workbench-kit/workspace';
import {
  createWorkbenchWorkspaceHostPort,
  createWorkspaceResourceTransaction,
} from '@workbench-kit/workspace';
import { TextEditorHost } from '../../editor/src/text-editor-host.js';
import { activate, MOVE_COMMAND_ID } from './index.js';

function createContext({
  dirtyResourceUris = [],
  editorService,
  service,
}: {
  dirtyResourceUris?: readonly string[];
  editorService?: WorkbenchEditorServiceCapability;
  service: WorkspaceResourceService;
}) {
  const handlers = new Map<string, CommandServiceHandler>();
  const context = {
    capabilities: { registerProvider: () => ({ dispose() {} }) },
    commands: {
      registerCommand: (commandId: string, handler: CommandServiceHandler) => {
        handlers.set(commandId, handler);
        return { dispose() {} };
      },
    },
    editorDocumentViews: { registerProvider: () => ({ dispose() {} }) },
    editorHostFactories: { registerFactory: () => ({ dispose() {} }) },
    editorResolvers: { registerResolver: () => ({ dispose() {} }) },
    extensionId: 'workbench-kit.builtin.explorer',
    extensionPath: 'extensions/builtin.explorer',
    getCapability: <T>(capabilityId: string) => {
      if (capabilityId === 'workbench.workspace') return service as T;
      if (capabilityId === WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID) {
        if (editorService) return editorService as T;
        return { getDirtyResourceUris: () => dirtyResourceUris } as T;
      }
      return undefined;
    },
    permissions: ['workspace.read', 'workspace.write'],
    requiredCapabilities: ['workbench.workspace'],
    subscriptions: { add() {} },
    viewHostFactories: { registerFactory: () => ({ dispose() {} }) },
    views: { registerViewProvider: () => ({ dispose() {} }) },
  } satisfies ExtensionContext;

  activate(context);
  return handlers;
}

describe('builtin explorer dirty-resource protection', () => {
  it('denies dirty rename before mutation and preserves journal and version', async () => {
    const service = new WorkspaceResourceService({
      initialState: { files: [{ content: 'draft', path: 'src/App.tsx' }] },
    });
    const handlers = createContext({
      dirtyResourceUris: ['workspace://file/src/%41pp.tsx'],
      service,
    });
    const before = service.getSnapshot();

    expect(() =>
      handlers.get('workspace.rename')?.({ path: 'src/App.tsx', name: 'Renamed.tsx' }),
    ).toThrow('Save the affected editor');

    expect(service.getSnapshot()).toEqual(before);
    expect(service.getTransactionJournal()).toHaveLength(0);
    expect(service.getFile('src/App.tsx')?.content).toBe('draft');
  });

  it('blocks dirty descendants and mixed move batches while respecting folder boundaries', async () => {
    const service = new WorkspaceResourceService({
      initialState: {
        files: [
          { content: 'nested', path: 'src/a/file.ts' },
          { content: 'neighbor', path: 'src/ab.ts' },
        ],
        folders: ['src', 'src/a'],
      },
    });
    const handlers = createContext({
      dirtyResourceUris: ['workspace://file/src/ab.ts'],
      service,
    });

    expect(
      handlers.get('workspace.rename')?.({ path: 'src/a', kind: 'folder', name: 'renamed' }),
    ).toMatchObject({ transactionId: expect.any(String) });
    expect(service.getFile('src/renamed/file.ts')).toBeDefined();
    expect(service.getFile('src/ab.ts')).toBeDefined();

    const mixedService = new WorkspaceResourceService({
      initialState: {
        files: [
          { content: 'dirty', path: 'src/dirty.ts' },
          { content: 'clean', path: 'src/clean.ts' },
        ],
        folders: ['src', 'dest'],
      },
    });
    const mixedHandlers = createContext({
      dirtyResourceUris: ['workspace://file/src/dirty.ts'],
      service: mixedService,
    });
    const before = mixedService.getSnapshot();

    expect(() =>
      mixedHandlers.get(MOVE_COMMAND_ID)?.({
        sourcePaths: ['src/clean.ts', 'src/dirty.ts'],
        targetFolderPath: 'dest',
      }),
    ).toThrow('Save the affected editor');
    expect(mixedService.getSnapshot()).toEqual(before);
    expect(mixedService.getTransactionJournal()).toHaveLength(0);
  });

  it('does not create a transaction for invalid actions', () => {
    const service = new WorkspaceResourceService({
      initialState: { files: [{ content: 'file', path: 'src/file.ts' }] },
    });
    const handlers = createContext({ service });

    expect(handlers.get('workspace.delete')?.({ paths: ['missing.ts'] })).toBeUndefined();
    expect(service.getTransactionJournal()).toHaveLength(0);
  });

  it('wires dirty inactive hosts through denial, save-first mutation and reconcile protection', () => {
    const workspaceHost = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { content: 'draft on disk', path: 'src/folder/draft.ts' },
          { content: 'other', path: 'src/other.ts' },
          { content: 'dirty file', path: 'src/dirty.ts' },
          { content: 'clean file', path: 'src/clean.ts' },
        ],
        folders: ['src', 'src/folder', 'dest'],
      },
    });
    const editorHostFactories = createEditorHostFactoryRegistry();
    const draft = 'unsaved draft';

    editorHostFactories.register({
      id: 'stateful-text-host',
      create: ({ resource, resourceUri }) =>
        new TextEditorHost({
          initialContent:
            typeof resource === 'object' && resource !== null && 'content' in resource
              ? String((resource as { content: unknown }).content)
              : undefined,
          resourceUri,
        }),
    });
    const editorService: EditorService = createEditorService({
      editorHostFactories,
      resolveEditorResource: workspaceHost.resolveResource,
    });
    const dirtyTab = editorService.openEditor({
      dirty: true,
      editorId: 'stateful-text-host',
      pinned: true,
      resourceUri: 'workspace://file/src/folder/draft.ts',
    });
    const host = editorService.createEditorHost(dirtyTab.id) as TextEditorHost;
    host.setContent(draft);
    host.onDidChangeDirty = (dirty) => editorService.setDirty(dirtyTab.id, dirty);
    const otherTab = editorService.openEditor({
      editorId: 'stateful-text-host',
      pinned: true,
      resourceUri: 'workspace://file/src/other.ts',
    });
    editorService.setActiveEditor(otherTab.id);
    const dirtyFileTab = editorService.openEditor({
      dirty: true,
      editorId: 'stateful-text-host',
      pinned: true,
      resourceUri: 'workspace://file/src/dirty.ts',
    });
    const dirtyFileHost = editorService.createEditorHost(dirtyFileTab.id) as TextEditorHost;
    dirtyFileHost.onDidChangeDirty = (dirty) => editorService.setDirty(dirtyFileTab.id, dirty);
    editorService.setActiveEditor(otherTab.id);
    const handlers = createContext({ editorService, service: workspaceHost.service });
    const before = workspaceHost.service.getSnapshot();

    for (const command of [
      ['workspace.rename', { kind: 'folder', name: 'renamed', path: 'src/folder' }],
      ['workspace.delete', { kind: 'folder', paths: ['src/folder'] }],
      [MOVE_COMMAND_ID, { sourcePaths: ['src/folder'], targetFolderPath: 'dest' }],
    ] as const) {
      expect(() => handlers.get(command[0])?.(command[1])).toThrow('Save the affected editor');
    }
    expect(workspaceHost.service.getSnapshot()).toEqual(before);
    expect(workspaceHost.service.getTransactionJournal()).toHaveLength(0);
    expect(editorService.getEditorHost(dirtyTab.id)).toBe(host);

    expect(() =>
      handlers.get('workspace.delete')?.({
        kind: 'file',
        paths: ['src/clean.ts', 'src/dirty.ts'],
      }),
    ).toThrow('Save the affected editor');
    expect(() =>
      handlers.get(MOVE_COMMAND_ID)?.({
        sourcePaths: ['src/clean.ts', 'src/dirty.ts'],
        targetFolderPath: 'src/folder',
      }),
    ).toThrow('Save the affected editor');
    expect(workspaceHost.service.getSnapshot()).toEqual(before);

    workspaceHost.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'External delete',
        mutations: [{ path: 'src/folder/draft.ts', type: 'delete-file' }],
      }),
    );
    expect(saveActiveEditor({ editorSavePort: workspaceHost, editorService })).toEqual({
      saved: false,
    });
    expect(workspaceHost.service.getFile('src/folder/draft.ts')).toBeUndefined();
    editorService.reconcileWorkspaceFileTabs(
      (resourceUri) => workspaceHost.resolveResource?.(resourceUri) !== undefined,
    );
    expect(editorService.getEditorHost(dirtyTab.id)).toBe(host);
    expect(host.render().initialContent).toBe('unsaved draft');
    expect(saveActiveEditor({ editorSavePort: workspaceHost, editorService })).toEqual({
      saved: false,
    });
    expect(workspaceHost.service.getFile('src/folder/draft.ts')).toBeUndefined();
    expect(editorService.getState().groups.flatMap((group) => group.tabs)).toContainEqual(
      expect.objectContaining({ dirty: true, id: dirtyTab.id }),
    );
    expect(editorService.getState().groups.flatMap((group) => group.tabs)).toContainEqual(
      expect.objectContaining({ dirty: true, resourceMissing: true, id: dirtyTab.id }),
    );

    workspaceHost.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'External restore',
        mutations: [
          {
            file: { content: 'restored disk', path: 'src/folder/draft.ts' },
            path: 'src/folder/draft.ts',
            type: 'create-file',
          },
        ],
      }),
    );
    editorService.reconcileWorkspaceFileTabs(
      (resourceUri) => workspaceHost.resolveResource?.(resourceUri) !== undefined,
    );
    expect(editorService.getEditorHost(dirtyTab.id)).toBe(host);
    expect(host.render().initialContent).toBe('unsaved draft');
    editorService.setActiveEditor(dirtyTab.id);
    expect(saveActiveEditor({ editorSavePort: workspaceHost, editorService }).saved).toBe(true);
    expect(
      handlers.get('workspace.rename')?.({ path: 'src/folder/draft.ts', name: 'saved.ts' }),
    ).toMatchObject({ transactionId: expect.any(String) });
    expect(workspaceHost.service.getFile('src/folder/saved.ts')?.content).toBe('unsaved draft');
  });
});
