import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import {
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
  type CommandMenuEntry,
} from '@newchobo-ui/core';
import {
  createChatTransportFromRuntime,
  createWorkspaceFileRepository,
} from '@newchobo-ui/adapters';
import {
  createMockWorkbenchRuntime,
  type RuntimeChatMessage,
  type RuntimeStatus,
} from '@newchobo-ui/runtime';
import {
  isSaveFailure,
  type ChatStreamEvent,
  isSaveSuccess,
  type SaveFailure,
  type WorkspacePatchEvent,
} from '@newchobo-ui/contracts';
import {
  WorkbenchChatService,
  WorkspacePatchService,
  WorkspaceSaveService,
} from '@newchobo-ui/services';
import { SideBarHeaderControl, SideBarViewFrame } from '../layout/SideBarViewFrame';
import { ConfirmDialog } from '../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../overlay/ContextMenu';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { EmptyState } from '../primitives/EmptyState';
import { Field } from '../primitives/Field';
import { IconButton } from '../primitives/IconButton';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import { ActivityBar } from './ActivityBar';
import { ChatPanel, type ChatMessage } from './chat';
import {
  commandMenuItemsToContextMenuItems,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceCreateMenuEntries,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  type WorkbenchShellCommandContext,
  type WorkbenchWorkspaceCommandContext,
} from './commands';
import { WorkbenchSettingsModal, WorkbenchSettingsSection } from './settings';
import { WorkbenchShell } from './WorkbenchShell';
import { useWorkbenchShellState } from './shellState';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';
import {
  WorkspaceEditorPanel,
  type WorkspaceEditorTheme,
  WorkspaceExplorer,
  WorkspaceSearchPanel,
  fileNameOfPath,
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  pruneWorkspaceSelection,
  useVirtualWorkspace,
  type WorkspaceFile,
  type WorkspaceExplorerInlineEditCommitMeta,
  type WorkspaceExplorerInlineEditKind,
  type WorkspaceExplorerInlineEditState,
  type WorkspaceExplorerItemKeyboardActionMeta,
  type WorkspaceExplorerMoveRequestMeta,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from './workspace';

const meta = {
  title: 'React/Workbench',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type StoryActivityId = 'explorer' | 'search' | 'chat';
type StoryTheme = WorkspaceEditorTheme;

interface StoryActivity {
  icon: ReactNode;
  id: StoryActivityId;
  label: string;
}

interface StoryContextMenuState {
  ariaLabel: string;
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface StoryPendingDelete {
  paths: string[];
  type: 'files' | 'folder';
}

interface StoryCommandContext
  extends WorkbenchShellCommandContext<StoryActivityId>, WorkbenchWorkspaceCommandContext {}

const storyActivityOrder: StoryActivityId[] = ['explorer', 'search', 'chat'];

const storyActivities: Record<StoryActivityId, StoryActivity> = {
  explorer: {
    id: 'explorer',
    label: 'Explorer',
    icon: <i className="codicon codicon-files" />,
  },
  search: {
    id: 'search',
    label: 'Search',
    icon: <i className="codicon codicon-search" />,
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    icon: <i className="codicon codicon-comment-discussion" />,
  },
};

const storyShellCommandActivities = storyActivityOrder.map((id) => ({
  id,
  label: storyActivities[id].label,
  icon:
    id === 'explorer'
      ? 'codicon-files'
      : id === 'search'
        ? 'codicon-search'
        : 'codicon-comment-discussion',
}));

const storyCommandRegistry = createCommandRegistry<StoryCommandContext>([
  ...createWorkbenchShellCommands({ activities: storyShellCommandActivities }),
  ...createWorkbenchWorkspaceCommands(),
]);

const workbenchMenuEntries: CommandMenuEntry<StoryCommandContext>[] =
  createWorkbenchShellMenuEntries({ activities: storyShellCommandActivities });

const workspaceCreateMenuEntries = createWorkbenchWorkspaceCreateMenuEntries<StoryCommandContext>();
const workspaceTargetMenuEntries = createWorkbenchWorkspaceTargetMenuEntries<StoryCommandContext>();
const workspaceFolderMenuEntries = createWorkbenchWorkspaceFolderMenuEntries<StoryCommandContext>();

const defaultSelectionByActivity: Record<StoryActivityId, string> = {
  explorer: 'src/App.tsx',
  search: 'src/components/Button.tsx',
  chat: 'src/App.tsx',
};

const workspaceFolders = ['src', 'src/components', 'src/workbench', 'docs', 'public'];

const workspaceFiles: WorkspaceFile[] = [
  {
    path: 'src/App.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:12:00.000Z',
    source: 'user',
    content: `import { WorkbenchShell } from './workbench/Shell';

export function App() {
  return <WorkbenchShell title="Public UI Workbench" />;
}
`,
  },
  {
    path: 'src/components/Button.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:18:00.000Z',
    source: 'assistant',
    content: `import type { ComponentPropsWithRef } from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'default', ...props }: ButtonProps) {
  return <button data-variant={variant} {...props} />;
}
`,
  },
  {
    path: 'src/components/Panel.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:20:00.000Z',
    source: 'assistant',
    content: `import type { ComponentPropsWithRef, ReactNode } from 'react';

interface PanelProps extends ComponentPropsWithRef<'section'> {
  title: ReactNode;
}

export function Panel({ children, title, ...props }: PanelProps) {
  return (
    <section {...props}>
      <header>{title}</header>
      <div>{children}</div>
    </section>
  );
}
`,
  },
  {
    path: 'src/workbench/Shell.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:30:00.000Z',
    source: 'assistant',
    content: `import { ActivityBar, StatusBar } from '@newchobo-ui/react/workbench';

export function WorkbenchShell({ title }: { title: string }) {
  return (
    <main aria-label={title}>
      <ActivityBar items={[]} />
      <section data-region="editor">
        <h1>{title}</h1>
      </section>
      <StatusBar compact />
    </main>
  );
}
`,
  },
  {
    path: 'src/workbench/search.ts',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:34:00.000Z',
    source: 'assistant',
    content: `export function compactText(value: string) {
  return value.replace(/\\s+/g, ' ').trim();
}

export function createContentPreview(content: string, query: string) {
  const compact = compactText(content);
  const index = compact.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return compact.slice(0, 120);

  const start = Math.max(0, index - 48);
  const end = Math.min(compact.length, index + query.length + 72);
  return \`\${start > 0 ? '...' : ''}\${compact.slice(start, end)}\${end < compact.length ? '...' : ''}\`;
}
`,
  },
  {
    path: 'docs/getting-started.md',
    mimeType: 'text/markdown',
    updatedAt: '2026-06-02T09:42:00.000Z',
    source: 'user',
    content: `# Getting Started

Import shared styles once, then compose the workbench primitives in your app shell.

- Use Explorer for file navigation.
- Use Search for path and content matches.
- Use Chat for workspace-side conversations.
`,
  },
  {
    path: 'package.json',
    mimeType: 'application/json',
    updatedAt: '2026-06-02T09:50:00.000Z',
    source: 'user',
    content: `{
  "name": "@example/workbench-app",
  "private": true,
  "scripts": {
    "storybook": "storybook dev --port 6010"
  }
}
`,
  },
  {
    path: 'public/theme.css',
    mimeType: 'text/css',
    updatedAt: '2026-06-02T09:54:00.000Z',
    source: 'assistant',
    content: `:root {
  color-scheme: dark;
  --workspace-accent: #4aa8ff;
}

.workspace-file-icon {
  color: var(--workspace-accent);
}
`,
  },
];

const initialRuntimeMessages: RuntimeChatMessage[] = [
  {
    id: 'm1',
    source: 'user',
    content:
      'Check whether the workbench shell covers explorer, search, chat, settings, and status surfaces.',
  },
  {
    id: 'm2',
    source: 'assistant',
    content:
      'The integrated story now keeps those surfaces in one stateful shell with public mock data.',
  },
  {
    id: 'm3',
    source: 'assistant',
    content:
      'Search results, file icons, and the editor preview are driven by the same virtual workspace.',
  },
];

function runtimeMessagesToChatMessages(messages: RuntimeChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    content: message.content,
    id: message.id,
    label: message.label,
    source: message.source,
  }));
}

