import { useCallback, useEffect, useState } from 'react';
import type { WorkbenchLoginSubmitContext } from '@workbench-kit/react';
import type { WorkbenchAuthStatus } from '@workbench-kit/react/workbench/auth';
import {
  clearSampleAuthSession,
  readSampleAuthSession,
  validateSampleLogin,
  writeSampleAuthSession,
} from './sample-auth.js';

const SAMPLE_SESSION_CHECK_MS = 350;
const SAMPLE_SIGN_IN_DELAY_MS = 450;

export interface SampleAuthController {
  busy: boolean;
  error: string | undefined;
  signIn: (context: WorkbenchLoginSubmitContext) => void;
  signOut: () => void;
  status: WorkbenchAuthStatus;
}

export function useSampleAuth(): SampleAuthController {
  const [status, setStatus] = useState<WorkbenchAuthStatus>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStatus(readSampleAuthSession() ? 'authenticated' : 'unauthenticated');
    }, SAMPLE_SESSION_CHECK_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  const signIn = useCallback(({ credentials }: WorkbenchLoginSubmitContext) => {
    setError(undefined);
    setBusy(true);

    window.setTimeout(() => {
      if (validateSampleLogin(credentials.identifier, credentials.password)) {
        writeSampleAuthSession();
        setBusy(false);
        setStatus('authenticated');
        return;
      }

      setBusy(false);
      setError('Invalid username or password.');
    }, SAMPLE_SIGN_IN_DELAY_MS);
  }, []);

  const signOut = useCallback(() => {
    clearSampleAuthSession();
    setBusy(false);
    setError(undefined);
    setStatus('unauthenticated');
  }, []);

  return {
    busy,
    error,
    signIn,
    signOut,
    status,
  };
}
