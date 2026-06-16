import {
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  type ExtensionContext,
  type WorkbenchEditorServiceCapability,
} from '@workbench-kit/workbench-extension-sdk';
import {
  WORKBENCH_WORKSPACE_CAPABILITY_ID,
  createWorkspaceResourceTransaction,
  fileNameOfPath,
  formatWorkspaceResourceUri,
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentPathOf,
  type VirtualWorkspaceState,
  type WorkspaceResourceMutation,
  type WorkspaceResourceService,
} from '@workbench-kit/workspace';

export const EXTENSION_ID = 'workbench-kit.builtin.explorer' as const;

export const EXPLORER_VIEW_ID = 'workbench-kit.builtin.explorer.tree' as const;
export const EXPLORER_VIEW_RENDER_KIND = 'workbench-kit.builtin.explorer.view' as const;
export const REFRESH_COMMAND_ID = 'workbench-kit.builtin.explorer.refresh' as const;
export const REVEAL_COMMAND_ID = 'workbench-kit.builtin.explorer.reveal' as const;
export const FOCUS_COMMAND_ID = 'workbench-kit.builtin.explorer.focus' as const;
export const MOVE_COMMAND_ID = 'workbench-kit.builtin.explorer.move' as const;

const WORKSPACE_NEW_FILE_COMMAND_ID = 'workspace.newFile' as const;
const WORKSPACE_NEW_FOLDER_COMMAND_ID = 'workspace.newFolder' as const;
const WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;
const WORKSPACE_COPY_PATH_COMMAND_ID = 'workspace.copyPath' as const;
const WORKSPACE_RENAME_COMMAND_ID = 'workspace.rename' as const;
const WORKSPACE_DELETE_COMMAND_ID = 'workspace.delete' as const;

interface ExplorerViewRenderData {
  readonly kind: typeof EXPLORER_VIEW_RENDER_KIND;
}

interface WorkspaceCommandResult {
  readonly path?: string | undefined;
  readonly paths?: readonly string[] | undefined;
  readonly transactionId?: string | undefined;
}

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(REFRESH_COMMAND_ID, () => {
    const service = getWorkspaceService(context);
    return {
      refreshed: true,
      version: service?.getSnapshot().version,
      viewId: EXPLORER_VIEW_ID,
    };
  });

  context.commands.registerCommand(REVEAL_COMMAND_ID, (input) => ({
    path: readFirstPath(input),
    viewId: EXPLORER_VIEW_ID,
  }));

  context.commands.registerCommand(FOCUS_COMMAND_ID, () => ({
    focused: true,
    viewId: EXPLORER_VIEW_ID,
  }));

  context.commands.registerCommand(WORKSPACE_NEW_FILE_COMMAND_ID, (input) =>
    createWorkspaceFile(context, input),
  );

  context.commands.registerCommand(WORKSPACE_NEW_FOLDER_COMMAND_ID, (input) =>
    createWorkspaceFolder(context, input),
  );

  context.commands.registerCommand(WORKSPACE_OPEN_COMMAND_ID, (input) =>
    openWorkspaceTargets(context, input),
  );

  context.commands.registerCommand(WORKSPACE_COPY_PATH_COMMAND_ID, (input) =>
    copyWorkspacePaths(input),
  );

  context.commands.registerCommand(WORKSPACE_RENAME_COMMAND_ID, (input) =>
    renameWorkspaceTarget(context, input),
  );

  context.commands.registerCommand(WORKSPACE_DELETE_COMMAND_ID, (input) =>
    deleteWorkspaceTargets(context, input),
  );

  context.commands.registerCommand(MOVE_COMMAND_ID, (input) =>
    moveWorkspaceTargets(context, input),
  );

  context.views.registerViewProvider({
    viewId: EXPLORER_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): ExplorerViewRenderData => ({ kind: EXPLORER_VIEW_RENDER_KIND }),
      title: 'Explorer',
    }),
  });
}

function createWorkspaceFile(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  if (!service) return undefined;

  const state = service.getState();
  const parentPath = normalizeWorkspacePath(readString(input, 'parentPath') ?? '');
  const explicitPath = normalizeWorkspacePath(readString(input, 'path') ?? '');
  const path =
    explicitPath ||
    resolveNewEntryPath({
      fallbackName: 'untitled.md',
      input,
      parentPath,
      state,
    });

  if (
    !path ||
    !isWorkspaceEntryPathAvailable({ files: state.files, folders: state.folders, path })
  ) {
    return undefined;
  }

  return applyMutations(service, 'Create file', [
    {
      file: {
        content: '',
        path,
        source: 'user',
      },
      path,
      type: 'create-file',
    },
  ]);
}

function createWorkspaceFolder(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  if (!service) return undefined;

  const state = service.getState();
  const parentPath = normalizeWorkspacePath(readString(input, 'parentPath') ?? '');
  const explicitPath = normalizeWorkspacePath(readString(input, 'path') ?? '');
  const path =
    explicitPath ||
    resolveNewEntryPath({
      fallbackName: 'new-folder',
      input,
      parentPath,
      state,
    });

  if (
    !path ||
    !isWorkspaceEntryPathAvailable({ files: state.files, folders: state.folders, path })
  ) {
    return undefined;
  }

  return applyMutations(service, 'Create folder', [{ path, type: 'create-folder' }]);
}

function openWorkspaceTargets(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  const editorService = context.getCapability<WorkbenchEditorServiceCapability>(
    WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  );
  if (!service || !editorService) return undefined;

  const fileByPath = new Map(service.getState().files.map((file) => [file.path, file]));
  const paths = readPaths(input).filter((path) => fileByPath.has(path));
  for (const path of paths) {
    const file = fileByPath.get(path);
    editorService.openEditor({
      pinned: true,
      resourceUri: formatWorkspaceResourceUri({ kind: 'file', path }),
      title: file ? fileNameOfPath(file.path) : fileNameOfPath(path),
    });
  }

  return paths.length > 0 ? { paths } : undefined;
}

