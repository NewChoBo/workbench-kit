import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkbenchStoryHost } from '@workbench-kit/react/workbench';
import { expect, within } from 'storybook/test';

import { WorkbenchProvider, WorkbenchShell } from './index.js';

const meta = {
  title: 'Shell React/Shell',
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

export const ProviderShell: Story = {
  name: 'Provider Shell',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        story:
          'Primary shell path composed through @workbench-kit/shell-react using workbench-core registries and bundled extension manifests.',
      },
    },
  },
  render: () => (
    <WorkbenchStoryHost>
      <WorkbenchProvider extensionsConfig={sampleExtensionsConfig} initialLayout={defaultLayout}>
        <WorkbenchShell rootClassName="ide-root" theme="dark" />
      </WorkbenchProvider>
    </WorkbenchStoryHost>
  ),
};

export const ProviderShellSearchSidebar: Story = {
  name: 'Provider Shell / Search sidebar',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
  },
  render: () => (
    <WorkbenchProvider
      extensionsConfig={sampleExtensionsConfig}
      initialLayout={{
        ...defaultLayout,
        sideBar: {
          activeViewContainer: 'search',
          visible: true,
        },
      }}
    >
      <WorkbenchShell rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    const searchActivity = within(activityBar).getByRole('button', { name: 'Search' });

    await expect(searchActivity).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('textbox', { name: 'Search workspace' })).toBeVisible();
  },
};

export const ProviderShellChattingSidebar: Story = {
  name: 'Provider Shell / Chatting sidebar',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        story:
          'Opens the human chatting sidebar from the activity bar for sidebar layout and composer testing.',
      },
    },
  },
  render: () => (
    <WorkbenchProvider
      extensionsConfig={sampleExtensionsConfig}
      initialLayout={{
        ...defaultLayout,
        sideBar: {
          activeViewContainer: 'chatting',
          visible: true,
        },
      }}
    >
      <WorkbenchShell rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    const chattingActivity = within(activityBar).getByRole('button', { name: 'Chat' });

    await expect(chattingActivity).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByPlaceholderText('Message your team')).toBeVisible();
    await expect(
      canvas.getByText('Can you review the widget tree changes before we merge?'),
    ).toBeVisible();
  },
};

export const ProviderShellAiChatSidebar: Story = {
  name: 'Provider Shell / AI Chat sidebar',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        story:
          'Opens the AI chat sidebar from the activity bar for mock runtime streaming and composer testing.',
      },
    },
  },
  render: () => (
    <WorkbenchStoryHost>
      <WorkbenchProvider
        extensionsConfig={sampleExtensionsConfig}
        initialLayout={{
          ...defaultLayout,
          sideBar: {
            activeViewContainer: 'aiChat',
            visible: true,
          },
        }}
      >
        <WorkbenchShell rootClassName="ide-root" theme="dark" />
      </WorkbenchProvider>
    </WorkbenchStoryHost>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    const aiChatActivity = within(activityBar).getByRole('button', { name: 'AI Chat' });

    await expect(aiChatActivity).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByPlaceholderText('Ask about this workspace')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Send message' })).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const ProviderShellChatActivitySwitch: Story = {
  name: 'Provider Shell / Chat activity switch',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
  },
  render: () => (
    <WorkbenchProvider extensionsConfig={sampleExtensionsConfig} initialLayout={defaultLayout}>
      <WorkbenchShell rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  ),
  play: async ({ canvasElement, user }) => {
    const canvas = within(canvasElement);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });

    await user.click(within(activityBar).getByRole('button', { name: 'AI Chat' }));
    await expect(canvas.getByPlaceholderText('Ask about this workspace')).toBeVisible();

    await user.click(within(activityBar).getByRole('button', { name: 'Chat' }));
    await expect(canvas.getByPlaceholderText('Message your team')).toBeVisible();
  },
};

export const ProviderShellActivityBarOrder: Story = {
  name: 'Provider Shell / Activity bar order',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
  },
  render: () => (
    <WorkbenchProvider extensionsConfig={sampleExtensionsConfig} initialLayout={defaultLayout}>
      <WorkbenchShell rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    const labels = within(activityBar)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((label): label is string => Boolean(label));

    await expect(labels.slice(0, 4)).toEqual(['Explorer', 'Search', 'Chat', 'AI Chat']);
  },
};
