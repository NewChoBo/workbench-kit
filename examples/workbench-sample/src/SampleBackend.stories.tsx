import { StrictMode, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SampleBackendLab } from './testing/SampleBackendLab.js';
import { resetSampleHostStorage } from './storybook/fixtures/sampleHostStorage.js';
import { waitForLoginGate, waitForWorkbenchReady } from './storybook/play/sampleHostAssertions.js';
import './host.css';

const meta = {
  title: 'Workbench Sample/Backend Scenarios',
  component: SampleBackendLab,
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: { timeout: 60_000 },
  },
  tags: ['storybook-play-required', 'storybook-play-sample', 'storybook-play-backend'],
  beforeEach: () => {
    resetSampleHostStorage('none');
  },
  render: (args) => (
    <StrictMode>
      <SampleBackendLab {...args} />
    </StrictMode>
  ),
} satisfies Meta<typeof SampleBackendLab>;
export default meta;
type Story = StoryObj<typeof meta>;

async function fillCredentials(canvas: ReturnType<typeof within>) {
  await waitForLoginGate(canvas);
  await userEvent.type(canvas.getByLabelText('Username'), 'tester');
  await userEvent.type(canvas.getByLabelText('Password'), 'tester');
}

export const ControlledLoading: Story = {
  args: { initialScenario: 'slow-session' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Checking sample session...')).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Release response' })).toBeEnabled(),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Release response' }));
    await waitForLoginGate(canvas);
    await userEvent.selectOptions(canvas.getByLabelText('Scenario'), 'slow-sign-in');
    await fillCredentials(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByRole('button', { name: 'Signing in...' })).toBeDisabled();
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-in: 1');
    await userEvent.click(canvas.getByRole('button', { name: 'Release response' }));
    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset scenario' }));
    await waitForLoginGate(canvas);
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-in: 0');
    await fillCredentials(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByRole('button', { name: 'Signing in...' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Reset scenario' }));
    await waitForLoginGate(canvas);
    await expect(canvas.getByLabelText('Username')).toHaveValue('');
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Pending: 0');
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-in: 0');
    await expect(canvas.getByRole('button', { name: 'Release response' })).toBeDisabled();
  },
};

export const LoginRetry: Story = {
  args: { initialScenario: 'sign-in-retry' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillCredentials(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Unable to reach the sample host backend.',
    );
    await expect(canvas.getByLabelText('Username')).toHaveValue('tester');
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-in: 2');
  },
};

export const SignOutRetry: Story = {
  args: { initialScenario: 'sign-out-retry' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Profile' }));
    const profile = within(await canvas.findByRole('dialog', { name: /Profile/ }));
    await userEvent.click(profile.getByRole('button', { name: 'Sign out' }));
    await expect(await profile.findByRole('alert')).toHaveTextContent(
      'Sign-out failed. Your session is still active. Try again.',
    );
    await expect(profile.getByText('tester@workbench-sample.local')).toBeVisible();
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-out: 1');
    await userEvent.click(profile.getByRole('button', { name: 'Sign out' }));
    await waitForLoginGate(canvas);
    await expect(canvas.getByLabelText('Backend activity')).toHaveTextContent('Sign-out: 2');
  },
};

export const LinkedAccountData: Story = {
  args: { initialScenario: 'empty-accounts' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const scenario of ['empty-accounts', 'one-account', 'many-accounts']) {
      await userEvent.selectOptions(canvas.getByLabelText('Scenario'), scenario);
      await waitForWorkbenchReady(canvas);
      await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
      const settings = within(await canvas.findByRole('dialog', { name: /Settings/ }));
      await userEvent.click(settings.getByRole('button', { name: 'Linked Accounts' }));
      if (scenario === 'empty-accounts') {
        await expect(
          await settings.findByText('No linked project accounts are configured.'),
        ).toBeVisible();
      } else if (scenario === 'one-account') {
        await expect(await settings.findByText('GitHub Project Access')).toBeVisible();
        expect(settings.queryByText('CI Package Registry')).toBeNull();
      } else {
        await waitFor(() =>
          expect(
            settings.getAllByText(/Research workspace — multilingual collaboration/),
          ).toHaveLength(24),
        );
      }
      await userEvent.click(settings.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());
    }
  },
};

