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
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/v1/items', {
      redirect: 'error',
    });
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

  it('lets hosts map policy violations without changing request validation', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const createPolicyError = vi.fn((violation: string, url: URL) => {
      return new Error(`${violation}: ${url.hostname}`);
    });
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      createPolicyError,
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });

    await expect(fetch('http://api.example.com/v1')).rejects.toThrow(
      'https-required: api.example.com',
    );
    await expect(fetch('https://evil.example.com/v1')).rejects.toThrow(
      'hostname-not-allowlisted: evil.example.com',
    );
    expect(createPolicyError).toHaveBeenCalledTimes(2);
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

  it('overrides init redirect modes without mutating request options', async () => {
    const response = new Response('ok');
    const fetchImpl = vi.fn<typeof globalThis.fetch>(async () => response);
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl as unknown as typeof globalThis.fetch,
    });
    const signal = new AbortController().signal;
    const headers = new Headers({ 'content-type': 'text/plain' });
    for (const redirect of ['follow', 'manual', 'error'] as const) {
      const init = Object.freeze({ method: 'POST', body: 'payload', headers, signal, redirect });
      expect(await fetch('https://api.example.com/', init)).toBe(response);
      expect(fetchImpl).toHaveBeenLastCalledWith('https://api.example.com/', {
        ...init,
        redirect: 'error',
      });
      expect(init.redirect).toBe(redirect);
      expect(fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1]?.[1]).not.toBe(init);
    }
  });

  it('overrides Request redirect without cloning or changing the Request', async () => {
    const fetchImpl = vi.fn<typeof globalThis.fetch>(async () => new Response('ok'));
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl,
    });
    const request = new Request('https://api.example.com/', {
      method: 'POST',
      body: 'payload',
      redirect: 'follow',
    });
    await fetch(request);
    expect(fetchImpl).toHaveBeenCalledWith(request, { redirect: 'error' });
    expect(request.redirect).toBe('follow');
    expect(request.bodyUsed).toBe(false);
    expect(await request.text()).toBe('payload');
  });

  it('preserves transport failure and cancellation causes', async () => {
    const transportError = new TypeError('transport failed');
    const controller = new AbortController();
    const abortReason = new Error('host cancelled');
    controller.abort(abortReason);
    const fetchImpl = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      if (init?.signal?.aborted) throw init.signal.reason;
      throw transportError;
    });
    const fetch = createAllowlistedHttpsFetch({
      allowedHosts: ['api.example.com'],
      fetch: fetchImpl,
    });
    await expect(fetch('https://api.example.com/')).rejects.toBe(transportError);
    await expect(fetch('https://api.example.com/', { signal: controller.signal })).rejects.toBe(
      abortReason,
    );
  });
});
