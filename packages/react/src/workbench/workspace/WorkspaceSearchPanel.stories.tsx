import { useMemo, useState, type MouseEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import { searchWorkspaceFiles, type WorkspaceFile } from '@newchobo-ui/workspace';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
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
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          icon: 'codicon-folder-opened',
          id: 'open',
          label: 'Open',
          shortcut: 'Enter',
          onSelect: () => {
            activateResult(result);
            setContextMenu(null);
          },
        },
        {
          icon: 'codicon-copy',
          id: 'copy-path',
          label: 'Copy path',
          onSelect: () => {
            setStatus(`Copied ${result.path}`);
            setContextMenu(null);
          },
        },
        { id: 'result-menu-separator', type: 'separator' },
        {
          danger: true,
          icon: 'codicon-trash',
          id: 'delete',
          label: 'Delete',
          onSelect: () => {
            setFiles((currentFiles) => currentFiles.filter((file) => file.path !== result.path));
            setStatus(`Deleted ${result.path}`);
            setContextMenu(null);
          },
        },
      ],
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
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Copy path' }));
    await expect(canvas.getByLabelText('Search event log')).toHaveTextContent('Copied README.md');

    await fireEvent.contextMenu(readmeResult);
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Delete' }));
    await expect(canvas.getByLabelText('Search event log')).toHaveTextContent('Deleted README.md');
    await expect(canvas.queryByRole('button', { name: /READ.*ME\.md/i })).toBeNull();
    await expect(canvas.getByText('No results')).toBeVisible();
  },
};
