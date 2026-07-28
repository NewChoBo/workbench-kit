import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { expectVisibleChatBubbleText } from '../../../packages/react/src/workbench/story/chatStory';
import {
  expectCollapsedPrimarySidebarShowsFullWidthSecondary,
  expectExpandedPrimarySidebar,
} from '../../../packages/react/src/workbench/story/shellStory';
import { App } from './App.js';
import { createSampleHost } from './createSampleHost.js';
import { createSampleInstalledExtensionsStorageKey } from './sample-installed-extension-storage.js';
import {
  expectEditorTabVisible,
  expectSampleFileVisible,
  expectTesterActivityLabels,
  getActivityLabels,
  selectPermissionRole,
  waitForLoginGate,
  waitForWorkbenchReady,
} from './storybook/play/sampleHostAssertions.js';
import {
  applyBasicPermissionScopeScenario,
  applyDevtoolsInspectorsScenario,
  applyHostInstallStateScenario,
  applyLoginGateScenario,
  applyLoginSubmitScenario,
  applySidebarToggleScenario,
  applyTesterDevAppJourneyScenario,
  applyTesterWorkbenchScenario,
  applyFieldRemapEditorScenario,
  applyExtensionsInstalledListScenario,
  applySettingsAppearanceScenario,
  applyCommandsActivityScenario,
} from './storybook/scenarios/index.js';
import './host.css';

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
  /** Sample integration plays: required CI gate + sample-only filter tag. */
  tags: ['storybook-play-required', 'storybook-play-sample'],
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoginGate: Story = {
  name: 'Login gate',
  render: () => {
    applyLoginGateScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for session bootstrap to settle before asserting — avoids test-runner
    // navigation retries when the gate remounts during "Checking sample session...".
    await waitForLoginGate(canvas);
    await expect(canvas.getByText('Workbench Sample')).toBeVisible();
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
};

export const LoginSubmitFlow: Story = {
  name: 'Login submit flow',
  render: () => {
    applyLoginSubmitScenario();
    return createSampleHost();
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
    expectTesterActivityLabels(canvas);
  },
};

export const TesterWorkbench: Story = {
  name: 'Tester workbench',
  render: () => {
    applyTesterWorkbenchScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toHaveTextContent('Workbench Kit');
    await expect(canvas.getByRole('button', { name: 'Open example' })).toBeVisible();

    expectTesterActivityLabels(canvas);
  },
};

export const DevtoolsInspectors: Story = {
  name: 'Devtools inspectors',
  render: () => {
    applyDevtoolsInspectorsScenario();
    return createSampleHost({ devtools: true });
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
};

export const HostInstallState: Story = {
  name: 'Host install state',
  render: () => {
    applyHostInstallStateScenario();
    return createSampleHost({ devtools: true });
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
};

export const TesterDevAppJourney: Story = {
  name: 'Tester dev app journey',
  render: () => {
    applyTesterDevAppJourneyScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByText('Workbench Sample')).toBeVisible();
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();
    await expectSampleFileVisible(canvas, 'showcase');
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
    const quickOpen = await canvas.findByRole('dialog', { name: /Quick Open/ });
    await expect(quickOpen).toBeVisible();
    const quickOpenSearch = within(quickOpen).getByLabelText('Search files by name');
    // Quick Open search uses pointer-events:none; drive input via focus + keyboard.
    quickOpenSearch.focus();
    await userEvent.keyboard('README');
    await waitFor(() => {
      expect(within(quickOpen).getByRole('listbox', { name: 'Quick Open results' })).toHaveTextContent(
        'README.md',
      );
    });
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'README.md');

    await userEvent.keyboard('{Control>}{Shift>}p{/Control}{/Shift}');
    const commandPalette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    await expect(commandPalette).toBeVisible();
    await userEvent.keyboard('{Escape}');

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
      expectTesterActivityLabels(canvas);
    });
    await userEvent.click(within(profileDialog).getByRole('button', { name: 'Sign out' }));
    await waitForLoginGate(canvas);
  },
};

export const BasicPermissionScope: Story = {
  name: 'Basic permission scope',
  render: () => {
    applyBasicPermissionScopeScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(getActivityLabels(canvas)).toEqual(['Explorer', 'Profile']);
    await expect(canvas.queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Settings' })).toBeNull();
  },
};

export const SidebarToggle: Story = {
  name: 'Sidebar toggle',
  render: () => {
    applySidebarToggleScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);

    const hideStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle(/Hide primary sidebar/));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
    });
    const hideDurationMs = performance.now() - hideStartedAt;

    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);
    expect(canvas.getByLabelText('Workspace Explorer')).not.toBeVisible();
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();

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
};

export const FieldRemapEditorSmoke: Story = {
  name: 'Field Remap editor smoke',
  render: () => {
    applyFieldRemapEditorScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Field Remap' }));

    const sampleList = await canvas.findByLabelText('Field remap samples');
    await expect(sampleList).toBeVisible();
    await userEvent.click(canvas.getByTestId('field-remap-open-nested-ab'));

    await expectEditorTabVisible(canvas, 'A → B');
    await waitFor(() => {
      expect(canvas.getByTestId('field-remap-editor-surface')).toBeVisible();
    });
    await expect(canvas.getByTestId('field-remap-demo')).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 2, name: 'A → B' })).toBeVisible();
    await expect(canvas.getByTestId('field-remap-result')).not.toHaveTextContent(/^$/);
    await expect(canvas.getByTestId('field-remap-result')).toHaveTextContent('Ada Lovelace');
  },
};

export const ExtensionsInstalledList: Story = {
  name: 'Extensions installed list',
  render: () => {
    applyExtensionsInstalledListScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Extensions' }));

    const listSwitcher = await canvas.findByLabelText('Extension lists');
    await userEvent.click(within(listSwitcher).getByRole('button', { name: 'Installed' }));

    const installedList = await canvas.findByLabelText('Installed extensions');
    await expect(installedList).toBeVisible();
    await expect(
      within(installedList).getByText('JSON Preview', {
        selector: '.workbench-extensions-sidebar__title',
      }),
    ).toBeVisible();
  },
};

export const SettingsAppearanceSmoke: Story = {
  name: 'Settings appearance smoke',
  render: () => {
    applySettingsAppearanceScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));

    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Appearance' }));
    await expect(
      within(settingsDialog).getByRole('combobox', { name: 'Color scheme' }),
    ).toBeVisible();
    await expect(within(settingsDialog).getByRole('heading', { name: 'Appearance' })).toBeVisible();
  },
};

export const CommandsActivitySmoke: Story = {
  name: 'Commands activity smoke',
  render: () => {
    applyCommandsActivityScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    await userEvent.click(within(activityBar).getByRole('button', { name: 'Commands' }));

    await expect(await canvas.findByLabelText('Filter commands')).toBeVisible();
  },
};