export const SessionFailures: Story = {
  args: { initialScenario: 'invalid-response' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const scenario of ['invalid-response', 'expired-session']) {
      await userEvent.selectOptions(canvas.getByLabelText('Scenario'), scenario);
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        scenario === 'invalid-response'
          ? 'Session payload must include a valid status.'
          : 'Your sample session expired. Sign in again.',
      );
      await fillCredentials(canvas);
      await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
      await waitForWorkbenchReady(canvas);
    }
  },
};

function ResizableSampleHost() {
  const [width, setWidth] = useState(1280);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
      <div>
        <button type="button" onClick={() => setWidth(430)}>
          Narrow host
        </button>
        <button type="button" onClick={() => setWidth(1280)}>
          Wide host
        </button>
      </div>
      <div
        data-testid="resizable-sample-host"
        style={{ width, maxWidth: '100%', flex: 1, minHeight: 0 }}
      >
        <StrictMode>
          <SampleBackendLab initialScenario="many-accounts" />
        </StrictMode>
      </div>
    </div>
  );
}

export const ViewportResize: Story = {
  render: () => <ResizableSampleHost />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const dialog = await canvas.findByRole('dialog', { name: /Settings/ });
    const settings = within(dialog);
    await userEvent.click(settings.getByRole('button', { name: 'Linked Accounts' }));
    await waitFor(() =>
      expect(settings.getAllByText(/Research workspace — multilingual collaboration/)).toHaveLength(
        24,
      ),
    );
    await waitFor(() => expect(dialog.getBoundingClientRect().width).toBeGreaterThan(430));
    const originalIds = settings
      .getAllByText(/^integration-\d{2}-longidentifier/)
      .map((id) => id.textContent);
    const search = settings.getByPlaceholderText('Search settings');
    await userEvent.type(search, 'linked');
    await userEvent.click(canvas.getByRole('button', { name: 'Narrow host' }));
    const assertContained = () => {
      const host = dialog.closest('.ide-workbench-overlays')!.getBoundingClientRect();
      const outerHost = canvas.getByTestId('resizable-sample-host').getBoundingClientRect();
      const frame = dialog.getBoundingClientRect();
      const close = settings.getByRole('button', { name: 'Close' }).getBoundingClientRect();
      expect(host.right).toBeLessThanOrEqual(outerHost.right);
      expect(frame.left).toBeGreaterThanOrEqual(host.left);
      expect(frame.top).toBeGreaterThanOrEqual(host.top);
      expect(frame.right).toBeLessThanOrEqual(host.right + 0.5);
      expect(frame.bottom).toBeLessThanOrEqual(host.bottom + 0.5);
      expect(close.right).toBeLessThanOrEqual(host.right);
      expect(close.bottom).toBeLessThanOrEqual(host.bottom);
    };
    await waitFor(assertContained);
    expect(canvas.getByTestId('resizable-sample-host').getBoundingClientRect().width).toBe(430);
    expect(canvas.getByRole('dialog', { name: /Settings/ })).toBe(dialog);
    expect(settings.getByPlaceholderText('Search settings')).toBe(search);
    await expect(search).toHaveValue('linked');
    const longIds = settings.getAllByText(/^integration-\d{2}-longidentifier/);
    expect(longIds).toHaveLength(24);
    expect(longIds.map((id) => id.textContent)).toEqual(originalIds);
    for (const id of longIds) {
      const card = id.closest('article')!;
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      expect(id.getBoundingClientRect().right).toBeLessThanOrEqual(
        card.getBoundingClientRect().right,
      );
    }
    const narrowWidth = dialog.getBoundingClientRect().width;
    await userEvent.click(canvas.getByRole('button', { name: 'Wide host' }));
    await waitFor(() =>
      expect(
        canvas.getByTestId('resizable-sample-host').getBoundingClientRect().width,
      ).toBeGreaterThan(430),
    );
    await waitFor(assertContained);
    expect(dialog.getBoundingClientRect().width).toBe(narrowWidth);
    await userEvent.click(settings.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());
  },
};
