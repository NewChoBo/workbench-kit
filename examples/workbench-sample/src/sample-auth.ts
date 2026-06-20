import { createSampleHostBackendClient } from './dummy-backend/index.js';

export * from './dummy-backend/index.js';

const defaultSampleHostBackendClient = createSampleHostBackendClient();

/** @deprecated Prefer `createSampleHostBackendClient().getSession()` */
export function readSampleDummyBackendSession(workspaceLabel: string) {
  return defaultSampleHostBackendClient.getSession({ workspaceLabel });
}

/** @deprecated Prefer `createSampleHostBackendClient().signIn()` */
export function signInSampleDummyBackend(
  credentials: { readonly identifier: string; readonly password: string },
  workspaceLabel: string,
) {
  return defaultSampleHostBackendClient.signIn({
    identifier: credentials.identifier,
    password: credentials.password,
    workspaceLabel,
  });
}

/** @deprecated Prefer `createSampleHostBackendClient().signOut()` */
export function signOutSampleDummyBackend() {
  return defaultSampleHostBackendClient.signOut();
}
