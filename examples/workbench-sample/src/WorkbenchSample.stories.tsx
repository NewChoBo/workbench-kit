import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
} from '@workbench-kit/shell-react';

import { App } from './App.js';
import { SAMPLE_AUTH_SESSION_KEY, SAMPLE_AUTH_USERNAME } from './dummy-backend/index.js';
import { SAMPLE_PERMISSION_ROLE_STORAGE_KEY } from './sample-permission-role-storage.js';
import './host.css';

type SampleAccount = 'none' | 'tester' | 'basic';

const meta = {
  title: 'Workbench Sample/Dev App',
  component: App,
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: {
      timeout: 60_000,
    },
  },
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;
type StoryCanvas = ReturnType<typeof within>;

export const LoginGate: Story = {
  name: 'Login gate',
  render: () => {
    resetSampleHostStorage('none');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Workbench Sample')).toBeVisible();
    await expect(canvas.getByLabelText('Username')).toHaveAttribute(
      'placeholder',
      'tester or basic',
    );
    await expect(canvas.getByLabelText('Password')).toHaveAttribute(
      'placeholder',
      'Enter password',
    );
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(canvas.getByText(/Administrator: tester\/tester/)).toBeVisible();
  },
  tags: ['storybook-play-required'],
};

export const LoginSubmitFlow: Story = {
  name: 'Login submit flow',
  render: () => {
    resetSampleHostStorage('none');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForLoginGate(canvas);

    const username = canvas.getByLabelText('Username');
    const password = canvas.getByLabelText('Password');
    const signIn = canvas.getByRole('button', { name: 'Sign in' });

    await userEvent.type(username, 'wrong');
    await userEvent.type(password, 'wrong');
    await userEvent.click(signIn);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    );

    await userEvent.clear(username);
    await userEvent.clear(password);
    await userEvent.type(username, 'tester');
    await userEvent.type(password, 'tester');
    await userEvent.click(signIn);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Open example' })).toBeVisible();
    expect(getActivityLabels(canvas)).toEqual([
      'Explorer',
      'Search',
      'Commands',
      'Chat',
      'AI Chat',
      'Extensions',
      'Profile',
      'Settings',
    ]);
  },
  tags: ['storybook-play-required'],
};

export const TesterWorkbench: Story = {
  name: 'Tester workbench',
  render: () => {
    resetSampleHostStorage('tester');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toHaveTextContent('Workbench Kit');
    await expect(canvas.getByRole('button', { name: 'Open example' })).toBeVisible();

    expect(getActivityLabels(canvas)).toEqual([
      'Explorer',
      'Search',
      'Commands',
      'Chat',
      'AI Chat',
      'Extensions',
      'Profile',
      'Settings',
    ]);
  },
  tags: ['storybook-play-required'],
};

