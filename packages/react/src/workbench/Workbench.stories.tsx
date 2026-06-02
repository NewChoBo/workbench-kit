import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { SideBarHeaderControl, SideBarViewFrame } from '../layout/SideBarViewFrame';
import { Modal } from '../modal/Modal';
import { ContextMenu, type ContextMenuItem } from '../overlay/ContextMenu';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { EmptyState } from '../primitives/EmptyState';
import { Field } from '../primitives/Field';
import { IconButton } from '../primitives/IconButton';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import { Toolbar } from '../primitives/Toolbar';
import { ActivityBar } from './ActivityBar';
import { ChatPanel, type ChatMessage } from './chat';
import { SplitView } from './SplitView';
import { StatusBar, StatusBarItem, StatusBarSection } from './StatusBar';
import {
  WorkspaceEditorPanel,
  WorkspaceExplorer,
  WorkspaceSearchPanel,
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

interface StoryActivity {
  icon: ReactNode;
  id: StoryActivityId;
  label: string;
}

interface StoryNavigationItem {
  description?: string;
  icon?: string;
  id: string;
  label: string;
  variant?: 'default' | 'stacked';
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
  chat: 'review-session',
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

const chatSessions: StoryNavigationItem[] = [
  {
    id: 'review-session',
    label: 'Review session',
    description: 'Workbench shell handoff',
    icon: 'codicon-comment-discussion',
    variant: 'stacked',
  },
  {
    id: 'release-notes',
    label: 'Release notes',
    description: 'Component package summary',
    icon: 'codicon-note',
    variant: 'stacked',
  },
  {
    id: 'accessibility-check',
    label: 'Accessibility check',
    description: 'Keyboard and semantics',
    icon: 'codicon-checklist',
    variant: 'stacked',
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

const storyCardStyle = {
  minHeight: 88,
  padding: 12,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-muted)',
} as const;

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

function getActiveLabel(
  activeActivityId: StoryActivityId,
  activeItemId: string,
  files: WorkspaceFile[],
) {
  if (activeActivityId === 'chat') {
    return chatSessions.find((item) => item.id === activeItemId)?.label ?? 'Review session';
  }

  const activeFile = files.find((file) => file.path === activeItemId);
  if (activeFile) return fileNameOfPath(activeFile.path);

  return activeActivityId === 'search' ? 'Search results' : fileNameOfPath(activeItemId);
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
          <StatusBarItem icon={<i className="codicon codicon-source-control" />}>
            main
          </StatusBarItem>
          <StatusBarItem icon={<i className="codicon codicon-check" />}>Ready</StatusBarItem>
          <StatusBarItem>Explorer</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem>2 warnings</StatusBarItem>
          <StatusBarItem icon={<i className="codicon codicon-settings-gear" />}>
            Settings
          </StatusBarItem>
        </StatusBarSection>
      </StatusBar>
    </div>
  ),
};

export const IntegratedShell: Story = {
  render: () => <IntegratedWorkbenchShell />,
};

function IntegratedWorkbenchShell() {
  const [files, setFiles] = useState(workspaceFiles);
  const [activeActivityId, setActiveActivityId] = useState<StoryActivityId>('explorer');
  const [activeItemId, setActiveItemId] = useState(defaultSelectionByActivity.explorer);
  const [chatDraft, setChatDraft] = useState('');
  const [compactRows, setCompactRows] = useState(true);
  const [contextMenu, setContextMenu] = useState<StoryContextMenuState | null>(null);
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['src', 'src/components']));
  const [filterQuery, setFilterQuery] = useState('');
  const [isPrimarySideBarVisible, setIsPrimarySideBarVisible] = useState(true);
  const [lastCommandLabel, setLastCommandLabel] = useState('Ready');
  const [primarySizePercent, setPrimarySizePercent] = useState(62);
  const [searchQuery, setSearchQuery] = useState('button');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sideBarSizePercent, setSideBarSizePercent] = useState(24);
  const [openPaths, setOpenPaths] = useState([
    'src/App.tsx',
    'src/components/Button.tsx',
    'src/workbench/Shell.tsx',
  ]);
  const workspaceTree = useMemo(() => buildWorkspaceTree(workspaceFolders, files), [files]);
  const activeActivity = storyActivities[activeActivityId];
  const activeLabel = getActiveLabel(activeActivityId, activeItemId, files);
  const activeFile = getActiveFile(activeItemId, files);

  const filteredSearchResults = useMemo(
    () => searchWorkspaceFiles(files, searchQuery),
    [files, searchQuery],
  );
  const statusCountLabel =
    activeActivityId === 'search'
      ? `${filteredSearchResults.length} results`
      : activeActivityId === 'chat'
        ? `${chatMessages.length} messages`
        : `${files.length} files`;

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
    <section className="workbench-editor-area">
      <Panel>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge>ready</Badge>
              <Button variant="primary" onClick={() => setSettingsOpen(true)}>
                Settings
              </Button>
            </Toolbar>
          }
        >
          {activeActivity.label} / {activeLabel}
        </PanelHeader>
        <PanelBody style={{ display: 'flex', overflow: 'hidden' }}>
          <SplitView
            primarySizePercent={primarySizePercent}
            onPrimarySizePercentChange={setPrimarySizePercent}
            primary={renderPrimarySurface({
              activeActivityId,
              activeFile,
              activeItemId,
              activeLabel,
              compactRows,
              files,
              filteredSearchResults,
              onCloseAll: closeAll,
              onCloseOthers: closeOthers,
              onClosePath: closePath,
              onCopyPath: (path) => setLastCommandLabel(`Copied ${path}`),
              onDeletePath: deleteFile,
              onActivateSearchResult: activateSearchResult,
              onSaveFile: saveFile,
              onSelectedPathChange: activateFile,
              openPaths,
              searchQuery,
            })}
            secondary={
              <Panel style={{ minWidth: 0 }}>
                <PanelHeader>Inspector</PanelHeader>
                <PanelBody style={{ padding: 16 }}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={storyCardStyle}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                        Activity
                      </strong>
                      <span>{activeActivity.label}</span>
                    </div>
                    <div style={storyCardStyle}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                        Selection
                      </strong>
                      <span>{activeFile.path}</span>
                    </div>
                    <div style={storyCardStyle}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                        Editor split
                      </strong>
                      <span>{Math.round(primarySizePercent)}%</span>
                    </div>
                    <div style={storyCardStyle}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                        Sidebar
                      </strong>
                      <span>
                        {isPrimarySideBarVisible ? `${Math.round(sideBarSizePercent)}%` : 'Hidden'}
                      </span>
                    </div>
                    <div style={storyCardStyle}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                        Command
                      </strong>
                      <span>{lastCommandLabel}</span>
                    </div>
                  </div>
                </PanelBody>
              </Panel>
            }
          />
        </PanelBody>
      </Panel>
    </section>
  );

  return (
    <main className="ide-root" style={{ height: 640, minHeight: 0 }}>
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
          <StatusBarItem icon={<i className="codicon codicon-source-control" />}>
            main
          </StatusBarItem>
          <StatusBarItem icon={<span className="workbench-status-dot" />}>Ready</StatusBarItem>
          <StatusBarItem active>{activeActivity.label}</StatusBarItem>
          <StatusBarItem>{activeFile.path}</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem>{statusCountLabel}</StatusBarItem>
          <StatusBarItem
            icon={<i className="codicon codicon-layout-sidebar-left" />}
            onClick={() => {
              setIsPrimarySideBarVisible((current) => !current);
              setLastCommandLabel('Primary sidebar toggled');
            }}
          >
            {isPrimarySideBarVisible ? `${Math.round(sideBarSizePercent)}%` : 'Hidden'}
          </StatusBarItem>
          <StatusBarItem icon={<i className="codicon codicon-layout" />}>
            {Math.round(primarySizePercent)}%
          </StatusBarItem>
          <StatusBarItem
            icon={<i className="codicon codicon-settings-gear" />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
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
        <Modal
          title="Settings"
          bodyClassName="ui-workbench-story-settings"
          onClose={() => setSettingsOpen(false)}
          footer={
            <>
              <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setSettingsOpen(false)}>
                Apply
              </Button>
            </>
          }
        >
          <div style={{ padding: 20 }}>
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
            <Field label="Search seed">
              <TextInput
                controlWidth="full"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function renderPrimarySurface({
  activeActivityId,
  activeFile,
  activeItemId,
  activeLabel,
  compactRows,
  files,
  filteredSearchResults,
  onCloseAll,
  onCloseOthers,
  onClosePath,
  onCopyPath,
  onDeletePath,
  onActivateSearchResult,
  onSaveFile,
  onSelectedPathChange,
  openPaths,
  searchQuery,
}: {
  activeActivityId: StoryActivityId;
  activeFile: WorkspaceFile;
  activeItemId: string;
  activeLabel: string;
  compactRows: boolean;
  files: WorkspaceFile[];
  filteredSearchResults: WorkspaceSearchResult[];
  onCloseAll: () => void;
  onCloseOthers: (path: string) => void;
  onClosePath: (path: string) => void;
  onCopyPath: (path: string) => void;
  onDeletePath: (path: string) => void;
  onActivateSearchResult: (result: WorkspaceSearchResult) => void;
  onSaveFile: (path: string, content: string) => void;
  onSelectedPathChange: (path: string) => void;
  openPaths: string[];
  searchQuery: string;
}) {
  if (activeActivityId === 'chat') {
    return (
      <Panel style={{ minWidth: 0 }}>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge variant="muted">{chatMessages.length} messages</Badge>
              <IconButton icon="codicon-references" label="Open references" />
            </Toolbar>
          }
        >
          Conversation context
        </PanelHeader>
        <PanelBody style={{ padding: 16 }}>
          <section
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              marginBottom: 12,
            }}
          >
            {['Current file', 'Selection', 'Prompt context'].map((label) => (
              <div key={label} style={storyCardStyle}>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>{label}</strong>
                <span>{label === 'Current file' ? activeFile.path : activeLabel}</span>
              </div>
            ))}
          </section>
          <WorkspaceEditorPanel
            emptyLabel="Open a file to add it as conversation context."
            files={files}
            openPaths={openPaths}
            selectedPath={activeFile.path}
            onCloseAll={onCloseAll}
            onCloseOthers={onCloseOthers}
            onClosePath={onClosePath}
            onCopyPath={onCopyPath}
            onDeletePath={onDeletePath}
            onSaveFile={onSaveFile}
            onSelectedPathChange={onSelectedPathChange}
          />
        </PanelBody>
      </Panel>
    );
  }

  if (activeActivityId === 'search') {
    return (
      <WorkspaceSearchPanel
        activePath={activeItemId}
        compactRows={compactRows}
        query={searchQuery}
        results={filteredSearchResults}
        onActivateResult={onActivateSearchResult}
      />
    );
  }

  return (
    <WorkspaceEditorPanel
      files={files}
      openPaths={openPaths}
      selectedPath={activeFile.path}
      onCloseAll={onCloseAll}
      onCloseOthers={onCloseOthers}
      onClosePath={onClosePath}
      onCopyPath={onCopyPath}
      onDeletePath={onDeletePath}
      onSaveFile={onSaveFile}
      onSelectedPathChange={onSelectedPathChange}
    />
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
