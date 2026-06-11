import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { executeCommand, type CommandMenuEntry } from '@workbench-kit/platform';
import {
  createChatTransportFromRuntime,
  createIntegratedShellBootstrapInitialState,
  createIntegratedShellChatRuntimeResponse,
  createWorkspaceFileRepository,
  integratedShellDefaultSelectionByActivity,
  integratedShellInitialRuntimeMessages,
  integratedShellWorkspaceFiles,
  integratedShellWorkspaceFolders,
} from '@workbench-kit/adapters';
import { createMockWorkbenchRuntime, type RuntimeStatus } from '@workbench-kit/runtime';
import {
  isSaveFailure,
  type ChatStreamEvent,
  isSaveSuccess,
  type SaveFailure,
  type WorkspacePatchApplyResult,
  type WorkspacePatchEvent,
} from '@workbench-kit/contracts';
import { WorkspacePatchService, WorkspaceSaveService } from '@workbench-kit/services';
import { createWorkbenchExtensionRuntimeFromContributions } from '@workbench-kit/vscode-extension';
import { SideBarHeaderControl, SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ConfirmDialog } from '../../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { IconButton } from '../../primitives/IconButton';
import { TextInput } from '../../primitives/TextInput';
import { ChatPanel, type ChatMessage } from '../chat';
import {
  commandMenuItemsToContextMenuItems,
  resolveWorkbenchCommandMenuItems,
  WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
} from '../commands';
import { WorkbenchSettingsModal } from '../settings';
import { WorkbenchStandaloneShell } from '../WorkbenchStandaloneShell';
import type { WorkbenchStandaloneShellContext } from '../WorkbenchStandaloneShell';
import {
  WorkspaceEditorPanel,
  type WorkspaceEditorTheme,
  WorkspaceExplorer,
  WorkspaceSearchPanel,
  fileNameOfPath,
  useVirtualWorkspace,
  type WorkspaceTreeNode,
} from '../workspace';
import {
  integratedShellActivities,
  integratedShellCommandActivities,
  type IntegratedShellActivityId,
} from './integratedShellActivities';
import {
  integratedShellCommandContributions,
  integratedShellCommandPolicy,
  integratedShellCommandRegistry,
  integratedShellMenuEntries,
  integratedShellShellCommandRegistry,
  integratedShellWorkspaceCreateMenuEntries,
  integratedShellWorkspaceFolderMenuEntries,
  integratedShellWorkspaceTargetMenuEntries,
  type IntegratedShellCommandContext,
} from './integratedShellCommands';
import { createIntegratedShellContextKeys } from './integratedShellContextKeys';
import { renderIntegratedShellSettingsCategory } from './integratedShellSettings';
import { getIntegratedStatusSections } from './integratedShellStatus';
import { useIntegratedShellWorkspaceOrchestration } from './integratedShellWorkspaceOrchestration';
import { createWidgetStudioWorkspaceEditorRenderer } from '../../widget-studio/create-widget-studio-workspace-editor.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../../widget-tree/demo-registry.js';

export interface IntegratedShellDemoProps {
  compactRows?: boolean;
  initialActivityId?: IntegratedShellActivityId;
  initialSearchQuery?: string;
  initialTheme?: WorkspaceEditorTheme;
}

interface DemoContextMenuState {
  ariaLabel: string;
  items: ContextMenuItem[];
  x: number;
  y: number;
}

function runtimeMessagesToChatMessages(
  messages: ReturnType<ReturnType<typeof createMockWorkbenchRuntime>['getMessages']>,
): ChatMessage[] {
  return messages.map((message) => ({
    content: message.content,
    id: message.id,
    label: message.label,
    source: message.source,
  }));
}

