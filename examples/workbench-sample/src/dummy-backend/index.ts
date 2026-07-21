import type { SampleHostBackendClient } from '@workbench-kit/contracts';

import {
  createHttpSampleHostBackendClient,
  type HttpSampleHostBackendClientOptions,
} from './http-client.js';
import { createInMemorySampleHostBackendClient } from './in-memory-client.js';

export type SampleHostBackendTransport = 'http' | 'in-memory';

export interface CreateSampleHostBackendClientOptions extends HttpSampleHostBackendClientOptions {
  readonly transport?: SampleHostBackendTransport | undefined;
}

export function createSampleHostBackendClient(
  options: CreateSampleHostBackendClientOptions = {},
): SampleHostBackendClient {
  const transport = options.transport ?? readConfiguredTransport();
  const resolvedOptions = {
    ...options,
    baseUrl: options.baseUrl ?? readConfiguredBaseUrl(),
  };

  if (transport === 'http') {
    return createHttpSampleHostBackendClient(resolvedOptions);
  }

  return createInMemorySampleHostBackendClient();
}

function readConfiguredTransport(): SampleHostBackendTransport {
  const configured = import.meta.env.VITE_SAMPLE_HOST_BACKEND_TRANSPORT;
  return configured === 'http' ? 'http' : 'in-memory';
}

function readConfiguredBaseUrl(): string | undefined {
  const configured = import.meta.env.VITE_SAMPLE_HOST_BACKEND_BASE_URL;
  return typeof configured === 'string' && configured.trim().length > 0 ? configured : undefined;
}

export { createHttpSampleHostBackendClient } from './http-client.js';
export {
  SAMPLE_AUTH_SESSION_KEY,
  SAMPLE_AUTH_USERNAME,
  SAMPLE_HOST_BACKEND_NAME,
  createInMemorySampleHostBackendClient,
  createSampleMockLinkedAccounts,
  createSampleMockProfile,
  type SampleAuthCredentials,
  type SampleAuthSession,
  type SampleLinkedAccount,
  type SampleProfile,
} from './in-memory-client.js';
