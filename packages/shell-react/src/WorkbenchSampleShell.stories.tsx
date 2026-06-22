import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
  sampleVirtualWorkspace,
  WorkbenchSampleStoryShell,
} from './story/WorkbenchSampleStoryShell.js';

const meta = {
  title: 'React/Workbench/Integration/Sample Shell',
  parameters: {
    layout: 'fullscreen',
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

async function waitForSampleShellReady(canvas: ReturnType<typeof within>) {
  await waitFor(
    () => {
      expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    },
    { timeout: 60_000 },
  );
  await canvas.findByLabelText('Workspace Explorer', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText('Preparing workbench')).toBeNull();
  });
}

function getPrimaryActivityLabels(canvas: ReturnType<typeof within>): string[] {
  const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
  return within(activityBar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
    .filter((label): label is string => Boolean(label));
}

async function openSettingsModal(canvas: ReturnType<typeof within>) {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Settings' }, { timeout: 30_000 }),
  );
  await waitFor(
    async () => {
      expect(screen.getByRole('dialog')).toBeVisible();
    },
    { timeout: 30_000 },
  );
}

export const AuthenticatedWorkbench: Story = {
  name: 'Sample / Authenticated workbench',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Default sample layout after virtual workspace bootstrap: activity bar, explorer tree, and the showcase editor tab.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

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
  tags: ['storybook-play-baseline'],
};

export const SettingsAppearance: Story = {
  name: 'Sample / Settings appearance',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story: 'Opens the settings modal and verifies Appearance scheme and preset controls.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForSampleShellReady(canvas);
    await openSettingsModal(canvas);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Appearance' }));
    await expect(within(dialog).getByRole('combobox', { name: 'Color scheme' })).toBeVisible();
    await expect(within(dialog).getByRole('combobox', { name: 'Light theme preset' })).toBeVisible();
    await expect(within(dialog).getByRole('combobox', { name: 'Dark theme preset' })).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const PermissionOwnerActivityBar: Story = {
  name: 'Sample / Permission owner',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Owner permission context exposes search, commands, chat, and extensions activities — matching the sample administrator account.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell permissionRole="owner" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForSampleShellReady(canvas);
    const labels = getPrimaryActivityLabels(canvas);

    await expect(labels).toEqual(
      expect.arrayContaining(['Explorer', 'Search', 'Commands', 'Extensions']),
    );
    await expect(canvas.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Extensions' })).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const PermissionViewerActivityBar: Story = {
  name: 'Sample / Permission viewer',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Viewer permission context hides gated activities so only Explorer remains in the primary activity bar.',
      },
    },
  },
  render: () => <WorkbenchSampleStoryShell permissionRole="viewer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForSampleShellReady(canvas);
    const labels = getPrimaryActivityLabels(canvas);

    await expect(labels).toEqual(['Explorer']);
    await expect(canvas.queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Extensions' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Settings' })).toBeNull();
  },
  tags: ['storybook-play-baseline'],
};

export const ExtensionsView: Story = {
  name: 'Sample / Extensions view',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story: 'Switches to the extensions activity and verifies the installed extension catalog.',
      },
    },
  },
  render: () => (
    <WorkbenchSampleStoryShell
      permissionRole="owner"
      workspaceInit={{
        ...sampleVirtualWorkspace,
        openPaths: [],
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

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
  tags: ['storybook-play-baseline'],
};

export const ReadmeEditorPaneToggles: Story = {
  name: 'Sample / README editor toggles',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Opens README.md in the editor area and verifies Code / Preview toolbar toggles on the tab strip.',
      },
    },
  },
  render: () => (
    <WorkbenchSampleStoryShell
      workspaceInit={{
        ...sampleVirtualWorkspace,
        openPaths: [SAMPLE_README_PATH],
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

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