function copyWorkspacePaths(input: unknown): WorkspaceCommandResult | undefined {
  const paths = readPaths(input);
  if (paths.length === 0) return undefined;

  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard) {
    void clipboard.writeText(paths.join('\n')).catch(() => undefined);
  }

  return { paths };
}

function renameWorkspaceTarget(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  if (!service) return undefined;

  const state = service.getState();
  const path = readFirstPath(input);
  const name = readString(input, 'name')?.trim();
  if (!path || !name || !isSimpleWorkspaceName(name)) {
    return undefined;
  }

  const destinationPath = joinWorkspacePath(parentPathOf(path), name);
  if (
    !destinationPath ||
    !isWorkspaceEntryPathAvailable({
      excludedPaths: [path],
      files: state.files,
      folders: state.folders,
      path: destinationPath,
    })
  ) {
    return undefined;
  }

  const kind =
    readString(input, 'kind') === 'folder' ? 'folder' : resolveWorkspacePathKind(state, path);
  if (!kind) return undefined;

  return applyMutations(
    service,
    kind === 'folder' ? 'Rename folder' : 'Rename file',
    [
      kind === 'folder'
        ? { name, path, type: 'rename-folder' }
        : { name, path, type: 'rename-file' },
    ],
    { path: destinationPath, paths: [destinationPath] },
  );
}

function deleteWorkspaceTargets(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  if (!service) return undefined;

  const state = service.getState();
  const mutations = readPaths(input)
    .map((path): WorkspaceResourceMutation | undefined => {
      const kind =
        readString(input, 'kind') === 'folder' ? 'folder' : resolveWorkspacePathKind(state, path);
      if (kind === 'folder') {
        return { path, type: 'delete-folder' };
      }

      if (kind === 'file') {
        return { path, type: 'delete-file' };
      }

      return undefined;
    })
    .filter((mutation): mutation is WorkspaceResourceMutation => Boolean(mutation));

  if (mutations.length === 0) return undefined;

  return applyMutations(service, 'Delete workspace entries', mutations, { paths: [] });
}

function moveWorkspaceTargets(
  context: ExtensionContext,
  input: unknown,
): WorkspaceCommandResult | undefined {
  const service = getWorkspaceService(context);
  if (!service) return undefined;

  const state = service.getState();
  const targetFolderPath = normalizeWorkspacePath(readString(input, 'targetFolderPath') ?? '');
  const plan = getWorkspaceFileMovePlan({
    files: state.files,
    folders: state.folders,
    sourcePaths: readStringArray(input, 'sourcePaths'),
    targetFolderPath,
  });
  const mutations = plan.moves.map<WorkspaceResourceMutation>((move) => ({
    sourcePath: move.sourcePath,
    targetFolderPath: plan.targetFolderPath,
    type: 'move-file',
  }));

  if (mutations.length === 0) return undefined;

  return applyMutations(service, 'Move workspace files', mutations, {
    paths: plan.moves.map((move) => move.destinationPath),
  });
}

function applyMutations(
  service: WorkspaceResourceService,
  label: string,
  mutations: readonly WorkspaceResourceMutation[],
  result: Omit<WorkspaceCommandResult, 'transactionId'> = {},
): WorkspaceCommandResult {
  const transaction = createWorkspaceResourceTransaction({ label, mutations });
  service.applyTransaction(transaction);

  const mutationPaths = mutations.flatMap((mutation) => {
    if ('path' in mutation) return [mutation.path];
    if (mutation.type === 'move-file') return [mutation.sourcePath];
    return [];
  });

  return {
    path: result.path ?? result.paths?.[0] ?? mutationPaths[0],
    paths: result.paths ?? mutationPaths,
    transactionId: transaction.id,
  };
}

function resolveNewEntryPath({
  fallbackName,
  input,
  parentPath,
  state,
}: {
  fallbackName: string;
  input: unknown;
  parentPath: string;
  state: VirtualWorkspaceState;
}): string {
  const preferredName = readString(input, 'name')?.trim() || fallbackName;
  if (!isSimpleWorkspaceName(preferredName)) return '';

  const name = getAvailableWorkspaceEntryName({
    files: state.files,
    folders: state.folders,
    parentPath,
    preferredName,
  });

  return joinWorkspacePath(parentPath, name);
}

function getWorkspaceService(context: ExtensionContext): WorkspaceResourceService | undefined {
  return context.getCapability<WorkspaceResourceService>(WORKBENCH_WORKSPACE_CAPABILITY_ID);
}

function resolveWorkspacePathKind(
  state: VirtualWorkspaceState,
  path: string,
): 'file' | 'folder' | undefined {
  if (state.files.some((file) => file.path === path)) return 'file';
  if (state.folders.includes(path)) return 'folder';
  return undefined;
}

function readFirstPath(input: unknown): string | undefined {
  return readPaths(input)[0];
}

function readPaths(input: unknown): string[] {
  const paths = readStringArray(input, 'paths');
  const path = readString(input, 'path');
  const allPaths = path ? [path, ...paths] : paths;

  return [...new Set(allPaths.map(normalizeWorkspacePath).filter(Boolean))];
}

function readStringArray(input: unknown, key: string): string[] {
  const value = isRecord(input) ? input[key] : undefined;
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readString(input: unknown, key: string): string | undefined {
  const value = isRecord(input) ? input[key] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
