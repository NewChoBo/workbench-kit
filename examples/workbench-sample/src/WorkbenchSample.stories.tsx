import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
} from '@workbench-kit/shell-react';

import { expectVisibleChatBubbleText } from '../../../packages/react/src/workbench/story/chatStory';
import {
  expectCollapsedPrimarySidebarShowsFullWidthSecondary,
  expectExpandedPrimarySidebar,
} from '../../../packages/react/src/workbench/story/shellStory';
import { App } from './App.js';
import { SAMPLE_AUTH_SESSION_KEY, SAMPLE_AUTH_USERNAME } from './dummy-backend/index.js';
import { createSampleInstalledExtensionsStorageKey } from './sample-installed-extension-storage.js';
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

export const DevtoolsInspectors: Story = {
  name: 'Devtools inspectors',
  render: () => {
    resetSampleHostStorage('tester');
    return <App devtools />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    const devtools = await canvas.findByLabelText('Workbench devtools');
    const devtoolsScope = within(devtools);
    await expect(devtoolsScope.getByText('Workbench Devtools')).toBeVisible();
    await expect(devtoolsScope.getByText('Read-only')).toBeVisible();
    await expect(devtoolsScope.getByRole('button', { name: 'Commands' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(devtools).toHaveTextContent('workbench-kit.builtin.settings.open');
    await expect(devtools).toHaveTextContent('workspace.open');

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Transactions' }));
    await expect(devtools).toHaveTextContent('Initialize workspace');

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Layout' }));
    await expect(devtools).toHaveTextContent('"activeViewContainer": "explorer"');

    await userEvent.click(canvas.getByRole('button', { name: 'Open example' }));
    await expectEditorTabVisible(canvas, 'example.jdw.json');
    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Editor' }));
    await expect(devtools).toHaveTextContent('example.jdw.json');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Capabilities' }));
    await expect(devtools).toHaveTextContent('workbench-kit.builtin.settings');
    await expect(devtools).toHaveTextContent('workbench.settings');
  },
  tags: ['storybook-play-required'],
};

export const HostInstallState: Story = {
  name: 'Host install state',
  render: () => {
    resetSampleHostStorage('tester');
    seedSampleInstalledExtension('tester', {
      category: 'editor',
      enabled: true,
      id: 'workbench-kit.samples.json-preview',
      installedAt: '2026-06-25T00:00:00.000Z',
      manifestUrl: 'workbench-kit.samples.json-preview',
    });
    return <App devtools />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    const devtools = await canvas.findByLabelText('Workbench devtools');
    const devtoolsScope = within(devtools);

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Capabilities' }));
    await expect(devtools).toHaveTextContent('workbench-kit.samples.json-preview');
    expect(
      window.localStorage.getItem(createSampleInstalledExtensionsStorageKey('tester')),
    ).toContain('workbench-kit.samples.json-preview');
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
    const searchPanel = await canvas.findByLabelText('Workspace Search');
    await expect(searchPanel).toBeVisible();
    const searchScope = within(searchPanel);
    const searchInput = searchScope.getByLabelText('Search workspace');
    await userEvent.type(searchInput, 'button');
    await waitFor(() => {
      expect(searchScope.getByRole('list', { name: 'Search results' })).toHaveTextContent(
        'Button.tsx',
      );
    });
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'Button.tsx');

    await userEvent.keyboard('{Control>}p{/Control}');
    const commandPalette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    await expect(commandPalette).toBeVisible();
    await userEvent.type(within(commandPalette).getByLabelText('Search commands'), 'Open README');
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'README.md');

    await userEvent.click(canvas.getByRole('button', { name: 'Chat' }));
    await expectVisibleChatBubbleText(canvas, 'Share updates here while working in the workspace.');

    const chatComposer = canvas.getByPlaceholderText('Message your team');
    await userEvent.type(chatComposer, 'Storybook chat smoke');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Storybook chat smoke');
    await expect(chatComposer).toHaveValue('');

    await userEvent.type(chatComposer, 'Follow-up from Storybook');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Follow-up from Storybook');

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

export const SidebarToggle: Story = {
  name: 'Sidebar toggle',
  render: () => {
    resetSampleHostStorage('tester');
    return <App />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);

    const hideStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle('Hide primary sidebar'));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
    });
    const hideDurationMs = performance.now() - hideStartedAt;

    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);
    expect(canvas.getByLabelText('Workspace Explorer')).not.toBeVisible();
    await waitFor(() => {
      expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    });

    const showStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle('Show primary sidebar'));
    await waitFor(() => {
      expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    });
    const showDurationMs = performance.now() - showStartedAt;

    expectExpandedPrimarySidebar(canvasElement);
    expect(hideDurationMs).toBeLessThan(2_000);
    expect(showDurationMs).toBeLessThan(2_000);
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
  for (const storageAccount of ['anonymous', 'tester', 'basic']) {
    window.localStorage.removeItem(createSampleInstalledExtensionsStorageKey(storageAccount));
  }

  if (account === 'none') {
    window.sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(
    SAMPLE_AUTH_SESSION_KEY,
    account === 'tester' ? SAMPLE_AUTH_USERNAME : 'basic',
  );
}

function seedSampleInstalledExtension(
  account: Exclude<SampleAccount, 'none'>,
  record: {
    readonly category: string;
    readonly enabled: boolean;
    readonly id: string;
    readonly installedAt: string;
    readonly manifestUrl: string;
  },
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    createSampleInstalledExtensionsStorageKey(account),
    JSON.stringify([record], null, 2),
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
