import { describe, expect, it, vi } from 'vitest';
import { SampleHostBackendRoutes, parseSampleHostBackendSession } from '@workbench-kit/contracts';
import { createHttpSampleHostBackendClient } from '../dummy-backend/http-client.js';
import { createSampleBackendFixture, sampleBackendScenarios } from './sample-backend-fixture.js';

const credentials = { identifier: 'tester', password: 'tester', workspaceLabel: 'Fixture / 한글' };
const origin = 'http://sample-backend.invalid';

describe('sample backend fixture', () => {
  it('uses real HTTP routes methods JSON and error parsing for sign-in session and sign-out', async () => {
    const fixture = createSampleBackendFixture('signed-out');
    const requests: Request[] = [];
    const client = createHttpSampleHostBackendClient({
      baseUrl: origin,
      fetchImpl: (input, init) => {
        requests.push(new Request(input, init));
        return fixture.fetchImpl(input, init);
      },
    });
    expect(await client.getSession({ workspaceLabel: 'Fixture / 한글' })).toEqual({
      status: 'unauthenticated',
    });
    await expect(client.signIn({ identifier: 'wrong', password: 'wrong' })).rejects.toMatchObject({
      code: 'invalid_credentials',
      status: 401,
    });
    expect((await client.signIn(credentials)).profile).toMatchObject({
      accountId: 'tester',
      workspaceLabel: credentials.workspaceLabel,
    });
    expect((await client.getSession()).status).toBe('authenticated');
    expect(await client.signOut()).toEqual({ status: 'unauthenticated' });
    expect(requests.map((r) => [new URL(r.url).pathname, r.method])).toEqual([
      [SampleHostBackendRoutes.session, 'GET'],
      [SampleHostBackendRoutes.signIn, 'POST'],
      [SampleHostBackendRoutes.signIn, 'POST'],
      [SampleHostBackendRoutes.session, 'GET'],
      [SampleHostBackendRoutes.signOut, 'POST'],
    ]);
    expect(new URL(requests[0]!.url).searchParams.get('workspaceLabel')).toBe(
      credentials.workspaceLabel,
    );
    expect(requests[2]!.headers.get('content-type')).toBe('application/json');
    expect(await requests[2]!.json()).toEqual(credentials);
    expect(fixture.requestCounts).toEqual({ getSession: 2, signIn: 2, signOut: 1 });
    fixture.dispose();
  });

  it('isolates instances and returned payloads and resets through fresh factories', async () => {
    const first = createSampleBackendFixture('signed-out');
    const second = createSampleBackendFixture('signed-out');
    const payload = await first.client.signIn(credentials);
    (payload.profile as { displayName: string }).displayName = 'Changed';
    (payload.linkedAccounts![0] as { displayName: string }).displayName = 'Changed';
    expect((await first.client.getSession()).profile?.displayName).toBe('Tester');
    expect((await first.client.getSession()).linkedAccounts?.[0]?.displayName).toBe(
      'GitHub Project Access',
    );
    expect(await second.client.getSession()).toEqual({ status: 'unauthenticated' });
    first.dispose();
    second.dispose();
    const reset = createSampleBackendFixture('signed-out');
    expect(await reset.client.getSession()).toEqual({ status: 'unauthenticated' });
    reset.dispose();
  });

  it('holds repeated StrictMode-style session calls until explicitly released without timers', async () => {
    const changed = vi.fn();
    const fixture = createSampleBackendFixture('slow-session', changed);
    const first = fixture.client.getSession();
    const second = fixture.client.getSession();
    expect(fixture.pendingCount).toBe(2);
    expect(changed).toHaveBeenCalledTimes(2);
    fixture.releasePending();
    expect(fixture.pendingCount).toBe(0);
    expect(await Promise.all([first, second])).toEqual([
      { status: 'unauthenticated' },
      { status: 'unauthenticated' },
    ]);
    expect(await fixture.client.getSession()).toEqual({ status: 'unauthenticated' });
    fixture.dispose();
  });

  it('holds sign-in without mutating the session before release', async () => {
    let pendingReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      pendingReady = resolve;
    });
    const fixture = createSampleBackendFixture('slow-sign-in', pendingReady);
    const pending = fixture.client.signIn(credentials);
    await ready;
    expect(fixture.pendingCount).toBe(1);
    expect(await fixture.client.getSession()).toEqual({ status: 'unauthenticated' });
    fixture.releasePending();
    expect((await pending).status).toBe('authenticated');
    fixture.dispose();
  });

  it('rejects held and future requests on idempotent disposal without mutation or network fallback', async () => {
    const fixture = createSampleBackendFixture('slow-session');
    const request = fixture.client.getSession();
    const rejected = expect(request).rejects.toMatchObject({ code: 'network_error' });
    fixture.dispose();
    fixture.dispose();
    fixture.releasePending();
    await rejected;
    expect(fixture.pendingCount).toBe(0);
    await expect(fixture.client.signIn(credentials)).rejects.toMatchObject({
      code: 'network_error',
    });
    expect(fixture.requestCounts).toEqual({ getSession: 1, signIn: 0, signOut: 0 });
  });

  it('disposes a held sign-in before it can establish a session', async () => {
    let ready!: () => void;
    const waiting = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const fixture = createSampleBackendFixture('slow-sign-in', ready);
    const request = fixture.client.signIn(credentials);
    const rejected = expect(request).rejects.toMatchObject({ code: 'network_error' });
    await waiting;
    fixture.dispose();
    await rejected;
    expect(fixture.pendingCount).toBe(0);
  });

  it('keeps failed sign-in unauthenticated and succeeds on retry through the same HTTP client', async () => {
    const fixture = createSampleBackendFixture('sign-in-retry');
    await expect(fixture.client.signIn(credentials)).rejects.toMatchObject({
      code: 'network_error',
    });
    expect(await fixture.client.getSession()).toEqual({ status: 'unauthenticated' });
    expect((await fixture.client.signIn(credentials)).status).toBe('authenticated');
    fixture.dispose();
  });

  it('preserves the server session on failed sign-out and clears it only after retry', async () => {
    const fixture = createSampleBackendFixture('sign-out-retry');
    await expect(fixture.client.signOut()).rejects.toMatchObject({
      code: 'network_error',
      status: 503,
    });
    expect((await fixture.client.getSession()).status).toBe('authenticated');
    expect(await fixture.client.signOut()).toEqual({ status: 'unauthenticated' });
    expect(await fixture.client.getSession()).toEqual({ status: 'unauthenticated' });
    fixture.dispose();
  });

  it('rejects expired and invalid session responses through existing client parsing and permits recovery', async () => {
    for (const [scenario, code] of [
      ['expired-session', 'session_expired'],
      ['invalid-response', 'unexpected_response'],
    ] as const) {
      const fixture = createSampleBackendFixture(scenario);
      await expect(fixture.client.getSession()).rejects.toMatchObject({ code });
      await expect(fixture.client.getSession()).rejects.toMatchObject({ code });
      expect((await fixture.client.signIn(credentials)).status).toBe('authenticated');
      fixture.dispose();
    }
  });

  it('provides deterministic zero one and many valid account payloads with distinct IDs', async () => {
    for (const [scenario, size] of [
      ['empty-accounts', 0],
      ['one-account', 1],
      ['many-accounts', 24],
    ] as const) {
      const fixture = createSampleBackendFixture(scenario);
      const first = await fixture.client.getSession();
      expect(parseSampleHostBackendSession(first)).toEqual(first);
      expect(first.linkedAccounts).toHaveLength(size);
      expect(new Set(first.linkedAccounts?.map((a) => a.id)).size).toBe(size);
      expect(await fixture.client.getSession()).toEqual(first);
      fixture.dispose();
    }
    expect(new Set(sampleBackendScenarios.map((s) => s.id)).size).toBe(10);
  });

  it('rejects unknown routes origins methods and malformed credentials instead of fabricating success', async () => {
    const fixture = createSampleBackendFixture('signed-out');
    await expect(fixture.fetchImpl(`${origin}/unknown`)).rejects.toThrow('Unexpected');
    await expect(
      fixture.fetchImpl(`https://example.invalid${SampleHostBackendRoutes.session}`),
    ).rejects.toThrow('Unexpected');
    await expect(fixture.fetchImpl(`${origin}${SampleHostBackendRoutes.signOut}`)).rejects.toThrow(
      'Unexpected',
    );
    const response = await fixture.fetchImpl(`${origin}${SampleHostBackendRoutes.signIn}`, {
      method: 'POST',
      body: '{',
    });
    expect(response.status).toBe(400);
    const malformed = await fixture.fetchImpl(`${origin}${SampleHostBackendRoutes.signIn}`, {
      method: 'POST',
      body: JSON.stringify({ identifier: 1, password: [] }),
    });
    expect(malformed.status).toBe(400);
    expect(await fixture.client.getSession()).toEqual({ status: 'unauthenticated' });
    fixture.dispose();
  });
});
