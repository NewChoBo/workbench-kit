import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkbenchStoryHost } from '@workbench-kit/react/workbench';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import { expect, within } from 'storybook/test';

import { WorkbenchDevtoolsShell } from './devtools/WorkbenchDevtoolsShell.js';
import { WorkbenchProvider, WorkbenchShell } from './index.js';

const meta = {
  title: 'Workbench React/Devtools',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sampleExtensionsConfig = {
  enabled: [
    'workbench-kit.builtin.explorer',
    'workbench-kit.builtin.search',
    'workbench-kit.builtin.chat',
    'workbench-kit.builtin.editor',
  ],
  recommendations: [],
} as const;

const defaultLayout = {
  activityBar: {
    itemOrder: ['explorer', 'search', 'chatting', 'aiChat'],
  },
  sideBar: {
    activeViewContainer: 'explorer',
    visible: true,
  },
} as const;

export const RegistryInspectors: Story = {
  name: 'Registry inspectors',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        story:
          'Read-only WB-31 devtools panel for command, context key, view, capability, layout, editor, and workspace transaction snapshots.',
      },
    },
  },
  render: () => (
    <WorkbenchStoryHost>
      <WorkbenchProvider
        extensionsConfig={sampleExtensionsConfig}
        initialLayout={defaultLayout}
        workspaceHostPort={createWorkbenchWorkspaceHostPort()}
      >
        <WorkbenchDevtoolsShell>
          <WorkbenchShell rootClassName="ide-root" theme="dark" />
        </WorkbenchDevtoolsShell>
      </WorkbenchProvider>
    </WorkbenchStoryHost>
  ),
  play: async ({ canvasElement, user }) => {
    const canvas = within(canvasElement);
    const devtools = canvas.getByTestId('workbench-devtools-panel');

    await expect(devtools).toBeVisible();
    await expect(canvas.getByTestId('workbench-devtools-shell')).toBeVisible();
    await expect(devtools).toHaveTextContent('workbench-kit.builtin.explorer');

    await user.click(within(devtools).getByRole('button', { name: 'Layout' }));
    await expect(devtools).toHaveTextContent('"activeViewContainer": "explorer"');

    await user.click(within(devtools).getByRole('button', { name: 'Transactions' }));
    await expect(devtools).toHaveTextContent('Initialize workspace');

    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    await user.click(within(activityBar).getByRole('button', { name: 'Search' }));

    await user.click(within(devtools).getByRole('button', { name: 'Layout' }));
    await expect(devtools).toHaveTextContent('"activeViewContainer": "search"');
  },
};
