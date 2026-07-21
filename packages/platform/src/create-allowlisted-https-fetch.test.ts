import { describe, expect, it, vi } from 'vitest';

import { createAllowlistedHttpsFetch } from './create-allowlisted-https-fetch.js';

describe('createAllowlistedHttpsFetch', () => {
  it('allows https requests to allowlisted hosts', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await fetch('https://api.example.com/v1/items');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/items');
  });

  it('rejects http URLs', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await expect(fetch('http://api.example.com/v1')).rejects.toThrow(/https/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted hostnames', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await expect(fetch('https://evil.example.com/v1')).rejects.toThrow(/allowlist/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('accepts URL and Request inputs after hostname checks', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['cdn.example.com'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await fetch(new URL('https://cdn.example.com/a.png'));
    await fetch(new Request('https://cdn.example.com/b.png'));

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('normalizes hostnames case-insensitively', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['API.Example.COM'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await fetch('https://api.example.com/');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
