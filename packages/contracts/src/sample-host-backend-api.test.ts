import { describe, expect, it } from 'vitest';

import {
  SampleHostBackendApiError,
  createSampleHostBackendErrorBody,
  isSampleHostBackendApiError,
  isSampleHostBackendErrorBody,
  parseSampleHostBackendSession,
} from './sample-host-backend-api';

describe('sample-host-backend-api', () => {
  it('parses authenticated sessions', () => {
    expect(
      parseSampleHostBackendSession({
        status: 'authenticated',
        profile: {
          accountId: 'tester',
          displayName: 'Tester',
          email: 'tester@example.com',
          providerLabel: 'Sample Dummy Backend',
          roleLabel: 'Developer',
          sessionLabel: 'Active',
          statusLabel: 'Active',
        },
        linkedAccounts: [],
      }),
    ).toMatchObject({
      status: 'authenticated',
      profile: { accountId: 'tester' },
    });
  });

  it('parses unauthenticated sessions', () => {
    expect(parseSampleHostBackendSession({ status: 'unauthenticated' })).toEqual({
      status: 'unauthenticated',
    });
  });

  it('rejects invalid session payloads', () => {
    expect(() => parseSampleHostBackendSession({ status: 'pending' })).toThrow(
      SampleHostBackendApiError,
    );
  });

  it('recognizes API error envelopes', () => {
    const body = createSampleHostBackendErrorBody(
      'invalid_credentials',
      'Invalid username or password.',
    );
    expect(isSampleHostBackendErrorBody(body)).toBe(true);
    expect(
      isSampleHostBackendApiError(new SampleHostBackendApiError('network_error', 'Offline')),
    ).toBe(true);
  });
});
