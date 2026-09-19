import { StrictMode } from 'react';
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
