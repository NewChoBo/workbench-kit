export interface CreateAllowlistedHttpsFetchOptions {
  /** Exact hostname allowlist (no ports). Hosts inject the list. */
  readonly allowedHosts: readonly string[];
  /** Injected fetch; defaults to `globalThis.fetch`. */
  readonly fetch?: typeof globalThis.fetch;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function assertAllowedHttpsUrl(url: string, allowedHosts: ReadonlySet<string>): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL is not a valid absolute URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https: URLs are allowed.');
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!allowedHosts.has(hostname)) {
    throw new Error('Hostname is not in the allowlist.');
  }

  return parsed;
}

/**
 * Wraps `fetch` with an HTTPS-only + hostname allowlist policy.
 * Hosts inject `allowedHosts`; kit does not ship concrete API host catalogs.
 */
export function createAllowlistedHttpsFetch(
  options: CreateAllowlistedHttpsFetchOptions,
): typeof globalThis.fetch {
  const allowedHosts = new Set(
    options.allowedHosts.map(normalizeHostname).filter((host) => host.length > 0),
  );
  const baseFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  const allowlistedFetch: typeof globalThis.fetch = (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    try {
      assertAllowedHttpsUrl(url, allowedHosts);
    } catch (error) {
      // Match fetch's Promise-based surface so callers can use `.catch` / rejects.
      return Promise.reject(error);
    }
    return baseFetch(input, init);
  };

  return allowlistedFetch;
}