export const TesterDevAppJourney: Story = {
  name: 'Tester dev app journey',
  render: () => {
    resetSampleHostStorage('tester');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByText('Workbench Sample')).toBeVisible();
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();
    await expectSampleFileVisible(canvas, 'example.jdw.json');
    await userEvent.click(canvas.getByRole('button', { name: 'Open example' }));
    await expectEditorTabVisible(canvas, 'example.jdw.json');

    await userEvent.click(canvas.getByRole('button', { name: 'Search' }));
    await expect(await canvas.findByLabelText('Workspace Search')).toBeVisible();
    const searchInput = canvas.getByLabelText('Search workspace');
    await userEvent.type(searchInput, 'button');
    await expect(await canvas.findByText('1 result')).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'Button.tsx');

    await userEvent.keyboard('{Control>}p{/Control}');
    const commandPalette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    await expect(commandPalette).toBeVisible();
    await userEvent.type(within(commandPalette).getByLabelText('Search commands'), 'Open README');
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'README.md');

    await userEvent.click(canvas.getByRole('button', { name: 'Chat' }));
    await expect(
      await canvas.findByText('Share updates here while working in the workspace.'),
    ).toBeVisible();
    await userEvent.type(canvas.getByPlaceholderText('Message your team'), 'Storybook chat smoke');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(await canvas.findByText('Storybook chat smoke')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'AI Chat' }));
    const aiChatInput = await canvas.findByPlaceholderText('Ask about this workspace');
    await expect(aiChatInput).toBeVisible();
    await userEvent.type(aiChatInput, 'show explorer');
    await expect(aiChatInput).toHaveValue('show explorer');
    const aiComposer = aiChatInput.closest('.composer');
    expect(aiComposer).not.toBeNull();
    await expect(
      within(aiComposer as HTMLElement).getByRole('button', { name: 'Show commands' }),
    ).toBeVisible();
    await userEvent.clear(aiChatInput);
    await expect(aiChatInput).toHaveValue('');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Linked Accounts' }));
    await expect(within(settingsDialog).getByText('GitHub Project Access')).toBeVisible();
    await expect(within(settingsDialog).getByText('CI Package Registry')).toBeVisible();
    await userEvent.click(
      within(settingsDialog).getByRole('button', { name: 'Permissions (demo)' }),
    );
    await expect(
      within(settingsDialog).getByRole('combobox', { name: 'Permission role (demo)' }),
    ).toHaveTextContent('Use sign-in role');
    await expect(within(settingsDialog).getByText(/Effective role: Owner/)).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Profile' }));
    const profileDialog = await canvas.findByRole('dialog', { name: /Profile/ });
    await expect(within(profileDialog).getByText('tester@workbench-sample.local')).toBeVisible();
    await selectPermissionRole(profileDialog, 'Viewer');
    await waitFor(() => {
      expect(getActivityLabels(canvas)).toEqual(['Explorer', 'Profile']);
    });
    await selectPermissionRole(profileDialog, 'Owner');
    await waitFor(() => {
      expect(getActivityLabels(canvas)).toEqual([
        'Explorer',
        'Search',
        'Commands',
        'Chat',
        'AI Chat',
        'Extensions',
        'Profile',
        'Settings',
      ]);
    });
    await userEvent.click(within(profileDialog).getByRole('button', { name: 'Sign out' }));
    await waitForLoginGate(canvas);
  },
  tags: ['storybook-play-required'],
};

export const BasicPermissionScope: Story = {
  name: 'Basic permission scope',
  render: () => {
    resetSampleHostStorage('basic');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(getActivityLabels(canvas)).toEqual(['Explorer', 'Profile']);
    await expect(canvas.queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Settings' })).toBeNull();
  },
  tags: ['storybook-play-required'],
};

function resetSampleHostStorage(account: SampleAccount) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY);
  window.localStorage.removeItem(DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY);
  window.localStorage.removeItem(SAMPLE_PERMISSION_ROLE_STORAGE_KEY);

  if (account === 'none') {
    window.sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(
    SAMPLE_AUTH_SESSION_KEY,
    account === 'tester' ? SAMPLE_AUTH_USERNAME : 'basic',
  );
}

async function waitForLoginGate(canvas: StoryCanvas) {
  await canvas.findByLabelText('Username', {}, { timeout: 60_000 });
  await canvas.findByLabelText('Password', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText('Checking sample session...')).toBeNull();
  });
}

async function waitForWorkbenchReady(canvas: StoryCanvas) {
  await canvas.findByRole('navigation', { name: 'Activity bar' }, { timeout: 60_000 });
  await canvas.findByLabelText('Workspace Explorer', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText(/Checking sample session|Preparing workbench/)).toBeNull();
  });
}

async function expectEditorTabVisible(canvas: StoryCanvas, fileName: string) {
  await expect(
    await canvas.findByRole('tab', { name: new RegExp(escapeRegExp(fileName)) }),
  ).toBeVisible();
}

async function expectSampleFileVisible(canvas: StoryCanvas, fileName: string) {
  await waitFor(() => {
    const fileLabels = canvas.getAllByText(fileName);
    expect(fileLabels.length).toBeGreaterThanOrEqual(1);
    for (const fileLabel of fileLabels) {
      expect(fileLabel).toBeVisible();
    }
  });
}

function getActivityLabels(canvas: StoryCanvas): string[] {
  const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
  return within(activityBar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
    .filter((label): label is string => Boolean(label));
}

async function selectPermissionRole(scope: HTMLElement, optionName: string) {
  const roleSelect = within(scope).getByRole('combobox', { name: 'Permission role (demo)' });

  await userEvent.click(roleSelect);
  await userEvent.click(await within(document.body).findByRole('option', { name: optionName }));
  await expect(roleSelect).toHaveTextContent(optionName);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
