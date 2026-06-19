export const SAMPLE_AUTH_USERNAME = 'tester' as const;
export const SAMPLE_AUTH_SESSION_KEY = 'workbench-sample.auth.session' as const;

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
  sessionStorage.setItem(SAMPLE_AUTH_SESSION_KEY, SAMPLE_AUTH_USERNAME);
}

export function clearSampleAuthSession(): void {
  sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
}
