import type { ReactNode } from 'react';
import { WorkbenchAuthGate } from '@workbench-kit/react/workbench/auth';
import { WorkbenchLoginBrandMark } from '@workbench-kit/react';
import { useSampleAuth } from './useSampleAuth.js';

export interface SampleAuthShellProps {
  children: ReactNode;
  theme: 'dark' | 'light';
}

export function SampleAuthShell({ children, theme }: SampleAuthShellProps) {
  const auth = useSampleAuth();

  return (
    <div data-theme={theme}>
      <WorkbenchAuthGate
        authStatus={auth.status}
        loadingLabel="Checking sample session..."
        loginViewProps={{
          brandMark: <WorkbenchLoginBrandMark />,
          busy: auth.busy,
          busyLabel: 'Signing in...',
          defaultIdentifier: '',
          error: auth.error,
          footerBrand: 'Workbench Kit Sample',
          identifierLabel: 'Username',
          identifierPlaceholder: 'tester',
          loginLabel: 'Sign in to Workbench Sample',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Enter password',
          productName: 'Workbench Sample',
          requireCredentials: true,
          statusLabel: 'Use the demo account to open the virtual workspace.',
          submitLabel: 'Sign in',
          onSubmit: auth.signIn,
        }}
      >
        {children}
      </WorkbenchAuthGate>
    </div>
  );
}
