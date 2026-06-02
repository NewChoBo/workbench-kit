import { useMemo, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from '../modal/Modal';
import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../layout/SideBarViewFrame';
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
import { SplitView } from './SplitView';
import { StatusBar, StatusBarItem, StatusBarSection } from './StatusBar';

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
  depth?: number;
  icon?: string;
  id: string;
  label: string;
  variant?: 'default' | 'stacked';
}

interface StorySearchResult {
  id: string;
  line: number;
  path: string;
  preview: string;
}

interface StoryMessage {
  author: 'assistant' | 'user';
  body: string;
  id: string;
  time: string;
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
  search: 'src/components/Button.tsx:12',
  chat: 'review-session',
};

const explorerItems: StoryNavigationItem[] = [
  { id: 'src', label: 'src', icon: 'codicon-folder' },
  { id: 'src/components', label: 'components', depth: 1, icon: 'codicon-folder' },
  { id: 'src/components/Button.tsx', label: 'Button.tsx', depth: 2, icon: 'codicon-symbol-method' },
  { id: 'src/components/Panel.tsx', label: 'Panel.tsx', depth: 2, icon: 'codicon-symbol-class' },
  { id: 'src/workbench', label: 'workbench', depth: 1, icon: 'codicon-folder' },
  { id: 'src/workbench/Shell.tsx', label: 'Shell.tsx', depth: 2, icon: 'codicon-layout' },
  { id: 'src/App.tsx', label: 'App.tsx', depth: 1, icon: 'codicon-code' },
  { id: 'README.md', label: 'README.md', icon: 'codicon-book' },
];

