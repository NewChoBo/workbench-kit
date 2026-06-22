import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';

import {
  createSampleShellCanvas,
  getPrimaryActivityLabels,
  openSettingsModal,
  waitForSampleShellReady,
} from './story/sample-shell-play.js';
import {
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
  WorkbenchSampleStoryShell,
  sampleWorkspaceWithOpenPaths,
  sampleWorkspaceWithoutOpenTabs,
} from './story/WorkbenchSampleStoryShell.js';

const meta = {
  title: 'React/Workbench/Integration/Sample Shell',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: {
      timeout: 60_000,
    },
    docs: {
      description: {
        component:
          'E2E-style integration stories that mirror the workbench-sample host (:5173) using WorkbenchProvider, virtual workspace bootstrap, and permission context keys — without the sample Vite app.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AuthenticatedWorkbench: Story = {
  name: 'Sample / Authenticated workbench',
  parameters: {
    docs: {
      description: {
        story:
          'Default sample layout after virtual workspace bootstrap: activity bar, explorer tree, and the showcase editor tab.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell />,
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    await expect(canvas.getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: SAMPLE_EXAMPLE_JDW_PATH })).toBeVisible();
    await expect(
      await canvas.findByRole('tab', { name: SAMPLE_EXAMPLE_JDW_PATH }, { timeout: 15_000 }),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toBeVisible();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const SettingsAppearance: Story = {
  name: 'Sample / Settings appearance',
  parameters: {
    docs: {
      description: {
        story: 'Opens the settings modal and verifies Appearance scheme and preset controls.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell />,
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    await openSettingsModal(canvas);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Appearance' }));
    await expect(within(dialog).getByRole('combobox', { name: 'Color scheme' })).toBeVisible();
    await expect(within(dialog).getByRole('combobox', { name: 'Light theme preset' })).toBeVisible();
    await expect(within(dialog).getByRole('combobox', { name: 'Dark theme preset' })).toBeVisible();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const PermissionOwnerActivityBar: Story = {
  name: 'Sample / Permission owner',
  parameters: {
    docs: {
      description: {
        story:
          'Owner permission context exposes search, commands, chat, and extensions activities — matching the sample administrator account.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell permissionRole="owner" />,
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    const labels = getPrimaryActivityLabels(canvas);

    await expect(labels).toEqual(
      expect.arrayContaining(['Explorer', 'Search', 'Commands', 'Extensions']),
    );
    await expect(canvas.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Extensions' })).toBeVisible();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const PermissionViewerActivityBar: Story = {
  name: 'Sample / Permission viewer',
  parameters: {
    docs: {
      description: {
        story:
          'Viewer permission context hides gated activities so only Explorer remains in the primary activity bar.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell permissionRole="viewer" />,
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    const labels = getPrimaryActivityLabels(canvas);

    await expect(labels).toEqual(['Explorer']);
    await expect(canvas.queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Extensions' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Settings' })).toBeNull();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const ExtensionsView: Story = {
  name: 'Sample / Extensions view',
  parameters: {
    docs: {
      description: {
        story: 'Switches to the extensions activity and verifies the installed extension catalog.',
      },
    },
  },
  render: () => (
    <WorkbenchSampleStoryShell
      permissionRole="owner"
      workspaceInit={sampleWorkspaceWithoutOpenTabs()}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Extensions' }));
    await expect(canvas.getByRole('button', { name: 'Extensions' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(await canvas.findByRole('button', { name: 'Installed' }));
    const installedList = await canvas.findByRole(
      'list',
      { name: 'Installed extensions' },
      { timeout: 15_000 },
    );
    await expect(installedList).toBeVisible();
    expect(within(installedList).getAllByText('Explorer').length).toBeGreaterThanOrEqual(1);
    expect(within(installedList).getAllByText('Search').length).toBeGreaterThanOrEqual(1);
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const ReadmeEditorPaneToggles: Story = {
  name: 'Sample / README editor toggles',
  parameters: {
    docs: {
      description: {
        story:
          'Opens README.md in the editor area and verifies Code / Preview toolbar toggles on the tab strip.',
      },
    },
  },
  render: () => (
    <WorkbenchSampleStoryShell workspaceInit={sampleWorkspaceWithOpenPaths([SAMPLE_README_PATH])} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = createSampleShellCanvas(canvasElement);

    await waitForSampleShellReady(canvas);
    await expect(
      await canvas.findByRole('tab', { name: SAMPLE_README_PATH }, { timeout: 15_000 }),
    ).toBeVisible();

    const toolbar = canvas.getByRole('toolbar', { name: 'Editor view mode' });
    await expect(within(toolbar).getByRole('button', { name: 'Code' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(within(toolbar).getByRole('button', { name: 'Preview' })).toBeVisible();

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Preview' }));
    await expect(within(toolbar).getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByLabelText('Preview')).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};
