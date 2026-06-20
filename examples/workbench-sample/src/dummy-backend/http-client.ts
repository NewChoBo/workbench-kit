import {
  SampleHostBackendApiError,
  SampleHostBackendRoutes,
  isSampleHostBackendErrorBody,
  parseSampleHostBackendSession,
  type SampleHostBackendClient,
  type SampleHostBackendSession,
} from '@workbench-kit/contracts';

export interface HttpSampleHostBackendClientOptions {
  readonly baseUrl?: string | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
}

export function createHttpSampleHostBackendClient(
  options: HttpSampleHostBackendClientOptions = {},
): SampleHostBackendClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    getSession(query) {
      const url = new URL(`${baseUrl}${SampleHostBackendRoutes.session}`, resolveOrigin(baseUrl));
      if (query?.workspaceLabel) {
        url.searchParams.set('workspaceLabel', query.workspaceLabel);
      }

      return requestSession(fetchImpl, url, { method: 'GET' });
    },
    signIn(request) {
      return requestSession(
        fetchImpl,
        new URL(`${baseUrl}${SampleHostBackendRoutes.signIn}`, resolveOrigin(baseUrl)),
        {
          body: JSON.stringify(request),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
    },
    signOut() {
      return requestSession(
        fetchImpl,
        new URL(`${baseUrl}${SampleHostBackendRoutes.signOut}`, resolveOrigin(baseUrl)),
        { method: 'POST' },
      );
    },
  };
}

async function requestSession(
  fetchImpl: typeof fetch,
  url: URL,
  init: RequestInit,
): Promise<SampleHostBackendSession> {
  let response: Response;

  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new SampleHostBackendApiError(
      'network_error',
      'Unable to reach the sample host backend.',
    );
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (isSampleHostBackendErrorBody(payload)) {
      throw new SampleHostBackendApiError(payload.error.code, payload.error.message, {
        details: payload.error.details,
        status: response.status,
      });
    }

    throw new SampleHostBackendApiError(
      'unexpected_response',
      'Unexpected backend error response.',
      {
        status: response.status,
      },
    );
  }

  return parseSampleHostBackendSession(payload);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SampleHostBackendApiError('unexpected_response', 'Backend returned invalid JSON.', {
      status: response.status,
    });
  }
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl || baseUrl.trim().length === 0) {
    return '';
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function resolveOrigin(baseUrl: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return baseUrl.startsWith('http') ? baseUrl : 'http://127.0.0.1:5173';
}
