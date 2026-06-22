import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WorkbenchLoginSubmitContext } from '@workbench-kit/react';
import type { WorkbenchAuthStatus } from '@workbench-kit/react/workbench/auth';
import { isSampleHostBackendApiError } from '@workbench-kit/contracts';

import {
  createSampleHostBackendClient,
  type SampleLinkedAccount,
  type SampleProfile,
} from './dummy-backend/index.js';

const SAMPLE_WORKSPACE_LABEL = 'Workbench Sample';

export interface SampleAuthController {
  busy: boolean;
  error: string | undefined;
  linkedAccounts: readonly SampleLinkedAccount[];
  profile: SampleProfile | undefined;
  signIn: (context: WorkbenchLoginSubmitContext) => void;
  signOut: () => void;
  status: WorkbenchAuthStatus;
}

const SampleAccountContext = createContext<SampleAuthController | null>(null);

export function SampleAccountProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SampleAuthController;
}) {
  return createElement(SampleAccountContext.Provider, { value }, children);
}

export function useSampleAccount(): SampleAuthController {
  const value = useContext(SampleAccountContext);
  if (!value) {
    throw new Error('useSampleAccount must be used within SampleAccountProvider.');
  }

  return value;
}

export function useSampleAuth(): SampleAuthController {
  const backendClient = useMemo(() => createSampleHostBackendClient(), []);
  const [status, setStatus] = useState<WorkbenchAuthStatus>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [profile, setProfile] = useState<SampleProfile | undefined>();
  const [linkedAccounts, setLinkedAccounts] = useState<readonly SampleLinkedAccount[]>([]);

  useEffect(() => {
    let disposed = false;

    void backendClient
      .getSession({ workspaceLabel: SAMPLE_WORKSPACE_LABEL })
      .then((session) => {
        if (disposed) {
          return;
        }

        applySampleSession(session, {
          setLinkedAccounts,
          setProfile,
          setStatus,
        });
      })
      .catch((requestError: unknown) => {
        if (disposed) {
          return;
        }

        setLinkedAccounts([]);
        setProfile(undefined);
        setStatus('unauthenticated');
        setError(formatSampleAuthError(requestError));
      });

    return () => {
      disposed = true;
    };
  }, [backendClient]);

  const signIn = useCallback(
    ({ credentials }: WorkbenchLoginSubmitContext) => {
      setError(undefined);
      setBusy(true);

      void backendClient
        .signIn({
          identifier: credentials.identifier,
          password: credentials.password,
          workspaceLabel: SAMPLE_WORKSPACE_LABEL,
        })
        .then((session) => {
          applySampleSession(session, {
            setLinkedAccounts,
            setProfile,
            setStatus,
          });
          setBusy(false);
        })
        .catch((requestError: unknown) => {
          setBusy(false);
          setError(formatSampleAuthError(requestError));
        });
    },
    [backendClient],
  );

  const signOut = useCallback(() => {
    setBusy(true);
    void backendClient.signOut().finally(() => {
      setLinkedAccounts([]);
      setProfile(undefined);
      setBusy(false);
      setError(undefined);
      setStatus('unauthenticated');
    });
  }, [backendClient]);

  return {
    busy,
    error,
    linkedAccounts,
    profile,
    signIn,
    signOut,
    status,
  };
}

function applySampleSession(
  session: {
    readonly linkedAccounts?: readonly SampleLinkedAccount[] | undefined;
    readonly profile?: SampleProfile | undefined;
    readonly status: 'authenticated' | 'unauthenticated';
  },
  setters: {
    readonly setLinkedAccounts: (linkedAccounts: readonly SampleLinkedAccount[]) => void;
    readonly setProfile: (profile: SampleProfile | undefined) => void;
    readonly setStatus: (status: WorkbenchAuthStatus) => void;
  },
): void {
  setters.setLinkedAccounts(
    session.status === 'authenticated' ? (session.linkedAccounts ?? []) : [],
  );
  setters.setProfile(session.status === 'authenticated' ? session.profile : undefined);
  setters.setStatus(session.status);
}

function formatSampleAuthError(error: unknown): string {
  if (isSampleHostBackendApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Sample dummy backend request failed.';
}
