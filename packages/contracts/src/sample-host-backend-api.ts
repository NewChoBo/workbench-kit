/**
 * Reference HTTP API for the Workbench Sample Host dummy backend.
 *
 * Real backends should implement these routes and DTO shapes. The sample host
 * ships an in-browser adapter that mimics the same contract without a server.
 */

export const SAMPLE_HOST_BACKEND_API_VERSION = '1' as const;
export const SAMPLE_HOST_BACKEND_API_PREFIX = '/api/sample-host/v1' as const;

export const SampleHostBackendRoutes = {
  session: `${SAMPLE_HOST_BACKEND_API_PREFIX}/auth/session`,
  signIn: `${SAMPLE_HOST_BACKEND_API_PREFIX}/auth/sign-in`,
  signOut: `${SAMPLE_HOST_BACKEND_API_PREFIX}/auth/sign-out`,
} as const;

export type SampleHostBackendAuthStatus = 'authenticated' | 'unauthenticated';

export type SampleHostBackendLinkedAccountStatus = 'active' | 'expired' | 'signed-out';

export type SampleHostBackendErrorCode =
  | 'invalid_credentials'
  | 'network_error'
  | 'session_expired'
  | 'unexpected_response'
  | 'validation_error';

export interface SampleHostBackendErrorBody {
  readonly error: {
    readonly code: SampleHostBackendErrorCode;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly message: string;
  };
}

export interface SampleHostBackendProfile {
  readonly accountId: string;
  readonly displayName: string;
  readonly email: string;
  readonly providerLabel: string;
  readonly roleLabel: string;
  readonly sessionLabel: string;
  readonly statusLabel: string;
  readonly workspaceLabel?: string | undefined;
}

export interface SampleHostBackendLinkedAccount {
  readonly displayName: string;
  readonly email?: string | undefined;
  readonly id: string;
  readonly providerId: string;
  readonly providerLabel?: string | undefined;
  readonly status?: SampleHostBackendLinkedAccountStatus | undefined;
}

export interface SampleHostBackendSession {
  readonly linkedAccounts?: readonly SampleHostBackendLinkedAccount[] | undefined;
  readonly profile?: SampleHostBackendProfile | undefined;
  readonly status: SampleHostBackendAuthStatus;
}

export interface SampleHostBackendSignInRequest {
  readonly identifier: string;
  readonly password: string;
  readonly workspaceLabel?: string | undefined;
}

export interface SampleHostBackendSessionQuery {
  readonly workspaceLabel?: string | undefined;
}

export interface SampleHostBackendClient {
  getSession(query?: SampleHostBackendSessionQuery): Promise<SampleHostBackendSession>;
  signIn(request: SampleHostBackendSignInRequest): Promise<SampleHostBackendSession>;
  signOut(): Promise<SampleHostBackendSession>;
}

export class SampleHostBackendApiError extends Error {
  readonly code: SampleHostBackendErrorCode;
  readonly details?: Readonly<Record<string, unknown>> | undefined;
  readonly status?: number | undefined;

  constructor(
    code: SampleHostBackendErrorCode,
    message: string,
    options?: {
      details?: Readonly<Record<string, unknown>>;
      status?: number;
    },
  ) {
    super(message);
    this.name = 'SampleHostBackendApiError';
    this.code = code;
    this.details = options?.details;
    this.status = options?.status;
  }
}

export function isSampleHostBackendApiError(error: unknown): error is SampleHostBackendApiError {
  return error instanceof SampleHostBackendApiError;
}

export function isSampleHostBackendErrorBody(value: unknown): value is SampleHostBackendErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SampleHostBackendErrorBody>;
  if (typeof candidate.error !== 'object' || candidate.error === null) {
    return false;
  }

  const error = candidate.error as Partial<SampleHostBackendErrorBody['error']>;
  return typeof error.code === 'string' && typeof error.message === 'string';
}

export function parseSampleHostBackendSession(value: unknown): SampleHostBackendSession {
  if (typeof value !== 'object' || value === null) {
    throw new SampleHostBackendApiError(
      'unexpected_response',
      'Session payload must be an object.',
    );
  }

  const candidate = value as Partial<SampleHostBackendSession>;
  if (candidate.status !== 'authenticated' && candidate.status !== 'unauthenticated') {
    throw new SampleHostBackendApiError(
      'unexpected_response',
      'Session payload must include a valid status.',
    );
  }

  if (candidate.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (typeof candidate.profile !== 'object' || candidate.profile === null) {
    throw new SampleHostBackendApiError(
      'unexpected_response',
      'Authenticated sessions must include a profile.',
    );
  }

  return {
    linkedAccounts: Array.isArray(candidate.linkedAccounts) ? candidate.linkedAccounts : undefined,
    profile: candidate.profile,
    status: 'authenticated',
  };
}

export function createSampleHostBackendErrorBody(
  code: SampleHostBackendErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SampleHostBackendErrorBody {
  return {
    error: details ? { code, details, message } : { code, message },
  };
}
