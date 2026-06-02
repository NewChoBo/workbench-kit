import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SideBarHeaderControl, SideBarViewFrame } from '../layout/SideBarViewFrame';
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
import { WorkbenchSettingsModal, WorkbenchSettingsSection } from './settings';
import { SplitView } from './SplitView';
import { StatusBar, StatusBarItem, StatusBarSection } from './StatusBar';
import {
  WorkspaceEditorPanel,
  type WorkspaceEditorTheme,
  WorkspaceExplorer,
  WorkspaceSearchResults,
  buildWorkspaceTree,
  fileNameOfPath,
  searchWorkspaceFiles,
  type WorkspaceFile,
  type WorkspaceSearchResult,
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

const chatMessages: ChatMessage[] = [
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

function getActiveFile(activeItemId: string, files: WorkspaceFile[]) {
  return (
    files.find((file) => file.path === activeItemId) ??
    files.find((file) => file.path === defaultSelectionByActivity.explorer) ??
    files[0]
  );
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
      <StatusBar compact>
        <StatusBarSection>
          <StatusBarItem icon={<span className="workbench-status-dot" />}>Idle</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem icon={<i className="codicon codicon-color-mode" />}>Dark</StatusBarItem>
          <StatusBarItem icon={<i className="codicon codicon-layout-sidebar-left" />}>
            Hide sidebar
          </StatusBarItem>
        </StatusBarSection>
      </StatusBar>
    </div>
  ),
};

export const SettingsDialog: Story = {
  render: () => <SettingsDialogPreview />,
};

export const IntegratedShell: Story = {
  render: () => <IntegratedWorkbenchShell />,
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
  const [files, setFiles] = useState(workspaceFiles);
  const [activeActivityId, setActiveActivityId] = useState<StoryActivityId>('explorer');
  const [activeItemId, setActiveItemId] = useState(defaultSelectionByActivity.explorer);
  const [chatDraft, setChatDraft] = useState('');
  const [compactRows, setCompactRows] = useState(true);
  const [contextMenu, setContextMenu] = useState<StoryContextMenuState | null>(null);
  const [colorTheme, setColorTheme] = useState<StoryTheme>('dark');
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['src', 'src/components']));
  const [filterQuery, setFilterQuery] = useState('');
  const [isPrimarySideBarVisible, setIsPrimarySideBarVisible] = useState(true);
  const [, setLastCommandLabel] = useState('Idle');
  const [searchQuery, setSearchQuery] = useState('button');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategoryId, setSettingsCategoryId] = useState('appearance');
  const [settingsScopeId, setSettingsScopeId] = useState('user');
  const [settingsSearchValue, setSettingsSearchValue] = useState('');
  const [sideBarSizePercent, setSideBarSizePercent] = useState(24);
  const [openPaths, setOpenPaths] = useState([
    'src/App.tsx',
    'src/components/Button.tsx',
    'src/workbench/Shell.tsx',
  ]);
  const workspaceTree = useMemo(() => buildWorkspaceTree(workspaceFolders, files), [files]);
  const activeActivity = storyActivities[activeActivityId];
  const activeFile = getActiveFile(activeItemId, files);

  const filteredSearchResults = useMemo(
    () => searchWorkspaceFiles(files, searchQuery),
    [files, searchQuery],
  );
  const openContextMenu = (
    event: MouseEvent<HTMLElement>,
    items: ContextMenuItem[],
    ariaLabel: string,
  ) => {
    event.preventDefault();
    setContextMenu({ ariaLabel, items, x: event.clientX, y: event.clientY });
  };

  const showActivity = (activityId: StoryActivityId) => {
    setActiveActivityId(activityId);
    setActiveItemId(defaultSelectionByActivity[activityId]);
    setIsPrimarySideBarVisible(true);
    setLastCommandLabel(`${storyActivities[activityId].label} opened`);
  };

  const activateActivityFromBar = (activityId: StoryActivityId) => {
    if (activityId === activeActivityId && isPrimarySideBarVisible) {
      setIsPrimarySideBarVisible(false);
      setLastCommandLabel('Primary sidebar hidden');
      return;
    }

    showActivity(activityId);
  };

  const activateFile = (path: string) => {
    setActiveItemId(path);
    setOpenPaths((current) => (current.includes(path) ? current : [...current, path]));
    setLastCommandLabel(`Opened ${path}`);
  };

  const activateSearchResult = (result: WorkspaceSearchResult) => {
    activateFile(result.path);
  };

  const closePath = (path: string) => {
    setOpenPaths((current) => {
      const next = current.filter((openPath) => openPath !== path);
      if (activeItemId === path) {
        setActiveItemId(next[0] ?? defaultSelectionByActivity.explorer);
      }
      return next;
    });
    setLastCommandLabel(`Closed ${path}`);
  };

  const closeOthers = (path: string) => {
    setOpenPaths([path]);
    setActiveItemId(path);
    setLastCommandLabel(`Closed other files`);
  };

  const closeAll = () => {
    setOpenPaths([]);
    setLastCommandLabel('Closed all files');
  };

  const saveFile = (path: string, content: string) => {
    setFiles((current) =>
      current.map((file) =>
        file.path === path
          ? {
              ...file,
              content,
              source: 'user',
              updatedAt: new Date().toISOString(),
            }
          : file,
      ),
    );
    setLastCommandLabel(`Saved ${path}`);
  };

  const deleteFile = (path: string) => {
    setFiles((current) => current.filter((file) => file.path !== path));
    setOpenPaths((current) => current.filter((openPath) => openPath !== path));
    if (activeItemId === path) {
      setActiveItemId(defaultSelectionByActivity.explorer);
    }
    setLastCommandLabel(`Deleted ${path}`);
  };

  const toggleFolder = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const createWorkbenchMenuItems = (): ContextMenuItem[] => [
    {
      id: 'view.explorer',
      label: 'Explorer',
      icon: 'codicon-files',
      onSelect: () => showActivity('explorer'),
    },
    {
      id: 'view.search',
      label: 'Search',
      icon: 'codicon-search',
      onSelect: () => showActivity('search'),
    },
    {
      id: 'view.chat',
      label: 'Chat',
      icon: 'codicon-comment-discussion',
      onSelect: () => showActivity('chat'),
    },
    { id: 'workbench-separator', type: 'separator' },
    {
      id: 'toggle-sidebar',
      label: isPrimarySideBarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
      icon: 'codicon-layout-sidebar-left',
      onSelect: () => {
        setIsPrimarySideBarVisible((current) => !current);
        setLastCommandLabel('Primary sidebar toggled');
      },
    },
    {
      id: 'open-settings',
      label: 'Settings',
      icon: 'codicon-settings-gear',
      onSelect: () => setSettingsOpen(true),
    },
  ];

  const createWorkspaceMenuItems = (node: WorkspaceTreeNode): ContextMenuItem[] => [
    {
      id: 'open',
      label: node.type === 'folder' ? 'Reveal folder' : 'Open file',
      icon: node.type === 'folder' ? 'codicon-folder-opened' : 'codicon-go-to-file',
      onSelect: () => {
        if (node.type === 'folder') {
          setExpandedPaths((current) => new Set(current).add(node.path));
          setLastCommandLabel(`Revealed ${node.path}`);
          return;
        }
        activateFile(node.path);
      },
    },
    {
      id: 'copy-path',
      label: 'Copy path',
      icon: 'codicon-copy',
      onSelect: () => setLastCommandLabel(`Copied ${node.path}`),
    },
    { id: 'workspace-separator', type: 'separator' },
    {
      id: 'rename',
      label: 'Rename',
      icon: 'codicon-edit',
      onSelect: () => setLastCommandLabel(`Rename queued for ${node.path}`),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'codicon-trash',
      danger: true,
      onSelect: () => setLastCommandLabel(`Delete queued for ${node.path}`),
    },
  ];

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && filteredSearchResults[0]) {
      event.preventDefault();
      activateSearchResult(filteredSearchResults[0]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchQuery('');
      setLastCommandLabel('Search cleared');
    }
  };

  const editorArea = (
    <main className="workbench-editor-area">
      <WorkspaceEditorPanel
        files={files}
        openPaths={openPaths}
        selectedPath={activeFile.path}
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
    <div className="ide-root" data-theme={colorTheme} style={{ height: 640, minHeight: 0 }}>
      <div className="ide-body">
        <ActivityBar
          items={getActivityItems(activeActivityId)}
          secondaryItems={[
            {
              id: 'settings',
              label: 'Settings',
              icon: <i className="codicon codicon-settings-gear" />,
              active: settingsOpen,
            },
          ]}
          onContextMenu={(event) =>
            openContextMenu(event, createWorkbenchMenuItems(), 'Activity bar menu')
          }
          onItemActivate={(item) => {
            if (item.id === 'settings') {
              setSettingsOpen(true);
              return;
            }

            if (isStoryActivityId(item.id)) {
              activateActivityFromBar(item.id);
            }
          }}
        />
        {isPrimarySideBarVisible ? (
          <SplitView
            className="ui-workbench-story-shell-split"
            minPrimarySizePercent={16}
            maxPrimarySizePercent={40}
            primarySizePercent={sideBarSizePercent}
            onPrimarySizePercentChange={setSideBarSizePercent}
            primary={
              <aside
                aria-label="Primary sidebar"
                className="workbench-primary-side-bar"
                style={{ borderRight: '1px solid var(--color-border)' }}
                onContextMenu={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button, input, textarea, .ui-context-menu')) return;

                  openContextMenu(event, createWorkbenchMenuItems(), 'Primary sidebar menu');
                }}
              >
                {activeActivityId === 'chat' ? (
                  <ChatPanel
                    assistantLabel="Assistant"
                    emptyLabel="Ask about this workspace."
                    isRunning={false}
                    messages={chatMessages}
                    placeholder="Ask about this workspace"
                    showTools
                    title="Chat"
                    value={chatDraft}
                    onCancel={() => setLastCommandLabel('Chat response stopped')}
                    onSubmit={() => {
                      setChatDraft('');
                      setLastCommandLabel('Chat draft sent');
                    }}
                    onValueChange={setChatDraft}
                  />
                ) : (
                  <SideBarViewFrame
                    title={activeActivity.label}
                    actions={<IconButton icon="codicon-refresh" label="Refresh" />}
                    headerAddon={
                      <SideBarHeaderControl>
                        {activeActivityId === 'search' ? (
                          <div className="workbench-search-control">
                            <TextInput
                              aria-label="Search workspace"
                              controlWidth="full"
                              placeholder="Search"
                              value={searchQuery}
                              onChange={(event) => setSearchQuery(event.currentTarget.value)}
                              onKeyDown={handleSearchKeyDown}
                            />
                            <IconButton
                              disabled={!searchQuery}
                              icon="codicon-close"
                              label="Clear search"
                              onClick={() => {
                                setSearchQuery('');
                                setLastCommandLabel('Search cleared');
                              }}
                            />
                          </div>
                        ) : (
                          <TextInput
                            aria-label={`Filter ${activeActivity.label}`}
                            controlWidth="full"
                            placeholder="Filter"
                            value={filterQuery}
                            onChange={(event) => setFilterQuery(event.currentTarget.value)}
                          />
                        )}
                      </SideBarHeaderControl>
                    }
                  >
                    {activeActivityId === 'explorer' ? (
                      <WorkspaceExplorer
                        activePath={activeItemId}
                        expandedPaths={expandedPaths}
                        filterQuery={filterQuery}
                        nodes={workspaceTree}
                        onActivateFile={activateFile}
                        onItemContextMenu={(event, node) =>
                          openContextMenu(
                            event,
                            createWorkspaceMenuItems(node),
                            'Workspace item menu',
                          )
                        }
                        onToggleFolder={toggleFolder}
                      />
                    ) : null}
                    {activeActivityId === 'search' ? (
                      <WorkspaceSearchResults
                        activePath={activeItemId}
                        query={searchQuery}
                        results={filteredSearchResults}
                        onActivateResult={activateSearchResult}
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
                    ) : null}
                  </SideBarViewFrame>
                )}
              </aside>
            }
            secondary={editorArea}
          />
        ) : (
          editorArea
        )}
      </div>
      <StatusBar compact>
        <StatusBarSection>
          <StatusBarItem icon={<span className="workbench-status-dot" />}>Idle</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem
            icon={<i className="codicon codicon-color-mode" />}
            onClick={() => setColorTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            {colorTheme === 'dark' ? 'Dark' : 'Light'}
          </StatusBarItem>
          <StatusBarItem
            icon={<i className="codicon codicon-layout-sidebar-left" />}
            onClick={() => {
              setIsPrimarySideBarVisible((current) => !current);
              setLastCommandLabel('Primary sidebar toggled');
            }}
          >
            {isPrimarySideBarVisible ? 'Hide sidebar' : 'Show sidebar'}
          </StatusBarItem>
        </StatusBarSection>
      </StatusBar>
      {contextMenu ? (
        <ContextMenu
          ariaLabel={contextMenu.ariaLabel}
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
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
                  setColorTheme('dark');
                  setSearchQuery('button');
                  setSettingsCategoryId('appearance');
                  setSettingsScopeId('user');
                  setSettingsSearchValue('');
                  setLastCommandLabel('Settings reset');
                }}
              >
                Reset
              </Button>
              <span className="workbench-settings-footer__spacer" />
              <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setSettingsOpen(false)}>
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
          onActiveCategoryIdChange={setSettingsCategoryId}
          onClose={() => setSettingsOpen(false)}
          onScopeChange={setSettingsScopeId}
          onSearchValueChange={setSettingsSearchValue}
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
              onColorThemeChange: setColorTheme,
              onCompactRowsChange: setCompactRows,
              onSearchQueryChange: setSearchQuery,
              onSettingsSearchValueChange: setSettingsSearchValue,
              onSideBarSizePercentChange: setSideBarSizePercent,
            })
          }
        />
      ) : null}
    </div>
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