function runtimeStatusLabel(status: RuntimeStatus) {
  if (status === 'running') return 'Runtime running';
  if (status === 'cancelled') return 'Runtime stopped';
  if (status === 'error') return 'Runtime error';
  return 'Runtime idle';
}

function getStatusFooterSections(): StatusBarSectionModel[] {
  return [
    {
      id: 'main',
      items: [{ id: 'status', icon: <span className="workbench-status-dot" />, label: 'Idle' }],
    },
    {
      align: 'end',
      id: 'actions',
      items: [
        { id: 'theme', icon: <i className="codicon codicon-color-mode" />, label: 'Dark' },
        {
          id: 'sidebar',
          icon: <i className="codicon codicon-layout-sidebar-left" />,
          label: 'Hide sidebar',
        },
      ],
    },
  ];
}

function getIntegratedStatusSections({
  colorTheme,
  isPrimarySideBarVisible,
  lastCommandLabel,
  runtimeStatus,
}: {
  colorTheme: StoryTheme;
  isPrimarySideBarVisible: boolean;
  lastCommandLabel: string;
  runtimeStatus: RuntimeStatus;
}): StatusBarSectionModel[] {
  return [
    {
      id: 'main',
      items: [
        {
          id: 'last-command',
          icon: <span className="workbench-status-dot" />,
          label: lastCommandLabel,
        },
      ],
    },
    {
      align: 'end',
      id: 'actions',
      items: [
        {
          id: 'runtime-status',
          icon: <i className="codicon codicon-debug-start" />,
          label: runtimeStatusLabel(runtimeStatus),
        },
        {
          id: 'theme',
          icon: <i className="codicon codicon-color-mode" />,
          label: colorTheme === 'dark' ? 'Dark' : 'Light',
        },
        {
          id: 'primary-sidebar',
          icon: <i className="codicon codicon-layout-sidebar-left" />,
          label: isPrimarySideBarVisible ? 'Hide sidebar' : 'Show sidebar',
        },
      ],
    },
  ];
}

function isStoryActivityId(id: string): id is StoryActivityId {
  return id === 'explorer' || id === 'search' || id === 'chat';
}

function getActivityItems(activeActivityId = 'explorer') {
  return storyActivityOrder.map((id) => ({
    id,
    label: storyActivities[id].label,
    icon: storyActivities[id].icon,
    active: id === activeActivityId,
  }));
}

export const ActivityRail: Story = {
  render: () => (
    <div style={{ height: 360, background: 'var(--color-bg)' }}>
      <ActivityBar
        items={getActivityItems()}
        secondaryItems={[
          {
            id: 'settings',
            label: 'Settings',
            icon: <i className="codicon codicon-settings-gear" />,
          },
        ]}
      />
    </div>
  ),
};

