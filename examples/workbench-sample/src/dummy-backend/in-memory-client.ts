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
export const SAMPLE_AUTH_SESSION_KEY = 'workbench-sample.auth.session' as const;

const SAMPLE_HOST_BACKEND_SESSION_LATENCY_MS = 350;
const SAMPLE_HOST_BACKEND_SIGN_IN_LATENCY_MS = 450;
const SAMPLE_HOST_BACKEND_SIGN_OUT_LATENCY_MS = 160;

export type SampleProfile = SampleHostBackendProfile;
export type SampleLinkedAccount = SampleHostBackendLinkedAccount;
export type SampleAuthSession = SampleHostBackendSession;
export type SampleAuthCredentials = Pick<SampleHostBackendSignInRequest, 'identifier' | 'password'>;

export function createSampleMockProfile(workspaceLabel: string): SampleHostBackendProfile {
  return {
    accountId: SAMPLE_AUTH_USERNAME,
    displayName: 'Tester',
    email: 'tester@workbench-sample.local',
    providerLabel: SAMPLE_HOST_BACKEND_NAME,
    roleLabel: 'Developer',
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
        if (!readSampleAuthSession()) {
          return { status: 'unauthenticated' };
        }

        return createSampleAuthenticatedSession(query?.workspaceLabel ?? 'Workbench Sample');
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

        writeSampleAuthSession();
        return createSampleAuthenticatedSession(request.workspaceLabel ?? 'Workbench Sample');
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
  return identifier.trim() === SAMPLE_AUTH_USERNAME && password === SAMPLE_AUTH_USERNAME;
}

export function readSampleAuthSession(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  return sessionStorage.getItem(SAMPLE_AUTH_SESSION_KEY) === SAMPLE_AUTH_USERNAME;
}

export function writeSampleAuthSession(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(SAMPLE_AUTH_SESSION_KEY, SAMPLE_AUTH_USERNAME);
}

export function clearSampleAuthSession(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
}

function createSampleAuthenticatedSession(workspaceLabel: string): SampleHostBackendSession {
  return {
    linkedAccounts: createSampleMockLinkedAccounts(),
    profile: createSampleMockProfile(workspaceLabel),
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
