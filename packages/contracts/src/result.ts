export type ServiceFailureCode =
  | 'invalid-path'
  | 'not-found'
  | 'path-conflict'
  | 'stale-update'
  | 'unknown';

export interface ServiceFailure {
  code: ServiceFailureCode;
  message?: string;
}

export interface ServiceResultEnvelope {
  requestId?: string;
  requestedAt?: string;
}

export interface ServiceListener<TEvent> {
  (event: TEvent): void;
}

export function normalizeServiceFailureMessage(
  error: unknown,
  fallback: string = 'Unknown repository error',
): string {
  return error instanceof Error ? error.message : fallback;
}
