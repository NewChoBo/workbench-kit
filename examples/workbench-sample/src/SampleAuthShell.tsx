import type { ReactNode } from 'react';
import { WorkbenchAuthGate } from '@workbench-kit/react/workbench/auth';
import { WorkbenchThemeProvider } from '@workbench-kit/react/workbench';
import { SampleAccountProvider } from './sample-account-context.js';
import { useSampleAuth } from './useSampleAuth.js';

export interface SampleAuthShellProps {
  children: ReactNode;
  theme: 'dark' | 'light';
}

export function SampleAuthShell({ children, theme }: SampleAuthShellProps) {
  const auth = useSampleAuth();

  return (
    <WorkbenchThemeProvider className="ui-workbench-host-root" syncDocumentElement theme={theme}>
      <SampleAccountProvider value={auth}>
        <WorkbenchAuthGate
          authStatus={auth.status}
          loadingLabel="Checking sample session..."
          loginViewProps={{
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
      </SampleAccountProvider>
    </WorkbenchThemeProvider>
  );
}