export const StatusFooter: Story = {
  render: () => (
    <div style={{ width: '100%', background: 'var(--color-bg)', paddingTop: 80 }}>
      <StatusBar compact sections={getStatusFooterSections()} />
    </div>
  ),
};

export const SettingsDialog: Story = {
  render: () => <SettingsDialogPreview />,
};

export const IntegratedShell: Story = {
  tags: ['storybook-play-baseline'],
  render: () => <IntegratedWorkbenchShell />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const statusBar = canvas.getByLabelText('Status bar');

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'Explorer' }));
    await expect(await canvas.findByRole('menu', { name: 'Activity bar menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Search' }));
    await expect(await canvas.findByRole('textbox', { name: 'Search workspace' })).toBeVisible();
    await expect(statusBar).toHaveTextContent('Search opened');

    await fireEvent.contextMenu(
      await canvas.findByRole('button', { name: /src\/components\/.*Button.*\.tsx/ }),
    );
    await expect(await canvas.findByRole('menu', { name: 'Search result menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(statusBar).toHaveTextContent('Copied src/components/Button.tsx');

    await userEvent.click(canvas.getByRole('button', { name: 'Explorer' }));
    await expect(await canvas.findByRole('textbox', { name: 'Filter Explorer' })).toBeVisible();
    await fireEvent.contextMenu(canvas.getByRole('tab', { name: /App\.tsx/ }));
    await expect(await canvas.findByRole('menu', { name: 'Editor tab menu' })).toBeVisible();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(statusBar).toHaveTextContent('Copied src/App.tsx');

    await fireEvent.contextMenu(canvas.getByLabelText('Primary sidebar'));
    await expect(await canvas.findByRole('menu', { name: 'Primary sidebar menu' })).toBeVisible();
    await expect(await canvas.findByRole('menuitem', { name: 'New file' })).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(canvas.getByRole('button', { name: 'Chat' }));
    const chatComposer = await canvas.findByPlaceholderText('Ask about this workspace');
    await expect(chatComposer).toBeVisible();
    await userEvent.type(chatComposer, 'Create runtime notes');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      expect(statusBar).toHaveTextContent('Runtime wrote docs/runtime-notes.md');
    });
    await waitFor(() => expect(statusBar).toHaveTextContent('Runtime idle'));
  },
};

function SettingsDialogPreview() {
  const [activeCategoryId, setActiveCategoryId] = useState('appearance');
  const [activeScopeId, setActiveScopeId] = useState('user');
  const [compactRows, setCompactRows] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [theme, setTheme] = useState<StoryTheme>('dark');

  return (
    <div data-theme={theme} style={{ minHeight: 640, background: 'var(--color-bg)' }}>
      <div style={{ padding: 20 }}>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open settings
        </Button>
      </div>
      {isOpen ? (
        <WorkbenchSettingsModal
          activeCategoryId={activeCategoryId}
          activeScopeId={activeScopeId}
          categories={[
            { id: 'appearance', label: 'Appearance' },
            { id: 'workbench', label: 'Workbench' },
            { id: 'workspace', label: 'Workspace' },
          ]}
          footer={
            <>
              <Button onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </>
          }
          scopes={[
            { id: 'user', label: 'User' },
            { id: 'workspace', label: 'Workspace' },
          ]}
          searchValue={searchValue}
          title="Settings"
          titleSuffix={<Badge>Preview</Badge>}
          onActiveCategoryIdChange={setActiveCategoryId}
          onClose={() => setIsOpen(false)}
          onScopeChange={setActiveScopeId}
          onSearchValueChange={setSearchValue}
          renderCategory={(category) => {
            if (category.id === 'workbench') {
              return (
                <WorkbenchSettingsSection
                  id="settings-preview-workbench"
                  title="Workbench"
                  description="Configure shell density and visible workbench surfaces."
                >
                  <Field label="Workbench density" description="Controls compact shell surfaces.">
                    <Select
                      controlWidth="full"
                      value={compactRows ? 'compact' : 'comfortable'}
                      onChange={(event) => setCompactRows(event.currentTarget.value === 'compact')}
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                    </Select>
                  </Field>
                  <Field inline label="Compact rows">
                    <Checkbox
                      checked={compactRows}
                      label="Use compact explorer, search, and chat rows"
                      onChange={(event) => setCompactRows(event.currentTarget.checked)}
                    />
                  </Field>
                </WorkbenchSettingsSection>
              );
            }

            if (category.id === 'workspace') {
              return (
                <WorkbenchSettingsSection
                  id="settings-preview-workspace"
                  title="Workspace"
                  description="Preview settings that can be scoped to a user or workspace."
                >
                  <Field label="Default search query">
                    <TextInput
                      controlWidth="full"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.currentTarget.value)}
                    />
                  </Field>
                  <Field label="Active scope">
                    <div className="workbench-settings-badge-list">
                      <Badge>{activeScopeId}</Badge>
                      <Badge variant="muted">public mock data</Badge>
                    </div>
                  </Field>
                </WorkbenchSettingsSection>
              );
            }

            return (
              <WorkbenchSettingsSection
                id="settings-preview-appearance"
                title="Appearance"
                description="Choose visual preferences for the workbench shell."
              >
                <Field label="Color theme" htmlFor="settings-preview-theme">
                  <Select
                    id="settings-preview-theme"
                    controlWidth="full"
                    value={theme}
                    onChange={(event) => setTheme(event.currentTarget.value as StoryTheme)}
                  >
                    <option value="dark">Dark Modern</option>
                    <option value="light">Light Modern</option>
                  </Select>
                </Field>
              </WorkbenchSettingsSection>
            );
          }}
        />
      ) : null}
    </div>
  );
}

