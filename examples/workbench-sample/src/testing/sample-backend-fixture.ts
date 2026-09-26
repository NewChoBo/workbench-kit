import {
  SampleHostBackendRoutes,
  createSampleHostBackendErrorBody,
  type SampleHostBackendClient,
  type SampleHostBackendSession,
} from '@workbench-kit/contracts';
import { createHttpSampleHostBackendClient } from '../dummy-backend/http-client.js';
import {
  createSampleMockLinkedAccounts,
  createSampleMockProfile,
  validateSampleLogin,
} from '../dummy-backend/in-memory-client.js';

export const sampleBackendScenarios = [
  { id: 'signed-out', label: 'Signed out', description: 'Sign in with tester / tester.' },
  {
    id: 'slow-session',
    label: 'Slow session',
    description: 'Release the session response to show the login screen.',
  },
  {
    id: 'slow-sign-in',
    label: 'Slow sign-in',
    description: 'Submit the form, then release the response.',
  },
  {
    id: 'sign-in-retry',
    label: 'Sign-in failure and retry',
    description: 'The first sign-in has a connection failure; the next can succeed.',
  },
  {
    id: 'sign-out-retry',
    label: 'Sign-out failure and retry',
    description: 'Open Profile. The first sign-out fails and must retain the session.',
  },
  {
    id: 'expired-session',
    label: 'Expired session',
    description: 'Session lookup fails with session_expired. Sign in again to recover.',
  },
  {
    id: 'invalid-response',
    label: 'Invalid response',
    description: 'Session lookup returns an invalid status through the real response parser.',
  },
  {
    id: 'empty-accounts',
    label: 'No linked accounts',
    description: 'Open Settings → Linked Accounts to inspect the empty state.',
  },
  {
    id: 'one-account',
    label: 'One linked account',
    description: 'Open Settings → Linked Accounts to inspect one record.',
  },
  {
    id: 'many-accounts',
    label: 'Many accounts and long labels',
    description: 'Open Settings → Linked Accounts to inspect 24 varied records.',
  },
] as const;

export type SampleBackendScenario = (typeof sampleBackendScenarios)[number]['id'];
type Operation = keyof SampleHostBackendClient;

export interface SampleBackendFixture {
  readonly client: SampleHostBackendClient;
  readonly fetchImpl: typeof fetch;
  readonly pendingCount: number;
  /** Aggregate diagnostics deliberately omit request bodies and credentials. */
  readonly requestCounts: Readonly<Record<Operation, number>>;
  releasePending(): void;
  dispose(): void;
}

const origin = 'http://sample-backend.invalid';

