/** @vitest-environment jsdom */

import { act, StrictMode, type FormEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SampleHostBackendApiError,
  type SampleHostBackendClient,
  type SampleHostBackendSession,
  type SampleHostBackendSignInRequest,
} from '@workbench-kit/contracts';
import { createSampleHostBackendClient } from './dummy-backend/index.js';
import { useSampleAuth, type SampleAuthController } from './useSampleAuth.js';

vi.mock('./dummy-backend/index.js', () => ({ createSampleHostBackendClient: vi.fn() }));

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function deferred() {
  let resolve!: (session: SampleHostBackendSession) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<SampleHostBackendSession>((accept, refuse) => {
    resolve = accept;
    reject = refuse;
  });
  return { promise, resolve, reject };
}

function backend() {
  const sessions: ReturnType<typeof deferred>[] = [];
  const signIns: ReturnType<typeof deferred>[] = [];
  const signOuts: ReturnType<typeof deferred>[] = [];
  const enqueue = (requests: ReturnType<typeof deferred>[]) => {
    const request = deferred();
    requests.push(request);
    return request.promise;
  };
  const client = {
    getSession: vi.fn(() => enqueue(sessions)),
    signIn: vi.fn((_request: SampleHostBackendSignInRequest) => enqueue(signIns)),
    signOut: vi.fn(() => enqueue(signOuts)),
    dispose: vi.fn(),
  };
  return { client, sessions, signIns, signOuts };
}

function authenticated(accountId = 'sample'): SampleHostBackendSession {
  return {
    status: 'authenticated',
    profile: {
      accountId,
      displayName: `Sample ${accountId}`,
      email: `${accountId}@example.test`,
      providerLabel: 'Sample',
      roleLabel: 'Member',
      sessionLabel: 'Test session',
      statusLabel: 'Online',
    },
    linkedAccounts: [{ id: `${accountId}-linked`, providerId: 'sample', displayName: 'Linked' }],
  };
}

const signedOut: SampleHostBackendSession = { status: 'unauthenticated' };
const credentials = {
  credentials: { identifier: 'sample', password: 'fixture-only' },
  event: {} as FormEvent<HTMLFormElement>,
};

