import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { WorkbenchAuthGate } from './WorkbenchAuthGate';
import type { WorkbenchAuthStatus } from './WorkbenchAuthGate';
import {
  WorkbenchLoginView,
  WorkbenchPasswordResetView,
  WorkbenchSignUpView,
} from './WorkbenchLoginView';

const meta = {
  title: 'React/Workbench/Auth',
  component: WorkbenchLoginView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WorkbenchLoginView>;

export default meta;

type Story = StoryObj<typeof meta>;
type AuthStoryMode = 'sign-in' | 'sign-up' | 'password-reset';

function SignInHarness() {
  const [status, setStatus] = useState('Use your workspace account to continue.');

  return (
    <div data-theme="light">
      <WorkbenchLoginView
        {...getAuthStoryBrandProps()}
        actions={
          <AuthStoryLink onClick={() => setStatus('Password recovery selected.')}>
            Forgot password?
          </AuthStoryLink>
        }
        identifierPlaceholder="name@example.com"
        passwordPlaceholder="Enter password"
        secondaryActions={
          <>
            New to this workspace? <AuthStoryLink>Create account</AuthStoryLink>
          </>
        }
        statusLabel={status}
        onSubmit={({ credentials }) => setStatus(`Sign-in requested for ${credentials.identifier}`)}
      />
    </div>
  );
}

function SignUpHarness() {
  const [status, setStatus] = useState('Create an account for this workspace.');

  return (
    <div data-theme="light">
      <WorkbenchSignUpView
        {...getAuthStoryBrandProps()}
        displayNamePlaceholder="Jane Operator"
        identifierPlaceholder="name@example.com"
        passwordConfirmationPlaceholder="Repeat password"
        passwordPlaceholder="Create password"
        secondaryActions={
          <>
            Already have an account? <AuthStoryLink>Sign in</AuthStoryLink>
          </>
        }
        statusLabel={status}
        onSubmit={({ credentials }) =>
          setStatus(`Account creation requested for ${credentials.identifier}`)
        }
      />
    </div>
  );
}

function PasswordResetHarness() {
  const [status, setStatus] = useState('Enter your email and we will send reset instructions.');

  return (
    <div data-theme="light">
      <WorkbenchPasswordResetView
        {...getAuthStoryBrandProps()}
        identifierPlaceholder="name@example.com"
        secondaryActions={
          <>
            Remembered it? <AuthStoryLink>Sign in</AuthStoryLink>
          </>
        }
        statusLabel={status}
        onSubmit={({ credentials }) =>
          setStatus(`Reset instructions requested for ${credentials.identifier}`)
        }
      />
    </div>
  );
}

function AccountAccessSetHarness() {
  const [mode, setMode] = useState<AuthStoryMode>('sign-in');
  const [status, setStatus] = useState('Use your workspace account to continue.');

  if (mode === 'sign-up') {
    return (
      <div data-theme="light">
        <WorkbenchSignUpView
          {...getAuthStoryBrandProps()}
          displayNamePlaceholder="Jane Operator"
          identifierPlaceholder="name@example.com"
          passwordConfirmationPlaceholder="Repeat password"
          passwordPlaceholder="Create password"
          secondaryActions={
            <>
              Already have an account?{' '}
              <AuthStoryLink onClick={() => setMode('sign-in')}>Sign in</AuthStoryLink>
            </>
          }
          statusLabel="Create an account for this workspace."
          onSubmit={({ credentials }) => {
            setStatus(`Account creation requested for ${credentials.identifier}`);
            setMode('sign-in');
          }}
        />
      </div>
    );
  }

  if (mode === 'password-reset') {
    return (
      <div data-theme="light">
        <WorkbenchPasswordResetView
          {...getAuthStoryBrandProps()}
          identifierPlaceholder="name@example.com"
          secondaryActions={
            <>
              Remembered it?{' '}
              <AuthStoryLink onClick={() => setMode('sign-in')}>Sign in</AuthStoryLink>
            </>
          }
          statusLabel="Enter your email and we will send reset instructions."
          onSubmit={({ credentials }) => {
            setStatus(`Reset instructions requested for ${credentials.identifier}`);
            setMode('sign-in');
          }}
        />
      </div>
    );
  }

  return (
    <div data-theme="light">
      <WorkbenchLoginView
        {...getAuthStoryBrandProps()}
        actions={
          <AuthStoryLink onClick={() => setMode('password-reset')}>Forgot password?</AuthStoryLink>
        }
        identifierPlaceholder="name@example.com"
        passwordPlaceholder="Enter password"
        secondaryActions={
          <>
            New to this workspace?{' '}
            <AuthStoryLink onClick={() => setMode('sign-up')}>Create account</AuthStoryLink>
          </>
        }
        statusLabel={status}
        onSubmit={({ credentials }) => setStatus(`Sign-in requested for ${credentials.identifier}`)}
      />
    </div>
  );
}

function ProtectedAccessHarness() {
  const [authStatus, setAuthStatus] = useState<WorkbenchAuthStatus>('unauthenticated');

  return (
    <div data-theme="light">
      <WorkbenchAuthGate
        authStatus={authStatus}
        loginViewProps={{
          ...getAuthStoryBrandProps(),
          actions: <AuthStoryLink>Forgot password?</AuthStoryLink>,
          identifierPlaceholder: 'name@example.com',
          passwordPlaceholder: 'Enter password',
          secondaryActions: (
            <>
              New to this workspace? <AuthStoryLink>Create account</AuthStoryLink>
            </>
          ),
          statusLabel: 'Use your workspace account to continue.',
          onSubmit: () => setAuthStatus('authenticated'),
        }}
      >
        <main
          className="workbench-story-shell"
          style={{
            minHeight: '100vh',
            display: 'grid',
            alignContent: 'center',
            justifyItems: 'center',
            gap: 16,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
        >
          <Badge>Authenticated</Badge>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 600, letterSpacing: 0 }}>
            Protected workspace
          </h1>
          <Button onClick={() => setAuthStatus('expired')}>Expire session</Button>
        </main>
      </WorkbenchAuthGate>
    </div>
  );
}

export const SignIn: Story = {
  render: () => <SignInHarness />,
};

export const SignUp: Story = {
  render: () => <SignUpHarness />,
};

export const FindPassword: Story = {
  render: () => <PasswordResetHarness />,
};

export const AccountAccessSet: Story = {
  render: () => <AccountAccessSetHarness />,
};

export const ProtectedAccessFlow: Story = {
  render: () => <ProtectedAccessHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'operator@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'secret');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(canvas.getByRole('heading', { name: 'Protected workspace' })).toBeVisible();
    });
  },
};

export const ExpiredSession: Story = {
  render: () => (
    <div data-theme="light">
      <WorkbenchAuthGate
        authStatus="expired"
        loginViewProps={{
          ...getAuthStoryBrandProps(),
          identifierPlaceholder: 'name@example.com',
          passwordPlaceholder: 'Enter password',
        }}
      >
        <main>Protected workspace</main>
      </WorkbenchAuthGate>
    </div>
  ),
};

function getAuthStoryBrandProps() {
  return {
    brandMark: <AuthStoryBrand />,
    footerBrand: 'Secure workspace access',
  };
}

function AuthStoryBrand() {
  return (
    <div className="workbench-auth-story-brand">
      <span className="workbench-auth-story-brand__icon" aria-hidden>
        <i className="codicon codicon-lock" />
      </span>
      <div className="workbench-auth-story-brand__copy">
        <strong>Workbench Kit</strong>
        <span>Account access</span>
      </div>
    </div>
  );
}

function AuthStoryLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button className="workbench-auth-story-link" type="button" onClick={onClick}>
      {children}
    </button>
  );
}
