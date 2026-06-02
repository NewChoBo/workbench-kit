import { useMemo, useState, type MouseEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import {
  commandMenuSeparator,
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
  type CommandMenuEntry,
} from '@newchobo-ui/core';
import { searchWorkspaceFiles, type WorkspaceFile } from '@newchobo-ui/workspace';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { commandMenuItemsToContextMenuItems } from '../commands';
import { WorkspaceSearchPanel } from './WorkspaceSearchPanel';
import type { WorkspaceSearchResult } from './types';

const meta = {
  title: 'React/Workbench/WorkspaceSearchPanel',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fixtureFiles: WorkspaceFile[] = [
  {
    content: 'Project notes and setup instructions.',
    mimeType: 'text/markdown',
    path: 'README.md',
  },
  {
    content: 'export function App() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/App.tsx',
  },
  {
    content: 'export function Button() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/components/Button.tsx',
  },
  {
    content: 'Search panel renders workspace results and previews.',
    mimeType: 'application/typescript',
    path: 'src/workspace/WorkspaceSearchPanel.tsx',
  },
];

interface SearchHarnessProps {
  initialQuery?: string;
}

interface StoryContextMenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface SearchResultCommandContext {
  copyPath: () => void;
  deleteResult: () => void;
  openResult: () => void;
}

const searchResultCommandRegistry = createCommandRegistry<SearchResultCommandContext>([
  {
    id: 'search.openResult',
    label: 'Open',
    icon: 'codicon-folder-opened',
    shortcut: 'Enter',
    run: ({ openResult }) => openResult(),
  },
  {
    id: 'search.copyResultPath',
    label: 'Copy path',
    icon: 'codicon-copy',
    run: ({ copyPath }) => copyPath(),
  },
  {
    id: 'search.deleteResult',
    label: 'Delete',
    icon: 'codicon-trash',
    danger: true,
    run: ({ deleteResult }) => deleteResult(),
  },
]);

const searchResultMenuEntries: CommandMenuEntry<SearchResultCommandContext>[] = [
  { commandId: 'search.openResult' },
  { commandId: 'search.copyResultPath' },
  commandMenuSeparator('result-menu-separator'),
  { commandId: 'search.deleteResult' },
];

function SearchHarness({ initialQuery = '' }: SearchHarnessProps) {
  const [activePath, setActivePath] = useState<string>();
  const [files, setFiles] = useState(fixtureFiles);
  const [query, setQuery] = useState(initialQuery);
  const [contextMenu, setContextMenu] = useState<StoryContextMenuState | null>(null);
  const [status, setStatus] = useState('Ready');
  const results = useMemo(() => searchWorkspaceFiles(files, query), [files, query]);

  const activateResult = (result: WorkspaceSearchResult) => {
    setActivePath(result.path);
    setStatus(`Opened ${result.path}`);
  };

  const openResultMenu = (event: MouseEvent<HTMLElement>, result: WorkspaceSearchResult) => {
    event.preventDefault();
    const context: SearchResultCommandContext = {
      copyPath: () => setStatus(`Copied ${result.path}`),
      deleteResult: () => {
        setFiles((currentFiles) => currentFiles.filter((file) => file.path !== result.path));
        setStatus(`Deleted ${result.path}`);
      },
      openResult: () => activateResult(result),
    };

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: commandMenuItemsToContextMenuItems(
        resolveCommandMenuItems({
          context,
          entries: searchResultMenuEntries,
          registry: searchResultCommandRegistry,
        }),
        (commandId) => executeCommand(searchResultCommandRegistry, commandId, context),
      ),
    });
  };

  return (
    <div className="workspace-search-panel-story" style={{ height: 460, width: 340 }}>
      <WorkspaceSearchPanel
        activePath={activePath}
        query={query}
        results={results}
        onActivateResult={activateResult}
        onQueryChange={setQuery}
        onRefresh={() => setStatus('Search refreshed')}
        onResultContextMenu={openResultMenu}
      />
      <div aria-label="Search event log" role="status">
        {status}
      </div>
      {contextMenu ? (
        <ContextMenu
          ariaLabel="Search result menu"
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

export const ComponentSurface: Story = {
  render: () => <SearchHarness initialQuery="search" />,
};

export const KeyboardFlow: Story = {
  render: () => <SearchHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByRole('textbox', { name: 'Search workspace' });

    await expect(canvas.getByText('Type to search files')).toBeVisible();
    await expect(canvas.getByText('0 results')).toBeVisible();

    await userEvent.type(searchInput, 'button');
    await expect(
      await canvas.findByRole('button', { name: /src\/components\/.*Button.*\.tsx/ }),
    ).toBeVisible();
    await expect(canvas.getByText('1 result')).toBeVisible();

    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('Search event log')).toHaveTextContent(
      'Opened src/components/Button.tsx',
    );

    await userEvent.keyboard('{Escape}');
    await expect(searchInput).toHaveValue('');
    await expect(canvas.getByText('Type to search files')).toBeVisible();
  },
};

export const ResultMenuFlow: Story = {
  render: () => <SearchHarness initialQuery="read" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const readmeResult = await canvas.findByRole('button', { name: /READ.*ME\.md/i });

    await fireEvent.contextMenu(readmeResult);
    await expect(await canvas.findByRole('menuitem', { name: /Open/ })).toHaveTextContent('Enter');
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(canvas.getByLabelText('Search event log')).toHaveTextContent('Copied README.md');

    await fireEvent.contextMenu(readmeResult);
    const deleteItem = await canvas.findByRole('menuitem', { name: 'Delete' });
    await expect(deleteItem).toHaveAttribute('data-danger', 'true');
    await userEvent.click(deleteItem);
    await expect(canvas.getByLabelText('Search event log')).toHaveTextContent('Deleted README.md');
    await expect(canvas.queryByRole('button', { name: /READ.*ME\.md/i })).toBeNull();
    await expect(canvas.getByText('No results')).toBeVisible();
  },
};
