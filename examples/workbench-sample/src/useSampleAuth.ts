import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WorkbenchLoginSubmitContext } from '@workbench-kit/react';
import type { WorkbenchAuthStatus } from '@workbench-kit/react/workbench/auth';
import {
  isSampleHostBackendApiError,
  type SampleHostBackendClient,
  type SampleHostBackendSession,
} from '@workbench-kit/contracts';

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

type SampleAuthState = Omit<SampleAuthController, 'signIn' | 'signOut'>;

interface SampleAuthGeneration {
  client: SampleHostBackendClient;
  mutationPending: boolean;
  revision: number;
  state: SampleAuthState;
}

const loadingState = (): SampleAuthState => ({
  busy: false,
  error: undefined,
  linkedAccounts: [],
  profile: undefined,
  status: 'loading',
});

export function useSampleAuth(client?: SampleHostBackendClient): SampleAuthController {
  const backendClient = useMemo(() => client ?? createSampleHostBackendClient(), [client]);
  const current = useRef<SampleAuthGeneration | undefined>(undefined);
  const [snapshot, setSnapshot] = useState(() => ({
    client: backendClient,
    state: loadingState(),
  }));
  const isCurrent = useCallback(
    (generation: SampleAuthGeneration, revision: number) =>
      current.current === generation && generation.revision === revision,
    [],
  );
  const publish = useCallback((generation: SampleAuthGeneration, state: SampleAuthState) => {
    generation.state = state;
    setSnapshot({ client: generation.client, state });
  }, []);

  useEffect(() => {
    const generation: SampleAuthGeneration = {
      client: backendClient,
      mutationPending: false,
      revision: 0,
      state: loadingState(),
    };
    current.current = generation;
    publish(generation, generation.state);

    void (async () => {
      try {
        const session = await backendClient.getSession({ workspaceLabel: SAMPLE_WORKSPACE_LABEL });
        if (isCurrent(generation, 0)) publish(generation, stateFromSession(session));
      } catch (requestError: unknown) {
        if (isCurrent(generation, 0)) {
          publish(generation, {
            ...stateFromSession({ status: 'unauthenticated' }),
            error: formatSampleAuthError(requestError),
          });
        }
      }
    })();

    return () => {
      // Invalidate results only. Transport cancellation and disposal belong to the caller.
      if (current.current === generation) current.current = undefined;
    };
  }, [backendClient, isCurrent, publish]);

  const mutate = useCallback(
    (request: (activeClient: SampleHostBackendClient) => Promise<SampleHostBackendSession>) => {
      const generation = current.current;
      if (!generation || generation.client !== backendClient || generation.mutationPending) return;

      // The ref lock takes effect before React rerenders; a mutation supersedes bootstrap.
      generation.mutationPending = true;
      const revision = ++generation.revision;
      publish(generation, { ...generation.state, busy: true, error: undefined });
      void (async () => {
        try {
          const session = await request(backendClient);
          if (isCurrent(generation, revision)) {
            generation.mutationPending = false;
            publish(generation, stateFromSession(session));
          }
        } catch (requestError: unknown) {
          if (!isCurrent(generation, revision)) return;
          generation.mutationPending = false;
          publish(generation, {
            ...generation.state,
            busy: false,
            error: formatSampleAuthError(requestError),
            status:
              generation.state.status === 'loading' ? 'unauthenticated' : generation.state.status,
          });
        }
      })();
    },
    [backendClient, isCurrent, publish],
  );
  const signIn = useCallback(
    ({ credentials }: WorkbenchLoginSubmitContext) => {
      mutate((activeClient) =>
        activeClient.signIn({
          identifier: credentials.identifier,
          password: credentials.password,
          workspaceLabel: SAMPLE_WORKSPACE_LABEL,
        }),
      );
    },
    [mutate],
  );
  const signOut = useCallback(() => {
    mutate(async (activeClient) => {
      await activeClient.signOut();
      return { status: 'unauthenticated' };
    });
  }, [mutate]);

  return {
    // A replacement never renders the previous client's profile before effect cleanup.
    ...(snapshot.client === backendClient ? snapshot.state : loadingState()),
    signIn,
    signOut,
  };
}

function stateFromSession(session: SampleHostBackendSession): SampleAuthState {
  return {
    busy: false,
    error: undefined,
    linkedAccounts: session.status === 'authenticated' ? (session.linkedAccounts ?? []) : [],
    profile: session.status === 'authenticated' ? session.profile : undefined,
    status: session.status,
  };
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