describe('sample auth request ownership', () => {
  let container: HTMLDivElement;
  let root: Root;
  let mounted: boolean;
  let auth: SampleAuthController;
  let renders: { client: SampleHostBackendClient | undefined; auth: SampleAuthController }[];
  let initial: ReturnType<typeof backend>;

  function Probe({ client }: { client?: SampleHostBackendClient | undefined }) {
    auth = useSampleAuth(client);
    renders.push({ client, auth });
    return null;
  }
  async function render(client?: SampleHostBackendClient, strict = false) {
    await act(async () => {
      root.render(
        strict ? (
          <StrictMode>
            <Probe client={client} />
          </StrictMode>
        ) : (
          <Probe client={client} />
        ),
      );
    });
  }
  async function resolve(request: ReturnType<typeof deferred>, session: SampleHostBackendSession) {
    await act(async () => {
      request.resolve(session);
    });
  }
  async function reject(request: ReturnType<typeof deferred>, error: unknown) {
    await act(async () => {
      request.reject(error);
    });
  }
  function unmount() {
    act(() => root.unmount());
    mounted = false;
  }
  beforeEach(() => {
    vi.clearAllMocks();
    initial = backend();
    vi.mocked(createSampleHostBackendClient).mockReturnValue(initial.client);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mounted = true;
    renders = [];
  });
  afterEach(() => {
    if (mounted) unmount();
    container.remove();
  });

  it('retains the default factory and workspace query when no client is supplied', async () => {
    await render();
    await render();
    expect(createSampleHostBackendClient).toHaveBeenCalledTimes(1);
    expect(initial.client.getSession).toHaveBeenCalledExactlyOnceWith({
      workspaceLabel: 'Workbench Sample',
    });
    expect(auth.status).toBe('loading');
    const session = authenticated();
    await resolve(initial.sessions[0], session);
    expect(auth).toMatchObject({ status: 'authenticated', busy: false, error: undefined });
    expect(auth.profile).toBe(session.profile);
    expect(auth.linkedAccounts).toBe(session.linkedAccounts);
  });

  it('uses the injected client without constructing a default or retaining signed-out data', async () => {
    await render(initial.client);
    expect(createSampleHostBackendClient).not.toHaveBeenCalled();
    await resolve(initial.sessions[0], { ...authenticated(), status: 'unauthenticated' });
    expect(auth).toMatchObject({
      status: 'unauthenticated',
      profile: undefined,
      linkedAccounts: [],
      busy: false,
    });
  });

  it('handles bootstrap failure and clears its error for a successful sign-in retry', async () => {
    await render(initial.client);
    await reject(
      initial.sessions[0],
      new SampleHostBackendApiError('network_error', 'Session unavailable'),
    );
    expect(auth).toMatchObject({
      status: 'unauthenticated',
      error: 'Session unavailable',
      busy: false,
    });
    act(() => auth.signIn(credentials));
    expect(initial.client.signIn).toHaveBeenCalledExactlyOnceWith({
      ...credentials.credentials,
      workspaceLabel: 'Workbench Sample',
    });
    expect(auth).toMatchObject({ busy: true, error: undefined });
    await resolve(initial.signIns[0], authenticated('retry'));
    expect(auth).toMatchObject({
      status: 'authenticated',
      busy: false,
      error: undefined,
      profile: { accountId: 'retry' },
    });
  });

  it('deduplicates synchronous sign-in and sign-out calls across both mutation kinds', async () => {
    await render(initial.client);
    await resolve(initial.sessions[0], signedOut);
    act(() => {
      auth.signIn(credentials);
      auth.signIn(credentials);
      auth.signOut();
    });
    expect(initial.client.signIn).toHaveBeenCalledTimes(1);
    expect(initial.client.signOut).not.toHaveBeenCalled();
    await resolve(initial.signIns[0], authenticated());
    act(() => {
      auth.signOut();
      auth.signOut();
      auth.signIn(credentials);
    });
    expect(initial.client.signOut).toHaveBeenCalledTimes(1);
    expect(initial.client.signIn).toHaveBeenCalledTimes(1);
    await resolve(initial.signOuts[0], signedOut);
    expect(auth).toMatchObject({
      status: 'unauthenticated',
      profile: undefined,
      linkedAccounts: [],
      busy: false,
    });
  });

  it('ignores stale bootstrap success while a sign-in is pending', async () => {
    await render(initial.client);
    act(() => auth.signIn(credentials));
    await resolve(initial.sessions[0], authenticated('stale'));
    expect(auth).toMatchObject({
      busy: true,
      profile: undefined,
      linkedAccounts: [],
      error: undefined,
    });
    await resolve(initial.signIns[0], authenticated('current'));
    expect(auth.profile?.accountId).toBe('current');
  });

  it('ignores stale bootstrap failure after successful sign-in', async () => {
    await render(initial.client);
    act(() => auth.signIn(credentials));
    await resolve(initial.signIns[0], authenticated('current'));
    await reject(initial.sessions[0], new Error('Old bootstrap failed'));
    expect(auth).toMatchObject({
      status: 'authenticated',
      profile: { accountId: 'current' },
      busy: false,
      error: undefined,
    });
  });

  it('failed sign-in supersedes bootstrap and exits loading with a retryable error', async () => {
    await render(initial.client);
    act(() => auth.signIn(credentials));
    await reject(initial.signIns[0], new Error('Sign-in unavailable'));
    expect(auth).toMatchObject({
      status: 'unauthenticated',
      profile: undefined,
      linkedAccounts: [],
      busy: false,
      error: 'Sign-in unavailable',
    });
    await resolve(initial.sessions[0], authenticated('stale'));
    expect(auth.status).toBe('unauthenticated');
    expect(auth.error).toBe('Sign-in unavailable');
    act(() => auth.signIn(credentials));
    await resolve(initial.signIns[1], authenticated('retry'));
    expect(auth.profile?.accountId).toBe('retry');
    expect(auth.busy).toBe(false);
  });

  it('preserves an authenticated session when a later sign-in fails', async () => {
    await render(initial.client);
    const session = authenticated();
    await resolve(initial.sessions[0], session);
    act(() => auth.signIn(credentials));
    await reject(initial.signIns[0], new Error('Sign-in rejected'));
    expect(auth).toMatchObject({ status: 'authenticated', busy: false, error: 'Sign-in rejected' });
    expect(auth.profile).toBe(session.profile);
    expect(auth.linkedAccounts).toBe(session.linkedAccounts);
  });

  it('retains profile and accounts on failed sign-out then clears them only after retry succeeds', async () => {
    await render(initial.client);
    const session = authenticated();
    await resolve(initial.sessions[0], session);
    act(() => auth.signOut());
    expect(auth.busy).toBe(true);
    await reject(initial.signOuts[0], new Error('Sign-out unavailable'));
    expect(auth).toMatchObject({
      status: 'authenticated',
      busy: false,
      error: 'Sign-out unavailable',
    });
    expect(auth.profile).toBe(session.profile);
    expect(auth.linkedAccounts).toBe(session.linkedAccounts);
    act(() => auth.signOut());
    expect(auth).toMatchObject({ busy: true, error: undefined });
    await resolve(initial.signOuts[1], signedOut);
    expect(auth).toMatchObject({
      status: 'unauthenticated',
      profile: undefined,
      linkedAccounts: [],
      busy: false,
      error: undefined,
    });
  });

  it('StrictMode ignores cleaned-up bootstrap results without disposing the caller client', async () => {
    await render(initial.client, true);
    expect(initial.client.getSession).toHaveBeenCalledTimes(2);
    expect(initial.client.dispose).not.toHaveBeenCalled();
    await resolve(initial.sessions[1], authenticated('current'));
    await reject(initial.sessions[0], new Error('Cleaned-up bootstrap'));
    expect(auth).toMatchObject({
      status: 'authenticated',
      profile: { accountId: 'current' },
      error: undefined,
    });
    unmount();
    expect(initial.client.dispose).not.toHaveBeenCalled();
  });

  it('client replacement resets visible state and ignores old mutation failure and callbacks', async () => {
    await render(initial.client);
    await resolve(initial.sessions[0], authenticated('previous'));
    const oldController = auth;
    act(() => auth.signOut());
    const replacement = backend();
    await render(replacement.client);
    const replacementRenders = renders.filter((entry) => entry.client === replacement.client);
    expect(replacementRenders.length).toBeGreaterThan(0);
    for (const entry of replacementRenders) {
      expect(entry.auth).toMatchObject({
        status: 'loading',
        busy: false,
        error: undefined,
        profile: undefined,
        linkedAccounts: [],
      });
    }
    act(() => {
      oldController.signIn(credentials);
      oldController.signOut();
    });
    expect(initial.client.signIn).not.toHaveBeenCalled();
    expect(initial.client.signOut).toHaveBeenCalledTimes(1);
    await reject(initial.signOuts[0], new Error('Previous sign-out failed'));
    expect(auth).toMatchObject({ status: 'loading', busy: false, error: undefined });
    await resolve(replacement.sessions[0], authenticated('replacement'));
    act(() => auth.signOut());
    await reject(replacement.signOuts[0], new Error('Replacement error'));
    const final = backend();
    await render(final.client);
    expect(auth).toMatchObject({
      status: 'loading',
      busy: false,
      error: undefined,
      profile: undefined,
      linkedAccounts: [],
    });
    expect(initial.client.dispose).not.toHaveBeenCalled();
    expect(replacement.client.dispose).not.toHaveBeenCalled();
  });

  it('old bootstrap and successful mutation cannot overwrite a replacement client session', async () => {
    await render(initial.client);
    act(() => auth.signIn(credentials));
    const replacement = backend();
    await render(replacement.client);
    await resolve(replacement.sessions[0], authenticated('replacement'));
    await resolve(initial.signIns[0], authenticated('old mutation'));
    await resolve(initial.sessions[0], authenticated('old bootstrap'));
    expect(auth).toMatchObject({
      status: 'authenticated',
      profile: { accountId: 'replacement' },
      busy: false,
      error: undefined,
    });
  });

  it.each(['bootstrap', 'sign-in', 'sign-out'] as const)(
    'ignores %s rejection after unmount without disposing the client',
    async (operation) => {
      await render(initial.client);
      let pending = initial.sessions[0];
      if (operation !== 'bootstrap') {
        await resolve(initial.sessions[0], authenticated());
        act(() => (operation === 'sign-in' ? auth.signIn(credentials) : auth.signOut()));
        pending = operation === 'sign-in' ? initial.signIns[0] : initial.signOuts[0];
      }
      const oldController = auth;
      unmount();
      const before = renders.length;
      await reject(pending, new Error('Late request failure'));
      oldController.signIn(credentials);
      oldController.signOut();
      expect(renders).toHaveLength(before);
      expect(initial.client.signIn).toHaveBeenCalledTimes(operation === 'sign-in' ? 1 : 0);
      expect(initial.client.signOut).toHaveBeenCalledTimes(operation === 'sign-out' ? 1 : 0);
      expect(initial.client.dispose).not.toHaveBeenCalled();
    },
  );
});
