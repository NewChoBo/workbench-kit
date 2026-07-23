export interface AssetCachePolicy {
  /** Max age in ms; expired entries are treated as missing. */
  readonly ttlMs: number;
  /** Max bytes accepted for a single cached asset. */
  readonly maxBytes: number;
}

export interface CachedAssetMeta {
  readonly relativePath: string;
  readonly contentType: string;
  readonly fetchedAt: number;
  readonly byteLength: number;
}

export interface AssetCacheStore {
  readMeta(cacheKey: string): Promise<CachedAssetMeta | null>;
  writeMeta(cacheKey: string, meta: CachedAssetMeta): Promise<void>;
  readBytes(relativePath: string): Promise<Uint8Array | null>;
  writeBytes(relativePath: string, bytes: Uint8Array): Promise<void>;
}

export interface FetchAllowlistedHttps {
  (url: string): Promise<{ bytes: Uint8Array; contentType: string }>;
}

export interface PrivilegedProtocolApi {
  registerSchemesAsPrivileged?: (
    schemes: ReadonlyArray<{ scheme: string; privileges: Record<string, boolean> }>,
  ) => void;
  handle: (
    scheme: string,
    handler: (request: { url: string }) => Promise<{ data: Uint8Array; mimeType: string }>,
  ) => void;
}

export interface PathRootHelpers {
  /** Resolve a relative key under the cache root; must reject escapes. */
  readonly resolveInsideRoot: (root: string, relativePath: string) => string;
}

export interface RegisterRootConfinedAssetProtocolOptions extends PathRootHelpers {
  readonly scheme: string;
  readonly cacheRoot: string;
  readonly protocol: PrivilegedProtocolApi;
  readonly cache: AssetCacheStore;
  readonly policy: AssetCachePolicy;
  /** Enable CORS for the privileged scheme only when the host explicitly requires it. */
  readonly corsEnabled?: boolean;
  readonly now?: () => number;
}

function relativeAssetPath(cacheKey: string): string {
  return `objects/${cacheKey}.bin`;
}

function cacheKeyFromProtocolUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  const fromHost = url.hostname.trim();
  if (fromHost.length > 0) {
    return decodeURIComponent(fromHost);
  }
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

/**
 * Populate the root-confined cache from an allowlisted HTTPS response.
 * Hosts own which URLs are fetched and how hash/TTL/size policy is chosen.
 * Inject `resolveInsideRoot` from `@workbench-kit/platform/node` (or a test fake).
 */
export async function cacheAllowlistedHttpsAsset(
  options: PathRootHelpers & {
    readonly url: string;
    readonly cacheRoot: string;
    readonly cache: AssetCacheStore;
    readonly policy: AssetCachePolicy;
    readonly hashCacheKey: (url: string) => string;
    readonly fetchHttps: FetchAllowlistedHttps;
    readonly now?: () => number;
  },
): Promise<CachedAssetMeta> {
  const cacheKey = options.hashCacheKey(options.url);
  const relativePath = relativeAssetPath(cacheKey);
  options.resolveInsideRoot(options.cacheRoot, relativePath);

  const response = await options.fetchHttps(options.url);
  if (response.bytes.byteLength > options.policy.maxBytes) {
    throw new Error('Cached asset exceeds the configured maxBytes limit.');
  }

  await options.cache.writeBytes(relativePath, response.bytes);
  const meta: CachedAssetMeta = {
    relativePath,
    contentType: response.contentType || 'application/octet-stream',
    fetchedAt: (options.now ?? Date.now)(),
    byteLength: response.bytes.byteLength,
  };
  await options.cache.writeMeta(cacheKey, meta);
  return meta;
}

/**
 * Register a privileged custom protocol that serves only files under `cacheRoot`.
 * Unknown / expired cache keys reject; path escapes are rejected by `resolveInsideRoot`.
 */
export function registerRootConfinedAssetProtocol(
  options: RegisterRootConfinedAssetProtocolOptions,
): void {
  const {
    scheme,
    cacheRoot,
    protocol,
    cache,
    policy,
    resolveInsideRoot,
    corsEnabled = false,
  } = options;
  const now = options.now ?? Date.now;

  protocol.registerSchemesAsPrivileged?.([
    {
      scheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled,
        stream: true,
      },
    },
  ]);

  protocol.handle(scheme, async (request) => {
    const cacheKey = cacheKeyFromProtocolUrl(request.url);
    if (!cacheKey) {
      throw new Error('Asset protocol request is missing a cache key.');
    }

    const meta = await cache.readMeta(cacheKey);
    if (meta === null) {
      throw new Error('Cached asset is not present.');
    }
    if (now() - meta.fetchedAt > policy.ttlMs) {
      throw new Error('Cached asset has expired.');
    }

    resolveInsideRoot(cacheRoot, meta.relativePath);

    const bytes = await cache.readBytes(meta.relativePath);
    if (bytes === null) {
      throw new Error('Cached asset bytes are missing.');
    }

    return {
      data: bytes,
      mimeType: meta.contentType,
    };
  });
}
