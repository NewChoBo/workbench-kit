import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog, StorySidebarFrame } from '../story/StorySidebarFrame';
import { WorkspaceSearchPanel } from './WorkspaceSearchPanel';
import type { WorkspaceSearchResult } from './types';

const searchResults: WorkspaceSearchResult[] = [
  {
    id: 'button-story',
    line: 12,
    matchedBy: 'Content match',
    path: 'src/primitives/Button.tsx',
    preview: 'export function Button({ variant = "default" })',
    file: {
      content: 'export function Button() {}',
      mimeType: 'text/typescript',
      path: 'src/primitives/Button.tsx',
    },
  },
  {
    id: 'button-test',
    line: 34,
    matchedBy: 'Path match',
    path: 'src/workbench/ButtonHarness.tsx',
    preview: 'const buttonHarness = createHarness()',
    file: {
      content: 'const buttonHarness = createHarness()',
      mimeType: 'text/typescript',
      path: 'src/workbench/ButtonHarness.tsx',
    },
  },
];

const meta = {
  title: 'React/Workbench/Workspace Search',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <WorkspaceSearchHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SearchPanelFlow: Story = {
  name: 'Search panel flow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Type to search files')).toBeVisible();

    const input = canvas.getByLabelText('Search workspace');
    await userEvent.type(input, 'button');
    await expect(await canvas.findByText('2 results')).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(
      canvas.getByRole('status', { name: 'Workspace search event log' }),
    ).toHaveTextContent('Activated src/primitives/Button.tsx');

    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
    await expect(input).toHaveValue('');

    await userEvent.type(input, 'missing');
    await expect(await canvas.findByText('No results')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Refresh results' }));
    await expect(
      canvas.getByRole('status', { name: 'Workspace search event log' }),
    ).toHaveTextContent('Refresh requested');
  },
  tags: ['storybook-play-required'],
};

function WorkspaceSearchHarness() {
  const [query, setQuery] = useState('');
  const [activePath, setActivePath] = useState<string | undefined>();
  const [status, setStatus] = useState('Ready');

  const visibleResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return searchResults;

    return searchResults.filter(
      (result) =>
        result.path.toLowerCase().includes(normalizedQuery) ||
        result.preview.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <section aria-label="Workspace search story surface" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="workspace">
        <WorkspaceSearchPanel
          activePath={activePath}
          query={query}
          results={visibleResults}
          onActivateResult={(result) => {
            setActivePath(result.path);
            setStatus(`Activated ${result.path}`);
          }}
          onQueryChange={setQuery}
          onRefresh={() => setStatus('Refresh requested')}
        />

        <StoryEventLog aria-label="Workspace search event log" compact>
          {status}
        </StoryEventLog>
      </StorySidebarFrame>
    </section>
  );
}