const searchResults: StorySearchResult[] = [
  {
    id: 'src/components/Button.tsx:12',
    path: 'src/components/Button.tsx',
    line: 12,
    preview: 'export function Button({ variant = "default" })',
  },
  {
    id: 'src/workbench/Shell.tsx:48',
    path: 'src/workbench/Shell.tsx',
    line: 48,
    preview: '<ActivityBar items={activityItems} />',
  },
  {
    id: 'src/workbench/Shell.tsx:96',
    path: 'src/workbench/Shell.tsx',
    line: 96,
    preview: '<StatusBar compact>',
  },
  {
    id: 'README.md:18',
    path: 'README.md',
    line: 18,
    preview: 'Import the shared React workbench styles once.',
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

const chatMessages: StoryMessage[] = [
  {
    id: 'm1',
    author: 'user',
    time: '09:14',
    body: 'Check whether the workbench shell covers explorer, search, chat, settings, and status surfaces.',
  },
  {
    id: 'm2',
    author: 'assistant',
    time: '09:15',
    body: 'The integrated story now keeps those surfaces in one stateful shell with public mock data.',
  },
  {
    id: 'm3',
    author: 'assistant',
    time: '09:16',
    body: 'Status and settings controls are available from both the activity rail and the bottom bar.',
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

function getActiveLabel(activeActivityId: StoryActivityId, activeItemId: string) {
  if (activeActivityId === 'explorer') {
    return explorerItems.find((item) => item.id === activeItemId)?.label ?? 'App.tsx';
  }

  if (activeActivityId === 'search') {
    return searchResults.find((item) => item.id === activeItemId)?.path ?? 'Search results';
  }

  return chatSessions.find((item) => item.id === activeItemId)?.label ?? 'Review session';
}

function StoryNavigationList({
  activeItemId,
  items,
  onActivate,
}: {
  activeItemId: string;
  items: StoryNavigationItem[];
  onActivate: (id: string) => void;
}) {
  return (
    <SideBarList fill>
      {items.map((item) => (
        <SideBarListItem
          key={item.id}
          active={activeItemId === item.id}
          depth={item.depth}
          variant={item.variant}
          onClick={() => onActivate(item.id)}
        >
          {item.variant === 'stacked' ? (
            <>
              <strong>
                {item.icon ? <i className={`codicon ${item.icon}`} /> : null}
                {item.label}
              </strong>
              <span>{item.description}</span>
            </>
          ) : (
            <>
              {item.icon ? <i className={`codicon ${item.icon}`} /> : null}
              <span>{item.label}</span>
            </>
          )}
        </SideBarListItem>
      ))}
    </SideBarList>
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
  const [activeActivityId, setActiveActivityId] = useState<StoryActivityId>('explorer');
  const [activeItemId, setActiveItemId] = useState(defaultSelectionByActivity.explorer);
  const [chatDraft, setChatDraft] = useState('');
  const [compactRows, setCompactRows] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [primarySizePercent, setPrimarySizePercent] = useState(62);
  const [searchQuery, setSearchQuery] = useState('button');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeActivity = storyActivities[activeActivityId];
  const activeLabel = getActiveLabel(activeActivityId, activeItemId);

  const filteredSearchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return searchResults;

    return searchResults.filter(
      (result) =>
        result.path.toLowerCase().includes(normalizedQuery) ||
        result.preview.toLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery]);

  const activateActivity = (activityId: StoryActivityId) => {
    setActiveActivityId(activityId);
    setActiveItemId(defaultSelectionByActivity[activityId]);
  };

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
          onItemActivate={(item) => {
            if (item.id === 'settings') {
              setSettingsOpen(true);
              return;
            }

            if (isStoryActivityId(item.id)) {
              activateActivity(item.id);
            }
          }}
        />
        <aside
          aria-label="Primary sidebar"
          className="workbench-primary-side-bar"
          style={{
            width: 296,
            flex: '0 0 296px',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <SideBarViewFrame
            title={activeActivity.label}
            actions={<IconButton icon="codicon-refresh" label="Refresh" />}
            headerAddon={
              <SideBarHeaderControl>
                {activeActivityId === 'search' ? (
                  <TextInput
                    aria-label="Search workspace"
                    controlWidth="full"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                  />
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
              <StoryNavigationList
                activeItemId={activeItemId}
                items={explorerItems}
                onActivate={setActiveItemId}
              />
            ) : null}
            {activeActivityId === 'search' ? (
              <SideBarList fill aria-label="Search results">
                {filteredSearchResults.map((result) => (
                  <SideBarListItem
                    key={result.id}
                    active={activeItemId === result.id}
                    variant="stacked"
                    onClick={() => setActiveItemId(result.id)}
                  >
                    <strong>{result.path}</strong>
                    <span>
                      Line {result.line}: {result.preview}
                    </span>
                  </SideBarListItem>
                ))}
                {filteredSearchResults.length === 0 ? (
                  <SideBarListItem disabled>No results</SideBarListItem>
                ) : null}
              </SideBarList>
            ) : null}
            {activeActivityId === 'chat' ? (
              <StoryNavigationList
                activeItemId={activeItemId}
                items={chatSessions}
                onActivate={setActiveItemId}
              />
            ) : null}
          </SideBarViewFrame>
        </aside>
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
                  activeItemId,
                  activeLabel,
                  chatDraft,
                  compactRows,
                  filteredSearchResults,
                  searchQuery,
                  setChatDraft,
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
                          <span>{activeLabel}</span>
                        </div>
                        <div style={storyCardStyle}>
                          <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                            Split
                          </strong>
                          <span>{Math.round(primarySizePercent)}%</span>
                        </div>
                      </div>
                    </PanelBody>
                  </Panel>
                }
              />
            </PanelBody>
          </Panel>
        </section>
      </div>
      <StatusBar compact>
        <StatusBarSection>
          <StatusBarItem icon={<i className="codicon codicon-source-control" />}>
            main
          </StatusBarItem>
          <StatusBarItem icon={<i className="codicon codicon-check" />}>Ready</StatusBarItem>
          <StatusBarItem active>{activeActivity.label}</StatusBarItem>
          <StatusBarItem>{activeLabel}</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem>{filteredSearchResults.length} results</StatusBarItem>
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
  activeItemId,
  activeLabel,
  chatDraft,
  compactRows,
  filteredSearchResults,
  searchQuery,
  setChatDraft,
}: {
  activeActivityId: StoryActivityId;
  activeItemId: string;
  activeLabel: string;
  chatDraft: string;
  compactRows: boolean;
  filteredSearchResults: StorySearchResult[];
  searchQuery: string;
  setChatDraft: (value: string) => void;
}) {
  if (activeActivityId === 'chat') {
    return (
      <Panel style={{ minWidth: 0 }}>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge variant="muted">chat</Badge>
              <IconButton icon="codicon-add" label="New chat" />
            </Toolbar>
          }
        >
          {activeLabel}
        </PanelHeader>
        <PanelBody style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'grid', gap: compactRows ? 8 : 14 }}>
              {chatMessages.map((message) => (
                <article
                  key={message.id}
                  style={{
                    maxWidth: message.author === 'user' ? 520 : 620,
                    justifySelf: message.author === 'user' ? 'end' : 'start',
                    padding: 12,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-muted)',
                    background:
                      message.author === 'user'
                        ? 'var(--color-surface-hover)'
                        : 'var(--color-surface)',
                  }}
                >
                  <header
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      marginBottom: 6,
                      color: 'var(--color-text)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <strong>{message.author === 'user' ? 'User' : 'Assistant'}</strong>
                    <span>{message.time}</span>
                  </header>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{message.body}</p>
                </article>
              ))}
            </div>
          </div>
          <form
            style={{
              flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 8,
              padding: 12,
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
            onSubmit={(event) => {
              event.preventDefault();
              setChatDraft('');
            }}
          >
            <TextInput
              aria-label="Chat message"
              controlWidth="full"
              placeholder="Ask about this workspace"
              value={chatDraft}
              onChange={(event) => setChatDraft(event.currentTarget.value)}
            />
            <Button variant="primary">Send</Button>
          </form>
        </PanelBody>
      </Panel>
    );
  }

  if (activeActivityId === 'search') {
    return (
      <Panel style={{ minWidth: 0 }}>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge variant="muted">{filteredSearchResults.length} results</Badge>
              <IconButton icon="codicon-refresh" label="Refresh results" />
            </Toolbar>
          }
        >
          Search: {searchQuery || 'All files'}
        </PanelHeader>
        <PanelBody style={{ padding: 16 }}>
          {filteredSearchResults.length ? (
            <div style={{ display: 'grid', gap: compactRows ? 8 : 12 }}>
              {filteredSearchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  style={{
                    minHeight: compactRows ? 56 : 72,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: 12,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-muted)',
                    background:
                      result.id === activeItemId
                        ? 'var(--color-surface-hover)'
                        : 'var(--color-surface)',
                    font: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                      {result.path}
                    </strong>
                    <span>{result.preview}</span>
                  </span>
                  <Badge variant="muted">Line {result.line}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState compact icon="codicon-search">
              No results
            </EmptyState>
          )}
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel style={{ minWidth: 0 }}>
      <PanelHeader
        actions={
          <Toolbar>
            <Badge variant="muted">file</Badge>
            <IconButton icon="codicon-split" label="Split editor" />
          </Toolbar>
        }
      >
        {activeLabel}
      </PanelHeader>
      <PanelBody style={{ padding: 16 }}>
        <section
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            marginBottom: 12,
          }}
        >
          {['Preview', 'Outline', 'Actions'].map((label) => (
            <div key={label} style={storyCardStyle}>
              <strong style={{ display: 'block', color: 'var(--color-text)' }}>{label}</strong>
              <span>{activeLabel}</span>
            </div>
          ))}
        </section>
        <pre
          style={{
            minHeight: 220,
            margin: 0,
            padding: 14,
            overflow: 'auto',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {`import { Panel, Button } from '@newchobo-ui/react';

export function ${activeLabel.replace(/[^a-zA-Z]/g, '') || 'Preview'}() {
  return (
    <Panel>
      <Button variant="primary">Run</Button>
    </Panel>
  );
}`}
        </pre>
      </PanelBody>
    </Panel>
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