export function IntegratedShellDemo({
  compactRows: initialCompactRows = true,
  initialActivityId = 'explorer',
  initialSearchQuery = 'button',
  initialTheme = 'dark',
}: IntegratedShellDemoProps = {}) {
  const [chatDraft, setChatDraft] = useState('');
  const [compactRows, setCompactRows] = useState(initialCompactRows);
  const [contextMenu, setContextMenu] = useState<DemoContextMenuState | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [lastCommandLabel, setLastCommandLabel] = useState(
    `Command contribution policy: ${integratedShellCommandPolicy}`,
  );
  const [settingsSearchValue, setSettingsSearchValue] = useState('');

  const chatRuntime = useMemo(
    () =>
      createMockWorkbenchRuntime({
        initialMessages: integratedShellInitialRuntimeMessages,
        response: (message) => createIntegratedShellChatRuntimeResponse(message),
      }),
    [],
  );
  const [runtimeMessages, setRuntimeMessages] = useState<ChatMessage[]>(() =>
    runtimeMessagesToChatMessages(chatRuntime.getMessages()),
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(() => chatRuntime.getStatus());

  const workspace = useVirtualWorkspace({
    expandedPaths: ['src', 'src/components'],
    files: integratedShellWorkspaceFiles,
    folders: [...integratedShellWorkspaceFolders],
    openPaths: [
      'src/App.tsx',
      'src/components/Button.tsx',
      'src/workbench/Shell.tsx',
      'src/widgets/home.widget.json',
    ],
    searchQuery: initialSearchQuery,
    selectedPath: integratedShellDefaultSelectionByActivity.explorer,
  });
  const {
    closeAll: closeAllFiles,
    closeOthers: closeOtherFiles,
    closePath: closeWorkspacePath,
    createFile: createWorkspaceFile,
    deleteFile: deleteWorkspaceFile,
    expandedPaths,
    files,
    moveFile: moveWorkspaceFile,
    openFile,
    openPaths,
    renameFile: renameWorkspaceFile,
    saveFile: saveWorkspaceFile,
    searchQuery,
    searchResults: filteredSearchResults,
    selectedPath,
    setSearchQuery,
    toggleFolder,
    workspaceTree,
  } = workspace;

  const {
    activateFile,
    deleteFile,
    deleteFiles,
    confirmPendingDelete,
    explorerInlineEdit,
    explorerSelection,
    handleExplorerInlineEditCommit,
    handleExplorerInlineEditValueChange,
    handleExplorerRequestDelete,
    handleExplorerRequestMove,
    handleExplorerRequestRename,
    handleExplorerSelectionChange,
    pendingDelete,
    requestWorkspaceDelete,
    requestWorkspaceRename,
    setExplorerInlineEdit,
    setPendingDelete,
    startWorkspaceCreate,
  } = useIntegratedShellWorkspaceOrchestration({
    defaultSelectionPath: integratedShellDefaultSelectionByActivity.explorer,
    onNotify: setLastCommandLabel,
    workspace,
  });

  const openFileRef = useRef(openFile);
  useEffect(() => {
    openFileRef.current = openFile;
  }, [openFile]);

  const workspaceRepository = useMemo(
    () =>
      createWorkspaceFileRepository({
        createFile: createWorkspaceFile,
        deleteFile: deleteWorkspaceFile,
        files,
        saveFile: saveWorkspaceFile,
      }),
    [createWorkspaceFile, deleteWorkspaceFile, files, saveWorkspaceFile],
  );

  const chatRuntimeTransport = useMemo(
    () => createChatTransportFromRuntime({ runtime: chatRuntime }),
    [chatRuntime],
  );

  const applyWorkspacePatchResult = useCallback(
    (_patch: WorkspacePatchEvent, result: WorkspacePatchApplyResult) => {
      if (result.type === 'patch:failed') {
        setLastCommandLabel(`Runtime patch failed: ${result.message ?? `Error ${result.code}`}`);
        return;
      }

      if (result.patch.type === 'delete-file') {
        setLastCommandLabel(`Runtime deleted ${result.patch.path}`);
        return;
      }

      setTimeout(() => {
        openFileRef.current(result.patch.path);
      }, 0);
      setLastCommandLabel(`Runtime wrote ${result.patch.path}`);
    },
    [],
  );

  const extensionRuntime = useMemo(
    () =>
      createWorkbenchExtensionRuntimeFromContributions<IntegratedShellCommandContext>({
        chatTransport: chatRuntimeTransport,
        commandConflictPolicy: integratedShellCommandPolicy,
        commandContributions: integratedShellCommandContributions,
        createPatchService: () => new WorkspacePatchService({ repository: workspaceRepository }),
        createSaveService: () => new WorkspaceSaveService({ repository: workspaceRepository }),
        onChatPatch: applyWorkspacePatchResult,
        repository: workspaceRepository,
      }),
    [chatRuntimeTransport, workspaceRepository, applyWorkspacePatchResult],
  );

  const { patchService: extensionPatchService, saveService: extensionSaveService } =
    extensionRuntime.services;
  const chatService = extensionRuntime.services.chatService;

  const updateRuntimeMessage = useCallback((message: ChatMessage) => {
    setRuntimeMessages((currentMessages) => {
      const index = currentMessages.findIndex((entry) => entry.id === message.id);
      if (index < 0) return [...currentMessages, message];

      const nextMessages = [...currentMessages];
      nextMessages[index] = message;
      return nextMessages;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = chatService.subscribe((event: ChatStreamEvent) => {
      if (event.type === 'message' || event.type === 'message-delta') {
        updateRuntimeMessage(event.message);
      }

      if (event.type === 'status') {
        setRuntimeStatus(event.status);
        if (event.status === 'cancelled') {
          setLastCommandLabel('Chat response stopped');
        }
      }
    });

    return () => {
      unsubscribe();
      extensionRuntime.dispose();
    };
  }, [chatService, extensionRuntime, updateRuntimeMessage]);

  useEffect(
    () => () => {
      chatRuntime.dispose();
    },
    [chatRuntime],
  );

  const openContextMenu = (
    event: MouseEvent<HTMLElement>,
    items: ContextMenuItem[],
    ariaLabel: string,
  ) => {
    event.preventDefault();
    setContextMenu({ ariaLabel, items, x: event.clientX, y: event.clientY });
  };

  const activateSearchResult = (result: (typeof filteredSearchResults)[number]) => {
    activateFile(result.path);
  };

  const closePath = (path: string) => {
    closeWorkspacePath(path);
    setLastCommandLabel(`Closed ${path}`);
  };

  const closeOthers = (path: string) => {
    closeOtherFiles(path);
    setLastCommandLabel('Closed other files');
  };

  const closeAll = () => {
    closeAllFiles();
    setLastCommandLabel('Closed all files');
  };

  const saveFile = (path: string, content: string, previousUpdatedAt?: string) => {
    return Promise.resolve(
      extensionSaveService.saveDraft({
        content,
        mimeType: files.find((file) => file.path === path)?.mimeType,
        path,
        previousUpdatedAt,
        source: 'user',
      }),
    )
      .then((result) => {
        if (isSaveSuccess(result)) {
          setLastCommandLabel(`Saved ${path}`);
          return result;
        }

        if (isSaveFailure(result)) {
          setLastCommandLabel(
            `Save failed for ${path}: ${result.message ?? 'Unknown save failure'}`,
          );
        }

        return result;
      })
      .catch(() => {
        setLastCommandLabel(`Save failed for ${path}`);
        const failure: SaveFailure = {
          code: 'unknown',
          kind: 'save:failure',
          message: 'Failed to save file.',
          path,
        };
        return failure;
      });
  };

  const createCommandContext = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
    overrides: Partial<IntegratedShellCommandContext> = {},
  ): IntegratedShellCommandContext => ({
    createWorkspaceFile: () => startWorkspaceCreate('create-file'),
    createWorkspaceFolder: () => startWorkspaceCreate('create-folder'),
    deleteWorkspaceTarget: () => undefined,
    fileActionPaths: [],
    isPrimarySidebarVisible: shellContext.isPrimarySidebarVisible,
    multiFileAction: false,
    openSettings: shellContext.openSettings,
    openWorkspaceTarget: () => undefined,
    renameWorkspaceTarget: () => undefined,
    copyWorkspaceTarget: () => undefined,
    showActivity: (activityId) => {
      shellContext.showActivity(activityId);
      setLastCommandLabel(`${integratedShellActivities[activityId].label} opened`);
    },
    targetPaths: [],
    togglePrimarySidebar: () => {
      shellContext.togglePrimarySidebar();
      setLastCommandLabel('Primary sidebar toggled');
    },
    workspaceTargetKind: 'file',
    ...overrides,
  });

  const createCommandMenuItems = (
    entries: CommandMenuEntry<IntegratedShellCommandContext>[],
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
    context: IntegratedShellCommandContext,
    surface?: string,
  ): ContextMenuItem[] => {
    const contextKeys = createIntegratedShellContextKeys({
      activeActivityId: shellContext.activityId,
      isPrimarySidebarVisible: shellContext.isPrimarySidebarVisible,
      selectionCount: context.targetPaths.length,
    });

    return commandMenuItemsToContextMenuItems(
      resolveWorkbenchCommandMenuItems({
        context,
        contextKeys,
        entries,
        registry: integratedShellCommandRegistry,
        surface,
      }),
      (commandId) =>
        executeCommand(integratedShellCommandRegistry, commandId, context, contextKeys),
    );
  };

  const createWorkbenchMenuItems = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
  ): ContextMenuItem[] =>
    createCommandMenuItems(
      integratedShellMenuEntries,
      shellContext,
      createCommandContext(shellContext),
      WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
    );

  const createExplorerRootMenuItems = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
  ): ContextMenuItem[] =>
    createCommandMenuItems(
      integratedShellWorkspaceCreateMenuEntries,
      shellContext,
      createCommandContext(shellContext),
      WORKBENCH_COMMAND_SURFACE_WORKSPACE,
    );

  const createWorkspaceMenuItems = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
    node: WorkspaceTreeNode,
    actionPaths: string[] = [node.path],
  ): ContextMenuItem[] => {
    const targetPaths = actionPaths.length > 0 ? actionPaths : [node.path];
    const filePathSet = new Set(files.map((file) => file.path));
    const fileActionPaths =
      node.type === 'file' ? targetPaths.filter((path) => filePathSet.has(path)) : [];
    const multiFileAction = fileActionPaths.length > 1;

    const entries =
      node.type === 'folder'
        ? integratedShellWorkspaceFolderMenuEntries
        : integratedShellWorkspaceTargetMenuEntries;

    return createCommandMenuItems(
      entries,
      shellContext,
      createCommandContext(shellContext, {
        createWorkspaceFile: () => startWorkspaceCreate('create-file', node.path),
        createWorkspaceFolder: () => startWorkspaceCreate('create-folder', node.path),
        deleteWorkspaceTarget: () => requestWorkspaceDelete(node, targetPaths),
        fileActionPaths,
        multiFileAction,
        openWorkspaceTarget: () => {
          if (node.type === 'folder') {
            if (!expandedPaths.has(node.path)) {
              toggleFolder(node.path);
            }
            setLastCommandLabel(`Revealed ${node.path}`);
            return;
          }

          fileActionPaths.forEach(openFile);
          setLastCommandLabel(
            multiFileAction ? `Opened ${fileActionPaths.length} files` : `Opened ${node.path}`,
          );
        },
        copyWorkspaceTarget: () =>
          setLastCommandLabel(
            targetPaths.length > 1 ? `Copied ${targetPaths.length} paths` : `Copied ${node.path}`,
          ),
        renameWorkspaceTarget: () => requestWorkspaceRename(node, targetPaths),
        targetPaths,
        workspaceTargetKind: node.type,
      }),
      WORKBENCH_COMMAND_SURFACE_WORKSPACE,
    );
  };

  const widgetStudioEditorRenderer = useMemo(
    () =>
      createWidgetStudioWorkspaceEditorRenderer({
        registry: WIDGET_TREE_DEMO_REGISTRY,
      }),
    [],
  );

  const bootstrap = useMemo(
    () => ({
      contract: {
        activities: integratedShellCommandActivities,
        commandRegistry: integratedShellShellCommandRegistry,
        statusSections: [],
        initialTheme,
      },
      initialFiles: integratedShellWorkspaceFiles,
      workspace: {
        openFile,
        saveFile,
        deleteFiles,
        moveFiles: (paths: string[], targetParentPath?: string) => {
          paths.forEach((path: string) => moveWorkspaceFile(path, targetParentPath ?? ''));
        },
        rename: renameWorkspaceFile,
      },
      chat: {
        onChatSubmit: () => undefined,
        onCancelChat: () => {
          chatService.cancel();
        },
      },
      patch: {
        onPatchApply: (patch: WorkspacePatchEvent) => extensionPatchService.applyPatch(patch),
      },
      save: {},
      status: {},
      initialState: {
        ...createIntegratedShellBootstrapInitialState({
          activeActivityId: initialActivityId,
          theme: initialTheme,
        }),
        selectedFilePath: selectedPath,
        openFilePaths: openPaths,
      },
    }),
    [chatService, extensionPatchService, initialActivityId, initialTheme, selectedPath],
  );

  const renderPrimarySidebar = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
  ) => {
    const activeActivity = integratedShellActivities[shellContext.activityId];

    return (
      <aside
        aria-label="Primary sidebar"
        className="workbench-primary-side-bar"
        style={{ borderRight: '1px solid var(--color-border)' }}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, .ui-context-menu')) return;

          openContextMenu(
            event,
            shellContext.activityId === 'explorer'
              ? createExplorerRootMenuItems(shellContext)
              : createWorkbenchMenuItems(shellContext),
            'Primary sidebar menu',
          );
        }}
      >
        {shellContext.activityId === 'chat' ? (
          <ChatPanel
            assistantLabel="Assistant"
            disabled={runtimeStatus === 'error'}
            emptyLabel="Ask about this workspace."
            isRunning={runtimeStatus === 'running'}
            messages={runtimeMessages}
            placeholder="Ask about this workspace"
            showTools
            title="Chat"
            value={chatDraft}
            onCancel={() => chatService.cancel()}
            onSubmit={(message) => {
              setChatDraft('');
              void chatService.sendMessage(message);
              setLastCommandLabel('Chat draft sent');
            }}
            onValueChange={setChatDraft}
          />
        ) : shellContext.activityId === 'search' ? (
          <WorkspaceSearchPanel
            activePath={selectedPath}
            query={searchQuery}
            results={filteredSearchResults}
            onActivateResult={activateSearchResult}
            onQueryChange={setSearchQuery}
            onRefresh={() => setLastCommandLabel('Search refreshed')}
            onResultContextMenu={(event, result) =>
              openContextMenu(
                event,
                createWorkspaceMenuItems(shellContext, {
                  children: [],
                  file: result.file,
                  name: fileNameOfPath(result.path),
                  path: result.path,
                  type: 'file',
                }),
                'Search result menu',
              )
            }
          />
        ) : (
          <SideBarViewFrame
            title={activeActivity.label}
            actions={
              shellContext.activityId === 'explorer' ? (
                <>
                  <IconButton
                    icon="codicon-new-file"
                    label="New file"
                    onClick={() => startWorkspaceCreate('create-file')}
                  />
                  <IconButton
                    icon="codicon-new-folder"
                    label="New folder"
                    onClick={() => startWorkspaceCreate('create-folder')}
                  />
                  <IconButton icon="codicon-refresh" label="Refresh" />
                </>
              ) : (
                <IconButton icon="codicon-refresh" label="Refresh" />
              )
            }
            headerAddon={
              <SideBarHeaderControl>
                <TextInput
                  aria-label={`Filter ${activeActivity.label}`}
                  controlWidth="full"
                  placeholder="Filter"
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.currentTarget.value)}
                />
              </SideBarHeaderControl>
            }
          >
            <WorkspaceExplorer
              activePath={selectedPath}
              expandedPaths={expandedPaths}
              filterQuery={filterQuery}
              inlineEdit={explorerInlineEdit}
              nodes={workspaceTree}
              selectedPaths={explorerSelection.paths}
              selectionAnchorPath={explorerSelection.anchorPath}
              onActivateFile={activateFile}
              onInlineEditCancel={() => {
                setExplorerInlineEdit(undefined);
                setLastCommandLabel('Inline edit canceled');
              }}
              onInlineEditCommit={handleExplorerInlineEditCommit}
              onInlineEditValueChange={handleExplorerInlineEditValueChange}
              onItemContextMenu={(event, node, meta) =>
                openContextMenu(
                  event,
                  createWorkspaceMenuItems(shellContext, node, meta.actionPaths),
                  'Workspace item menu',
                )
              }
              onRequestDelete={handleExplorerRequestDelete}
              onRequestMove={handleExplorerRequestMove}
              onRequestRename={handleExplorerRequestRename}
              onSelectionChange={handleExplorerSelectionChange}
              onToggleFolder={toggleFolder}
            />
          </SideBarViewFrame>
        )}
      </aside>
    );
  };

  const renderOverlays = (
    shellContext: WorkbenchStandaloneShellContext<IntegratedShellActivityId, WorkspaceEditorTheme>,
  ) => (
    <>
      {contextMenu ? (
        <ContextMenu
          ariaLabel={contextMenu.ariaLabel}
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          confirmLabel="Delete"
          detail={
            <div className="workbench-delete-targets">
              {pendingDelete.paths.map((path) => (
                <code key={path}>{path}</code>
              ))}
            </div>
          }
          message={
            pendingDelete.type === 'folder'
              ? 'Delete this folder and its files?'
              : pendingDelete.paths.length > 1
                ? 'Delete selected workspace files?'
                : 'Delete this workspace file?'
          }
          title={
            pendingDelete.type === 'folder'
              ? 'Delete Folder'
              : pendingDelete.paths.length > 1
                ? 'Delete Files'
                : 'Delete File'
          }
          variant="danger"
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmPendingDelete}
        />
      ) : null}
      {shellContext.isSettingsOpen ? (
        <WorkbenchSettingsModal
          title="Settings"
          titleSuffix={<Badge>user</Badge>}
          categories={[
            { id: 'appearance', label: 'Appearance' },
            { id: 'workbench', label: 'Workbench' },
            { id: 'workspace', label: 'Workspace' },
            { id: 'maintenance', label: 'Maintenance' },
          ]}
          footer={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setCompactRows(true);
                  shellContext.setTheme('dark');
                  setSearchQuery('button');
                  shellContext.setSettingsCategoryId('appearance');
                  shellContext.setSettingsScopeId('user');
                  setSettingsSearchValue('');
                  setLastCommandLabel('Settings reset');
                }}
              >
                Reset
              </Button>
              <span className="workbench-settings-footer__spacer" />
              <Button onClick={shellContext.closeSettings}>Cancel</Button>
              <Button variant="primary" onClick={shellContext.closeSettings}>
                Apply
              </Button>
            </>
          }
          scopes={[
            { id: 'user', label: 'User' },
            {
              id: 'workspace',
              label: 'Workspace',
              title: 'Workspace-scoped settings are represented with mock data in this story.',
            },
          ]}
          defaultActiveCategoryId="appearance"
          defaultActiveScopeId="user"
          searchValue={settingsSearchValue}
          onActiveCategoryIdChange={shellContext.setSettingsCategoryId}
          onClose={shellContext.closeSettings}
          onScopeChange={shellContext.setSettingsScopeId}
          onSearchValueChange={setSettingsSearchValue}
          renderCategory={(category) =>
            renderIntegratedShellSettingsCategory({
              categoryId: category.id,
              colorTheme: shellContext.theme,
              compactRows,
              fileCount: files.length,
              searchQuery,
              searchResultCount: filteredSearchResults.length,
              settingsSearchValue,
              sideBarSizePercent: shellContext.primarySidebarSizePercent,
              onClearSearch: () => {
                setSearchQuery('');
                setLastCommandLabel('Search cleared from settings');
              },
              onColorThemeChange: shellContext.setTheme,
              onCompactRowsChange: setCompactRows,
              onSearchQueryChange: setSearchQuery,
              onSettingsSearchValueChange: setSettingsSearchValue,
              onSideBarSizePercentChange: shellContext.setPrimarySidebarSizePercent,
            })
          }
        />
      ) : null}
    </>
  );

  return (
    <WorkbenchStandaloneShell<IntegratedShellActivityId, WorkspaceEditorTheme>
      bootstrap={bootstrap}
      compactStatus
      getStatusSections={(shellContext) =>
        getIntegratedStatusSections({
          colorTheme: shellContext.theme,
          isPrimarySideBarVisible: shellContext.isPrimarySidebarVisible,
          lastCommandLabel,
          runtimeStatus,
        })
      }
      minPrimarySidebarSizePercent={16}
      maxPrimarySidebarSizePercent={40}
      onActivityActivate={({ nextActivityId }, shellContext) => {
        const hidSidebar =
          nextActivityId === shellContext.activityId && shellContext.isPrimarySidebarVisible;
        setLastCommandLabel(
          hidSidebar
            ? 'Primary sidebar hidden'
            : `${integratedShellActivities[nextActivityId].label} opened`,
        );
      }}
      onActivityBarContextMenu={(event, shellContext) =>
        openContextMenu(event, createWorkbenchMenuItems(shellContext), 'Activity bar menu')
      }
      onStatusItemActivate={(item, shellContext) => {
        if (item.id === 'theme') {
          shellContext.setTheme(shellContext.theme === 'dark' ? 'light' : 'dark');
          return;
        }

        if (item.id === 'primary-sidebar') {
          shellContext.togglePrimarySidebar();
          setLastCommandLabel('Primary sidebar toggled');
        }
      }}
      primarySidebarClassName="ui-workbench-story-shell-split"
      rootClassName="ide-root"
      rootStyle={{ height: '100%', minHeight: 0 }}
      renderPrimarySidebar={renderPrimarySidebar}
      renderSecondaryArea={(shellContext) => (
        <main className="workbench-editor-area">
          <WorkspaceEditorPanel
            files={files}
            openPaths={openPaths}
            renderEditor={(context) =>
              widgetStudioEditorRenderer({ ...context, workspaceFiles: files })
            }
            selectedPath={selectedPath}
            theme={shellContext.theme}
            onCloseAll={closeAll}
            onCloseOthers={closeOthers}
            onClosePath={closePath}
            onCopyPath={(path) => setLastCommandLabel(`Copied ${path}`)}
            onDeletePath={deleteFile}
            onSaveFile={saveFile}
            onSelectedPathChange={activateFile}
          />
        </main>
      )}
      renderOverlays={renderOverlays}
    />
  );
}
