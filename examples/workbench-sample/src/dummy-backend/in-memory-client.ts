import {
  SampleHostBackendApiError,
  SampleHostBackendRoutes,
  createSampleHostBackendErrorBody,
  parseSampleHostBackendSession,
  type SampleHostBackendClient,
  type SampleHostBackendLinkedAccount,
  type SampleHostBackendProfile,
  type SampleHostBackendSession,
  type SampleHostBackendSignInRequest,
} from '@workbench-kit/contracts';

export const SAMPLE_HOST_BACKEND_NAME = 'Sample Dummy Backend' as const;
export const SAMPLE_AUTH_USERNAME = 'tester' as const;
export const SAMPLE_AUTH_BASIC_USERNAME = 'basic' as const;
export const SAMPLE_AUTH_SESSION_KEY = 'workbench-sample.auth.session' as const;

const SAMPLE_HOST_BACKEND_SESSION_LATENCY_MS = 350;
const SAMPLE_HOST_BACKEND_SIGN_IN_LATENCY_MS = 450;
const SAMPLE_HOST_BACKEND_SIGN_OUT_LATENCY_MS = 160;

export type SampleProfile = SampleHostBackendProfile;
export type SampleLinkedAccount = SampleHostBackendLinkedAccount;
export type SampleAuthSession = SampleHostBackendSession;
export type SampleAuthCredentials = Pick<SampleHostBackendSignInRequest, 'identifier' | 'password'>;

export function createSampleMockProfile(
  workspaceLabel: string,
  accountId: string = SAMPLE_AUTH_USERNAME,
): SampleHostBackendProfile {
  const isBasic = accountId === SAMPLE_AUTH_BASIC_USERNAME;

  return {
    accountId,
    displayName: isBasic ? 'Basic User' : 'Tester',
    email: isBasic ? 'basic@workbench-sample.local' : 'tester@workbench-sample.local',
    providerLabel: SAMPLE_HOST_BACKEND_NAME,
    roleLabel: isBasic ? 'Basic' : 'Administrator',
    sessionLabel: 'Dummy backend session active - fixed response without a running server',
    statusLabel: 'Active',
    workspaceLabel,
  };
}

export function createSampleMockLinkedAccounts(): readonly SampleHostBackendLinkedAccount[] {
  return [
    {
      displayName: 'GitHub Project Access',
      email: 'project-bot@workbench-sample.local',
      id: 'github-project',
      providerId: 'github',
      providerLabel: 'GitHub',
      status: 'signed-out',
    },
    {
      displayName: 'CI Package Registry',
      email: 'registry-bot@workbench-sample.local',
      id: 'package-registry',
      providerId: 'npm',
      providerLabel: 'npm',
      status: 'active',
    },
  ];
}

export function createInMemorySampleHostBackendClient(): SampleHostBackendClient {
  return {
    getSession(query) {
      return delaySampleHostBackend(() => {
        const accountId = readSampleAuthSession();
        if (!accountId) {
          return { status: 'unauthenticated' };
        }

        return createSampleAuthenticatedSession(query?.workspaceLabel ?? 'Workbench Sample', accountId);
      }, SAMPLE_HOST_BACKEND_SESSION_LATENCY_MS);
    },
    signIn(request) {
      return delaySampleHostBackend(() => {
        if (!validateSampleLogin(request.identifier, request.password)) {
          throw new SampleHostBackendApiError(
            'invalid_credentials',
            'Invalid username or password.',
            { status: 401 },
          );
        }

        writeSampleAuthSession(request.identifier.trim());
        return createSampleAuthenticatedSession(
          request.workspaceLabel ?? 'Workbench Sample',
          request.identifier.trim(),
        );
      }, SAMPLE_HOST_BACKEND_SIGN_IN_LATENCY_MS);
    },
    signOut() {
      return delaySampleHostBackend(() => {
        clearSampleAuthSession();
        return { status: 'unauthenticated' };
      }, SAMPLE_HOST_BACKEND_SIGN_OUT_LATENCY_MS);
    },
  };
}

export function validateSampleLogin(identifier: string, password: string): boolean {
  const normalizedIdentifier = identifier.trim();

  if (normalizedIdentifier === SAMPLE_AUTH_USERNAME && password === SAMPLE_AUTH_USERNAME) {
    return true;
  }

  return (
    normalizedIdentifier === SAMPLE_AUTH_BASIC_USERNAME && password === SAMPLE_AUTH_BASIC_USERNAME
  );
}

export function readSampleAuthSession(): string | undefined {
  if (typeof sessionStorage === 'undefined') {
    return undefined;
  }

  const value = sessionStorage.getItem(SAMPLE_AUTH_SESSION_KEY);
  if (value === SAMPLE_AUTH_USERNAME || value === SAMPLE_AUTH_BASIC_USERNAME) {
    return value;
  }

  return undefined;
}

export function writeSampleAuthSession(accountId: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(SAMPLE_AUTH_SESSION_KEY, accountId);
}

export function clearSampleAuthSession(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
}

function createSampleAuthenticatedSession(
  workspaceLabel: string,
  accountId: string,
): SampleHostBackendSession {
  return {
    linkedAccounts: createSampleMockLinkedAccounts(),
    profile: createSampleMockProfile(workspaceLabel, accountId),
    status: 'authenticated',
  };
}

function delaySampleHostBackend<T>(factory: () => T, latencyMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    globalThis.setTimeout(() => {
      try {
        resolve(factory());
      } catch (error) {
        reject(error);
      }
    }, latencyMs);
  });
}

export {
  createSampleHostBackendErrorBody,
  parseSampleHostBackendSession,
  SampleHostBackendApiError,
  SampleHostBackendRoutes,
};