/** Test/sample-only HTTP transport. No global interception, network or storage. */
export function createSampleBackendFixture(
  scenario: SampleBackendScenario,
  onChange: () => void = () => {},
): SampleBackendFixture {
  if (!sampleBackendScenarios.some((item) => item.id === scenario)) {
    throw new TypeError('Unknown sample backend scenario');
  }
  let accountId: string | undefined = [
    'sign-out-retry',
    'empty-accounts',
    'one-account',
    'many-accounts',
  ].includes(scenario)
    ? 'tester'
    : undefined;
  let disposed = false;
  let released = false;
  const counts = { getSession: 0, signIn: 0, signOut: 0 };
  const pending = new Set<{ resolve: () => void; reject: (reason: Error) => void }>();

  const session = (workspaceLabel: string): SampleHostBackendSession => {
    if (!accountId) return { status: 'unauthenticated' };
    const defaults = createSampleMockLinkedAccounts();
    const linkedAccounts =
      scenario === 'empty-accounts'
        ? []
        : scenario === 'one-account'
          ? defaults.slice(0, 1)
          : scenario === 'many-accounts'
            ? Array.from({ length: 24 }, (_, index) => ({
                id: `integration-${String(index + 1).padStart(2, '0')}-${'longidentifier'.repeat(4)}`,
                displayName: `${index + 1}. Research workspace — multilingual collaboration / 다국어 검증 / 日本語`,
                providerId: 'sample',
                providerLabel: 'Example integration',
                email: `integration-${index + 1}@example.invalid`,
                status: (index % 3 === 0
                  ? 'active'
                  : index % 3 === 1
                    ? 'expired'
                    : 'signed-out') as 'active' | 'expired' | 'signed-out',
              }))
            : defaults;
    return {
      status: 'authenticated',
      profile: createSampleMockProfile(workspaceLabel, accountId),
      linkedAccounts,
    };
  };

  const fetchImpl: typeof fetch = async (input, init) => {
    if (disposed) throw new Error('Sample backend disposed');
    const request = new Request(input, init);
    const url = new URL(request.url);
    const operation: Operation | undefined =
      request.method === 'GET' && url.pathname === SampleHostBackendRoutes.session
        ? 'getSession'
        : request.method === 'POST' && url.pathname === SampleHostBackendRoutes.signIn
          ? 'signIn'
          : request.method === 'POST' && url.pathname === SampleHostBackendRoutes.signOut
            ? 'signOut'
            : undefined;
    if (url.origin !== origin || !operation) {
      throw new Error('Unexpected sample backend request');
    }
    let body: unknown;
    if (operation === 'signIn') {
      try {
        body = await request.json();
      } catch {
        if (disposed) throw new Error('Sample backend disposed');
        return json(
          createSampleHostBackendErrorBody('validation_error', 'Expected JSON credentials.'),
          400,
        );
      }
    }
    if (disposed) throw new Error('Sample backend disposed');
    const attempt = ++counts[operation];
    const held =
      !released &&
      ((scenario === 'slow-session' && operation === 'getSession') ||
        (scenario === 'slow-sign-in' && operation === 'signIn'));
    if (held) {
      await new Promise<void>((resolve, reject) => {
        pending.add({ resolve, reject });
        onChange();
      });
    } else {
      onChange();
    }
    if (disposed) throw new Error('Sample backend disposed');
    if (scenario === 'expired-session' && operation === 'getSession') {
      return json(
        createSampleHostBackendErrorBody(
          'session_expired',
          'Your sample session expired. Sign in again.',
        ),
        401,
      );
    }
    if (scenario === 'invalid-response' && operation === 'getSession') {
      return json({ status: 'not-a-session' });
    }
    if (scenario === 'sign-in-retry' && operation === 'signIn' && attempt === 1) {
      throw new TypeError('Simulated connection failure');
    }
    if (scenario === 'sign-out-retry' && operation === 'signOut' && attempt === 1) {
      return json(
        createSampleHostBackendErrorBody(
          'network_error',
          'Sign-out failed. Your session is still active. Try again.',
        ),
        503,
      );
    }
    if (operation === 'getSession')
      return json(session(url.searchParams.get('workspaceLabel') ?? 'Workbench Sample'));
    if (operation === 'signOut') {
      accountId = undefined;
      return json({ status: 'unauthenticated' });
    }
    if (!isCredentials(body)) {
      return json(
        createSampleHostBackendErrorBody(
          'validation_error',
          'Expected username and password strings.',
        ),
        400,
      );
    }
    if (!validateSampleLogin(body.identifier, body.password)) {
      return json(
        createSampleHostBackendErrorBody('invalid_credentials', 'Invalid username or password.'),
        401,
      );
    }
    accountId = body.identifier.trim();
    return json(session(body.workspaceLabel ?? 'Workbench Sample'));
  };

  return {
    client: createHttpSampleHostBackendClient({ baseUrl: origin, fetchImpl }),
    fetchImpl,
    get pendingCount() {
      return pending.size;
    },
    get requestCounts() {
      return { ...counts };
    },
    releasePending() {
      if (disposed) return;
      released = true;
      const requests = [...pending];
      pending.clear();
      for (const request of requests) request.resolve();
      onChange();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const requests = [...pending];
      pending.clear();
      for (const request of requests) request.reject(new Error('Sample backend disposed'));
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isCredentials(value: unknown): value is {
  identifier: string;
  password: string;
  workspaceLabel?: string;
} {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.identifier === 'string' &&
    typeof candidate.password === 'string' &&
    (candidate.workspaceLabel === undefined || typeof candidate.workspaceLabel === 'string')
  );
}
