import type { ReactNode } from 'react';
import {
  resolveActiveThemePreset,
  useResolvedWorkbenchTheme,
  WorkbenchThemeProvider,
  type DarkThemePresetId,
  type LightThemePresetId,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench';
import { WorkbenchAuthGate } from '@workbench-kit/react/workbench/auth';

import { SampleAccountProvider } from './sample-account-context.js';
import { useSampleAuth } from './useSampleAuth.js';

export interface SampleAuthShellProps {
  appearance: {
    darkPreset: DarkThemePresetId;
    lightPreset: LightThemePresetId;
    themePreference: WorkbenchColorSchemePreference;
  };
  children: ReactNode;
}

export function SampleAuthShell({ appearance, children }: SampleAuthShellProps) {
  const auth = useSampleAuth();
  const resolvedTheme = useResolvedWorkbenchTheme(appearance.themePreference);
  const activePreset = resolveActiveThemePreset(resolvedTheme, appearance);

  return (
    <WorkbenchThemeProvider
      className="ui-workbench-host-root"
      syncDocumentElement
      theme={resolvedTheme}
      themePreset={activePreset}
      themePreference={appearance.themePreference}
    >
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
            statusLabel:
              'The in-browser dummy backend accepts the demo account and returns fixed sample data.',
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