function IntegratedWorkbenchShell() {
  const [chatDraft, setChatDraft] = useState('');
  const chatRuntime = useMemo(
    () =>
      createMockWorkbenchRuntime({
        initialMessages: initialRuntimeMessages,
        response: (message) => ({
          chunks: [
            'Mock runtime received the workspace request. ',
            'A workspace patch is ready in `docs/runtime-notes.md`.',
          ],
          intervalMs: 20,
          workspacePatches: [
            {
              content: `# Runtime Notes\n\nLast request: ${message.content}\n\nThis file was produced by the public mock runtime fixture.\n`,
              mimeType: 'text/markdown',
              path: 'docs/runtime-notes.md',
              source: 'assistant',
              type: 'write-file',
              updatedAt: '2026-06-02T10:05:00.000Z',
            },
          ],
        }),
      }),
    [],
  );
  const [runtimeMessages, setRuntimeMessages] = useState<ChatMessage[]>(() =>
    runtimeMessagesToChatMessages(chatRuntime.getMessages()),
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(() => chatRuntime.getStatus());
  const [compactRows, setCompactRows] = useState(true);
  const [contextMenu, setContextMenu] = useState<StoryContextMenuState | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [explorerSelection, setExplorerSelection] = useState<WorkspaceSelectionState>({
    anchorPath: defaultSelectionByActivity.explorer,
    paths: [defaultSelectionByActivity.explorer],
  });
  const [explorerInlineEdit, setExplorerInlineEdit] = useState<
    WorkspaceExplorerInlineEditState | undefined
  >();
  const [lastCommandLabel, setLastCommandLabel] = useState('Idle');
  const [pendingDelete, setPendingDelete] = useState<StoryPendingDelete | null>(null);
  const shell = useWorkbenchShellState<StoryActivityId, StoryTheme>({
    activeActivityId: 'explorer',
    primarySidebarSizePercent: 24,
    settingsCategoryId: 'appearance',
    settingsScopeId: 'user',
    theme: 'dark',
  });
  const {
    activeActivityId,
    isPrimarySidebarVisible: isPrimarySideBarVisible,
    isSettingsOpen: settingsOpen,
    primarySidebarSizePercent: sideBarSizePercent,
    settingsCategoryId,
    settingsScopeId,
    settingsSearchValue,
    theme: colorTheme,
  } = shell.state;
  const workspace = useVirtualWorkspace({
    expandedPaths: ['src', 'src/components'],
    files: workspaceFiles,
    folders: workspaceFolders,
    openPaths: ['src/App.tsx', 'src/components/Button.tsx', 'src/workbench/Shell.tsx'],
    searchQuery: 'button',
    selectedPath: defaultSelectionByActivity.explorer,
  });
  const {
    closeAll: closeAllFiles,
    closeOthers: closeOtherFiles,
    closePath: closeWorkspacePath,
    createFile: createWorkspaceFile,
    createFolder: createWorkspaceFolder,
    deleteFile: deleteWorkspaceFile,
    deleteFolder: deleteWorkspaceFolder,
    expandedPaths,
    files,
    folders,
    moveFile: moveWorkspaceFile,
    openFile,
    openPaths,
    renameFile: renameWorkspaceFile,
    renameFolder: renameWorkspaceFolder,
    saveFile: saveWorkspaceFile,
    searchQuery,
    searchResults: filteredSearchResults,
    selectedPath,
    setSearchQuery,
    toggleFolder,
    workspaceTree,
  } = workspace;
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
  const workspaceSaveService = useMemo(
    () => new WorkspaceSaveService({ repository: workspaceRepository }),
    [workspaceRepository],
  );
  const workspacePatchService = useMemo(
    () => new WorkspacePatchService({ repository: workspaceRepository }),
    [workspaceRepository],
  );
  const chatRuntimeTransport = useMemo(
    () => createChatTransportFromRuntime({ runtime: chatRuntime }),
    [chatRuntime],
  );
  const chatService = useMemo(
    () =>
      new WorkbenchChatService({
        onPatch: (patch: WorkspacePatchEvent) => {
          void workspacePatchService.applyPatch(patch).then((result) => {
            if (result.type === 'patch:failed') {
              setLastCommandLabel(
                `Runtime patch failed: ${result.message ?? `Error ${result.code}`}`,
              );
              return;
            }

            if (result.patch.type === 'delete-file') {
              setLastCommandLabel(`Runtime deleted ${result.patch.path}`);
              return;
            }

            // Workspace updates come from repository callbacks that may be
            // processed in a later React update cycle than the patch callback.
            setTimeout(() => {
              openFileRef.current(result.patch.path);
            }, 0);
            setLastCommandLabel(`Runtime wrote ${result.patch.path}`);
          });
        },
        transport: chatRuntimeTransport,
      }),
    [chatRuntimeTransport, workspacePatchService],
  );
  const updateRuntimeMessage = (message: ChatMessage) => {
    setRuntimeMessages((currentMessages) => {
      const index = currentMessages.findIndex((entry) => entry.id === message.id);
      if (index < 0) return [...currentMessages, message];

      const nextMessages = [...currentMessages];
      nextMessages[index] = message;
      return nextMessages;
    });
  };
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
      chatService.dispose();
    };
  }, [chatService, updateRuntimeMessage]);
  useEffect(
    () => () => {
      chatRuntime.dispose();
    },
    [chatRuntime],
  );
  const activeActivity = storyActivities[activeActivityId];
  const statusSections = getIntegratedStatusSections({
    colorTheme,
    isPrimarySideBarVisible,
    lastCommandLabel,
    runtimeStatus,
  });
  const openContextMenu = (
    event: MouseEvent<HTMLElement>,
    items: ContextMenuItem[],
    ariaLabel: string,
  ) => {
    event.preventDefault();
    setContextMenu({ ariaLabel, items, x: event.clientX, y: event.clientY });
  };

  const showActivity = (activityId: StoryActivityId) => {
    shell.showActivity(activityId);
    setLastCommandLabel(`${storyActivities[activityId].label} opened`);
  };

  const activateActivityFromBar = (activityId: StoryActivityId) => {
    if (activityId === activeActivityId && isPrimarySideBarVisible) {
      shell.setPrimarySidebarVisible(false);
      setLastCommandLabel('Primary sidebar hidden');
      return;
    }

    showActivity(activityId);
  };

  const activateFile = (path: string) => {
    openFile(path);
    setLastCommandLabel(`Opened ${path}`);
  };

  const activateSearchResult = (result: (typeof filteredSearchResults)[number]) => {
    activateFile(result.path);
  };

  const activateStatusItem = (item: StatusBarItemModel) => {
    if (item.id === 'theme') {
      shell.setTheme(colorTheme === 'dark' ? 'light' : 'dark');
      return;
    }

    if (item.id === 'primary-sidebar') {
      shell.togglePrimarySidebar();
      setLastCommandLabel('Primary sidebar toggled');
    }
  };

  const closePath = (path: string) => {
    closeWorkspacePath(path);
    setLastCommandLabel(`Closed ${path}`);
  };

  const closeOthers = (path: string) => {
    closeOtherFiles(path);
    setLastCommandLabel(`Closed other files`);
  };

  const closeAll = () => {
    closeAllFiles();
    setLastCommandLabel('Closed all files');
  };

  const saveFile = (path: string, content: string, previousUpdatedAt?: string) => {
    return Promise.resolve(
      workspaceSaveService.saveDraft({
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

  const deleteFiles = (paths: string[]) => {
    const pendingPathSet = new Set(paths);
    const filePaths = files
      .filter((file) => pendingPathSet.has(file.path))
      .map((file) => file.path);
    if (filePaths.length === 0) return;

    filePaths.forEach(deleteWorkspaceFile);
    setExplorerSelection((selection) =>
      pruneWorkspaceSelection(
        selection,
        files.filter((file) => !pendingPathSet.has(file.path)).map((file) => file.path),
      ),
    );
    setLastCommandLabel(
      filePaths.length === 1 ? `Deleted ${filePaths[0]}` : `Deleted ${filePaths.length} files`,
    );
  };

  const deleteFolder = (path: string) => {
    if (!path) return;

    const folderPrefix = `${path}/`;
    const deletedFilePaths = new Set(
      files
        .filter((file) => file.path === path || file.path.startsWith(folderPrefix))
        .map((file) => file.path),
    );

    deleteWorkspaceFolder(path);
    setExplorerSelection((selection) =>
      pruneWorkspaceSelection(
        selection,
        files.filter((file) => !deletedFilePaths.has(file.path)).map((file) => file.path),
      ),
    );
    setLastCommandLabel(`Deleted folder ${path}`);
  };

  const deleteFile = (path: string) => {
    deleteFiles([path]);
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'folder') {
      deleteFolder(pendingDelete.paths[0] ?? '');
    } else {
      deleteFiles(pendingDelete.paths);
    }

    setPendingDelete(null);
  };

  const setExplorerInlineEditError = (edit: WorkspaceExplorerInlineEditState, error: string) => {
    setExplorerInlineEdit({ ...edit, error });
    setLastCommandLabel(error);
  };

  const startWorkspaceCreate = (
    kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
    parentPath = '',
  ) => {
    const value = getAvailableWorkspaceEntryName({
      files,
      folders,
      parentPath,
      preferredName: kind === 'create-file' ? 'untitled.md' : 'new-folder',
    });

    if (parentPath && !expandedPaths.has(parentPath)) {
      toggleFolder(parentPath);
    }

    setExplorerInlineEdit({
      id: `${kind}:${parentPath}:${value}`,
      kind,
      parentPath,
      value,
    });
    setLastCommandLabel(kind === 'create-file' ? 'New file queued' : 'New folder queued');
  };

  const requestWorkspaceRename = (node: WorkspaceTreeNode, actionPaths: string[] = [node.path]) => {
    const targetPath = actionPaths[0] ?? node.path;
    setExplorerInlineEdit({
      id: `rename:${targetPath}`,
      kind: node.type === 'folder' ? 'rename-folder' : 'rename-file',
      path: targetPath,
      value: fileNameOfPath(targetPath),
    });
    setLastCommandLabel(`Rename queued for ${targetPath}`);
  };

  const handleExplorerInlineEditValueChange = (
    value: string,
    edit: WorkspaceExplorerInlineEditState,
  ) => {
    setExplorerInlineEdit({ ...edit, error: undefined, value });
  };

  const handleExplorerInlineEditCommit = ({
    edit,
    value,
  }: WorkspaceExplorerInlineEditCommitMeta) => {
    const name = value.trim();
    if (!isSimpleWorkspaceName(name)) {
      setExplorerInlineEditError(edit, 'Use a simple file or folder name.');
      return;
    }

    if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
      const parentPath = edit.parentPath ?? '';
      const path = joinWorkspacePath(parentPath, name);
      if (!isWorkspaceEntryPathAvailable({ files, folders, path })) {
        setExplorerInlineEditError(edit, `${name} already exists.`);
        return;
      }

      if (edit.kind === 'create-file') {
        createWorkspaceFile({ content: '', path, source: 'user' });
        setExplorerSelection({ anchorPath: path, paths: [path] });
        setLastCommandLabel(`Created ${path}`);
      } else {
        createWorkspaceFolder(path);
        setLastCommandLabel(`Created folder ${path}`);
      }

      setExplorerInlineEdit(undefined);
      return;
    }

    const sourcePath = edit.path ?? '';
    const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
    if (
      !sourcePath ||
      !destinationPath ||
      !isWorkspaceEntryPathAvailable({
        excludedPaths: [sourcePath],
        files,
        folders,
        path: destinationPath,
      })
    ) {
      setExplorerInlineEditError(edit, `${name} already exists.`);
      return;
    }

    if (sourcePath === destinationPath) {
      setExplorerInlineEdit(undefined);
      return;
    }

    if (edit.kind === 'rename-file') {
      renameWorkspaceFile(sourcePath, name);
      setExplorerSelection((selection) => ({
        anchorPath: selection.anchorPath === sourcePath ? destinationPath : selection.anchorPath,
        paths: selection.paths.map((path) => (path === sourcePath ? destinationPath : path)),
      }));
      setLastCommandLabel(`Renamed ${sourcePath} to ${destinationPath}`);
      setExplorerInlineEdit(undefined);
      return;
    }

    const renameDescendantPath = (currentPath: string) =>
      currentPath === sourcePath
        ? destinationPath
        : currentPath.startsWith(`${sourcePath}/`)
          ? `${destinationPath}/${currentPath.slice(sourcePath.length + 1)}`
          : currentPath;

    renameWorkspaceFolder(sourcePath, name);
    setExplorerSelection((selection) => ({
      anchorPath: selection.anchorPath
        ? renameDescendantPath(selection.anchorPath)
        : selection.anchorPath,
      paths: selection.paths.map(renameDescendantPath),
    }));
    setLastCommandLabel(`Renamed folder ${sourcePath} to ${destinationPath}`);
    setExplorerInlineEdit(undefined);
  };

  const requestWorkspaceDelete = (node: WorkspaceTreeNode, actionPaths: string[] = [node.path]) => {
    const targetPaths = actionPaths.length > 0 ? actionPaths : [node.path];
    if (node.type === 'folder') {
      setPendingDelete({ paths: [node.path], type: 'folder' });
      return;
    }

    const filePathSet = new Set(files.map((file) => file.path));
    const fileActionPaths = targetPaths.filter((path) => filePathSet.has(path));
    if (fileActionPaths.length === 0) return;

    setPendingDelete({ paths: fileActionPaths, type: 'files' });
  };

  const handleExplorerRequestDelete = (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
    requestWorkspaceDelete(meta.node, meta.actionPaths);
  };

  const handleExplorerRequestRename = (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
    requestWorkspaceRename(meta.node, meta.actionPaths);
  };

  const handleExplorerRequestMove = (meta: WorkspaceExplorerMoveRequestMeta) => {
    const plan = getWorkspaceFileMovePlan({
      files,
      folders,
      sourcePaths: meta.sourcePaths,
      targetFolderPath: meta.targetFolderPath,
    });

    plan.moves.forEach((move) => {
      moveWorkspaceFile(move.sourcePath, plan.targetFolderPath);
    });

    if (plan.moves.length > 0) {
      setExplorerSelection({
        anchorPath: plan.moves[plan.moves.length - 1]?.destinationPath,
        paths: plan.moves.map((move) => move.destinationPath),
      });
    }

    const targetLabel = plan.targetFolderPath || 'workspace root';
    if (plan.moves.length === 0) {
      setLastCommandLabel(`Move blocked for ${plan.blockedPaths.length} files`);
      return;
    }

    setLastCommandLabel(
      plan.blockedPaths.length > 0
        ? `Moved ${plan.moves.length} files to ${targetLabel}, blocked ${plan.blockedPaths.length}`
        : `Moved ${plan.moves.length} files to ${targetLabel}`,
    );
  };

  const createCommandContext = (
    overrides: Partial<StoryCommandContext> = {},
  ): StoryCommandContext => ({
    createWorkspaceFile: () => startWorkspaceCreate('create-file'),
    createWorkspaceFolder: () => startWorkspaceCreate('create-folder'),
    deleteWorkspaceTarget: () => undefined,
    fileActionPaths: [],
    isPrimarySidebarVisible: isPrimarySideBarVisible,
    multiFileAction: false,
    openSettings: shell.openSettings,
    openWorkspaceTarget: () => undefined,
    renameWorkspaceTarget: () => undefined,
    copyWorkspaceTarget: () => undefined,
    showActivity,
    targetPaths: [],
    togglePrimarySidebar: () => {
      shell.togglePrimarySidebar();
      setLastCommandLabel('Primary sidebar toggled');
    },
    workspaceTargetKind: 'file',
    ...overrides,
  });

  const createCommandMenuItems = (
    entries: CommandMenuEntry<StoryCommandContext>[],
    context: StoryCommandContext,
    surface?: string,
  ): ContextMenuItem[] =>
    commandMenuItemsToContextMenuItems(
      resolveCommandMenuItems({
        context,
        entries,
        surface,
        registry: storyCommandRegistry,
      }),
      (commandId) => executeCommand(storyCommandRegistry, commandId, context),
    );

  const createWorkbenchMenuItems = (): ContextMenuItem[] =>
    createCommandMenuItems(
      workbenchMenuEntries,
      createCommandContext(),
      WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
    );

  const createExplorerRootMenuItems = (): ContextMenuItem[] =>
    createCommandMenuItems(
      workspaceCreateMenuEntries,
      createCommandContext(),
      WORKBENCH_COMMAND_SURFACE_WORKSPACE,
    );

  const createWorkspaceMenuItems = (
    node: WorkspaceTreeNode,
    actionPaths: string[] = [node.path],
  ): ContextMenuItem[] => {
    const targetPaths = actionPaths.length > 0 ? actionPaths : [node.path];
    const filePathSet = new Set(files.map((file) => file.path));
    const fileActionPaths =
      node.type === 'file' ? targetPaths.filter((path) => filePathSet.has(path)) : [];
    const multiFileAction = fileActionPaths.length > 1;

    const entries =
      node.type === 'folder' ? workspaceFolderMenuEntries : workspaceTargetMenuEntries;

    return createCommandMenuItems(
      entries,
      createCommandContext({
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

  const editorArea = (
    <main className="workbench-editor-area">
      <WorkspaceEditorPanel
        files={files}
        openPaths={openPaths}
        selectedPath={selectedPath}
        theme={colorTheme}
        onCloseAll={closeAll}
        onCloseOthers={closeOthers}
        onClosePath={closePath}
        onCopyPath={(path) => setLastCommandLabel(`Copied ${path}`)}
        onDeletePath={deleteFile}
        onSaveFile={saveFile}
        onSelectedPathChange={activateFile}
      />
    </main>
  );

  return (
    <WorkbenchShell
      activityBar={{
        items: getActivityItems(activeActivityId),
        secondaryItems: [
          {
            id: 'settings',
            label: 'Settings',
            icon: <i className="codicon codicon-settings-gear" />,
            active: settingsOpen,
          },
        ],
        onContextMenu: (event) =>
          openContextMenu(event, createWorkbenchMenuItems(), 'Activity bar menu'),
        onItemActivate: (item) => {
          if (item.id === 'settings') {
            shell.openSettings();
            return;
          }

          if (isStoryActivityId(item.id)) {
            activateActivityFromBar(item.id);
          }
        },
      }}
      compactStatus
      onStatusItemActivate={activateStatusItem}
      primarySidebar={{
        className: 'ui-workbench-story-shell-split',
        isVisible: isPrimarySideBarVisible,
        maxPrimarySizePercent: 40,
        minPrimarySizePercent: 16,
        onSizePercentChange: shell.setPrimarySidebarSizePercent,
        primarySizePercent: sideBarSizePercent,
        node: (
          <aside
            aria-label="Primary sidebar"
            className="workbench-primary-side-bar"
            style={{ borderRight: '1px solid var(--color-border)' }}
            onContextMenu={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest('button, input, textarea, .ui-context-menu')) return;

              openContextMenu(
                event,
                activeActivityId === 'explorer' ? createExplorerRootMenuItems() : createWorkbenchMenuItems(),
                'Primary sidebar menu',
              );
            }}
          >
            {activeActivityId === 'chat' ? (
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
            ) : activeActivityId === 'search' ? (
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
                    createWorkspaceMenuItems({
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
                  activeActivityId === 'explorer' ? (
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
                      createWorkspaceMenuItems(node, meta.actionPaths),
                      'Workspace item menu',
                    )
                  }
                  onRequestDelete={handleExplorerRequestDelete}
                  onRequestMove={handleExplorerRequestMove}
                  onRequestRename={handleExplorerRequestRename}
                  onSelectionChange={(selection, meta) => {
                    setExplorerSelection(selection);
                    if (meta.mode !== 'single') {
                      setLastCommandLabel(`${selection.paths.length} files selected`);
                    }
                  }}
                  onToggleFolder={toggleFolder}
                />
              </SideBarViewFrame>
            )}
          </aside>
        ),
      }}
      rootClassName="ide-root"
      rootStyle={{ height: 640, minHeight: 0 }}
      secondaryArea={editorArea}
      statusSections={statusSections}
      theme={colorTheme}
      overlays={
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
          {settingsOpen ? (
            <WorkbenchSettingsModal
              activeCategoryId={settingsCategoryId}
              activeScopeId={settingsScopeId}
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
                      shell.setTheme('dark');
                      setSearchQuery('button');
                      shell.setSettingsCategoryId('appearance');
                      shell.setSettingsScopeId('user');
                      shell.setSettingsSearchValue('');
                      setLastCommandLabel('Settings reset');
                    }}
                  >
                    Reset
                  </Button>
                  <span className="workbench-settings-footer__spacer" />
                  <Button onClick={shell.closeSettings}>Cancel</Button>
                  <Button variant="primary" onClick={shell.closeSettings}>
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
              searchValue={settingsSearchValue}
              title="Settings"
              titleSuffix={<Badge>{settingsScopeId}</Badge>}
              onActiveCategoryIdChange={shell.setSettingsCategoryId}
              onClose={shell.closeSettings}
              onScopeChange={shell.setSettingsScopeId}
              onSearchValueChange={shell.setSettingsSearchValue}
              renderCategory={(category) =>
                renderSettingsCategory({
                  categoryId: category.id,
                  colorTheme,
                  compactRows,
                  fileCount: files.length,
                  searchQuery,
                  searchResultCount: filteredSearchResults.length,
                  settingsSearchValue,
                  sideBarSizePercent,
                  onClearSearch: () => {
                    setSearchQuery('');
                    setLastCommandLabel('Search cleared from settings');
                  },
                  onColorThemeChange: shell.setTheme,
                  onCompactRowsChange: setCompactRows,
                  onSearchQueryChange: setSearchQuery,
                  onSettingsSearchValueChange: shell.setSettingsSearchValue,
                  onSideBarSizePercentChange: shell.setPrimarySidebarSizePercent,
                })
              }
            />
          ) : null}
        </>
      }
    />
  );
}

function clampStoryPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(90, Math.max(10, value));
}

function renderSettingsCategory({
  categoryId,
  colorTheme,
  compactRows,
  fileCount,
  searchQuery,
  searchResultCount,
  settingsSearchValue,
  sideBarSizePercent,
  onClearSearch,
  onColorThemeChange,
  onCompactRowsChange,
  onSearchQueryChange,
  onSettingsSearchValueChange,
  onSideBarSizePercentChange,
}: {
  categoryId: string;
  colorTheme: StoryTheme;
  compactRows: boolean;
  fileCount: number;
  searchQuery: string;
  searchResultCount: number;
  settingsSearchValue: string;
  sideBarSizePercent: number;
  onClearSearch: () => void;
  onColorThemeChange: (theme: StoryTheme) => void;
  onCompactRowsChange: (compactRows: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onSettingsSearchValueChange: (query: string) => void;
  onSideBarSizePercentChange: (sizePercent: number) => void;
}) {
  if (categoryId === 'workbench') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-workbench"
        title="Workbench"
        description="Tune layout density and pane sizes for the integrated shell."
      >
        <Field label="Workbench density" description="Controls compact shell surfaces.">
          <Select
            controlWidth="full"
            value={compactRows ? 'compact' : 'comfortable'}
            onChange={(event) => onCompactRowsChange(event.currentTarget.value === 'compact')}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
          </Select>
        </Field>
        <Field inline label="Compact rows">
          <Checkbox
            checked={compactRows}
            label="Use compact explorer, search, and chat rows"
            onChange={(event) => onCompactRowsChange(event.currentTarget.checked)}
          />
        </Field>
        <Field
          label="Primary sidebar width"
          description="Sets the current sidebar split percentage."
        >
          <TextInput
            controlWidth="full"
            type="number"
            value={Math.round(sideBarSizePercent)}
            onChange={(event) =>
              onSideBarSizePercentChange(
                clampStoryPercent(event.currentTarget.valueAsNumber, sideBarSizePercent),
              )
            }
          />
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'workspace') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-workspace"
        title="Workspace"
        description="Preview workspace-facing settings without binding to a runtime or storage layer."
      >
        <Field label="Search seed" description="Updates the shared search query used by the story.">
          <TextInput
            controlWidth="full"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          />
        </Field>
        <Field label="Settings search">
          <TextInput
            controlWidth="full"
            value={settingsSearchValue}
            onChange={(event) => onSettingsSearchValueChange(event.currentTarget.value)}
          />
        </Field>
        <Field label="Workspace summary">
          <div className="workbench-settings-badge-list">
            <Badge>{fileCount} files</Badge>
            <Badge variant="muted">{searchResultCount} search results</Badge>
          </div>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'maintenance') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-maintenance"
        title="Maintenance"
        description="Keep destructive or app-specific operations injected by the host application."
      >
        <Field
          inline
          label="Search state"
          description="Clears the current public mock search query."
        >
          <Button variant="danger" onClick={onClearSearch}>
            Clear
          </Button>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  return (
    <WorkbenchSettingsSection
      id="integrated-settings-appearance"
      title="Appearance"
      description="Choose visual preferences for the workbench shell."
    >
      <Field
        description="This story stores the setting locally to demonstrate the reusable UI surface."
        htmlFor="integrated-settings-theme"
        label="Color theme"
      >
        <Select
          id="integrated-settings-theme"
          controlWidth="full"
          value={colorTheme}
          onChange={(event) => onColorThemeChange(event.currentTarget.value as StoryTheme)}
        >
          <option value="dark">Dark Modern</option>
          <option value="light">Light Modern</option>
        </Select>
      </Field>
    </WorkbenchSettingsSection>
  );
}

export const SplitWorkspace: Story = {
  render: () => (
    <div style={{ width: '100%', height: 420, background: 'var(--color-bg)' }}>
      <SplitView
        defaultPrimarySizePercent={62}
        primary={
          <section style={{ padding: 20, color: 'var(--color-text)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Primary pane</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)' }}>
              SplitView keeps resizable workbench panes stable.
            </p>
            <Badge>active</Badge>
          </section>
        }
        secondary={
          <section style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <EmptyState compact icon="codicon-layout-sidebar-right">
              Secondary pane
            </EmptyState>
          </section>
        }
      />
    </div>
  ),
};
