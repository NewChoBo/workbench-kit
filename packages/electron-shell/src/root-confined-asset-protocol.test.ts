import { describe, expect, it } from 'vitest';

import {
  cacheAllowlistedHttpsAsset,
  registerRootConfinedAssetProtocol,
  type AssetCacheStore,
  type CachedAssetMeta,
} from './root-confined-asset-protocol.js';

function createMemoryCache(): AssetCacheStore & {
  metas: Map<string, CachedAssetMeta>;
  bytes: Map<string, Uint8Array>;
} {
  const metas = new Map<string, CachedAssetMeta>();
  const bytes = new Map<string, Uint8Array>();
  return {
    metas,
    bytes,
    async readMeta(cacheKey) {
      return metas.get(cacheKey) ?? null;
    },
    async writeMeta(cacheKey, meta) {
      metas.set(cacheKey, meta);
    },
    async readBytes(relativePath) {
      return bytes.get(relativePath) ?? null;
    },
    async writeBytes(relativePath, value) {
      bytes.set(relativePath, value);
    },
  };
}

function resolveInsideRoot(root: string, relativePath: string): string {
  if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) {
    throw new Error('Path escapes the configured root directory.');
  }
  return `${root.replace(/\\/g, '/')}/${relativePath}`;
}

describe('root-confined asset protocol helpers', () => {
  it('caches an HTTPS asset and serves it by protocol key', async () => {
    const cache = createMemoryCache();
    const payload = new TextEncoder().encode('image-bytes');

    const meta = await cacheAllowlistedHttpsAsset({
      url: 'https://cdn.example.com/a.png',
      cacheRoot: '/cache',
      cache,
      policy: { ttlMs: 60_000, maxBytes: 1024 },
      hashCacheKey: () => 'abc123',
      fetchHttps: async () => ({ bytes: payload, contentType: 'image/png' }),
      resolveInsideRoot,
      now: () => 1_000,
    });

    expect(meta.relativePath).toBe('objects/abc123.bin');

    let handled: { data: Uint8Array; mimeType: string } | undefined;
    let handler:
      | ((request: { url: string }) => Promise<{ data: Uint8Array; mimeType: string }>)
      | undefined;

    registerRootConfinedAssetProtocol({
      scheme: 'wk-asset',
      cacheRoot: '/cache',
      cache,
      policy: { ttlMs: 60_000, maxBytes: 1024 },
      resolveInsideRoot,
      now: () => 1_500,
      protocol: {
        registerSchemesAsPrivileged: () => undefined,
        handle: (_scheme, next) => {
          handler = next;
        },
      },
    });

    handled = await handler!({ url: 'wk-asset://abc123' });
    expect(handled.mimeType).toBe('image/png');
    expect(new TextDecoder().decode(handled.data)).toBe('image-bytes');
  });

  it('rejects oversized assets, path escapes, and expired cache entries', async () => {
    const cache = createMemoryCache();

    await expect(
      cacheAllowlistedHttpsAsset({
        url: 'https://cdn.example.com/big.bin',
        cacheRoot: '/cache',
        cache,
        policy: { ttlMs: 60_000, maxBytes: 4 },
        hashCacheKey: () => 'big',
        fetchHttps: async () => ({
          bytes: new Uint8Array([1, 2, 3, 4, 5]),
          contentType: 'application/octet-stream',
        }),
        resolveInsideRoot,
      }),
    ).rejects.toThrow(/maxBytes/i);

    await expect(
      cacheAllowlistedHttpsAsset({
        url: 'https://cdn.example.com/escape.bin',
        cacheRoot: '/cache',
        cache,
        policy: { ttlMs: 60_000, maxBytes: 1024 },
        hashCacheKey: () => '../escape',
        fetchHttps: async () => ({
          bytes: new Uint8Array([1]),
          contentType: 'application/octet-stream',
        }),
        resolveInsideRoot,
      }),
    ).rejects.toThrow(/escapes/i);

    cache.metas.set('old', {
      relativePath: 'objects/old.bin',
      contentType: 'text/plain',
      fetchedAt: 0,
      byteLength: 1,
    });
    cache.bytes.set('objects/old.bin', new Uint8Array([9]));

    let handler:
      | ((request: { url: string }) => Promise<{ data: Uint8Array; mimeType: string }>)
      | undefined;
    registerRootConfinedAssetProtocol({
      scheme: 'wk-asset',
      cacheRoot: '/cache',
      cache,
      policy: { ttlMs: 10, maxBytes: 1024 },
      resolveInsideRoot,
      now: () => 1_000,
      protocol: {
        handle: (_scheme, next) => {
          handler = next;
        },
      },
    });

    await expect(handler!({ url: 'wk-asset://old' })).rejects.toThrow(/expired/i);
  });
});
