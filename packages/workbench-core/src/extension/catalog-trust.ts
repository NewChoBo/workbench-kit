/**
 * Host-configurable trust policy for extension catalog URLs (#143).
 *
 * Default policy allows same-app relative/path-only catalogs and denies absolute
 * remote origins until the host lists them in `allowedOrigins`.
 */

export interface ExtensionCatalogTrustPolicy {
  /**
   * Allow path-only or relative catalog URLs (`/catalog.json`, `./x.json`).
   * Defaults to `true`.
   */
  readonly allowRelativeUrls?: boolean | undefined;
  /**
   * Allowed absolute origins (e.g. `https://cdn.example.com`).
   * Empty (default) denies all absolute URLs. Use `*` only as an explicit escape hatch.
   */
  readonly allowedOrigins?: readonly string[] | undefined;
}

export const DEFAULT_EXTENSION_CATALOG_TRUST_POLICY: ExtensionCatalogTrustPolicy = {
  allowRelativeUrls: true,
  allowedOrigins: [],
};

export class ExtensionCatalogUrlNotAllowedError extends Error {
  readonly code = 'extension_catalog_url_not_allowed' as const;

  constructor(message = 'Extension catalog URL is not allowed by the host trust policy.') {
    super(message);
    this.name = 'ExtensionCatalogUrlNotAllowedError';
  }
}

export function assertExtensionCatalogUrlAllowed(
  catalogUrl: string,
  policy: ExtensionCatalogTrustPolicy = DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
): void {
  const trimmed = catalogUrl.trim();
  if (!trimmed) {
    throw new ExtensionCatalogUrlNotAllowedError('Extension catalog URL must be non-empty.');
  }

  const allowRelative = policy.allowRelativeUrls !== false;
  const allowedOrigins = policy.allowedOrigins ?? [];

  if (isPathOnlyOrRelativeCatalogUrl(trimmed)) {
    if (!allowRelative) {
      throw new ExtensionCatalogUrlNotAllowedError(
        `Relative extension catalog URL is not allowed: ${trimmed}`,
      );
    }
    return;
  }

  const origin = resolveCatalogUrlOrigin(trimmed);
  if (!origin) {
    throw new ExtensionCatalogUrlNotAllowedError(
      `Extension catalog URL could not be parsed: ${trimmed}`,
    );
  }

  if (allowedOrigins.includes('*')) {
    return;
  }

  const normalizedAllowed = new Set(
    allowedOrigins
      .map((entry) => normalizeOrigin(entry))
      .filter((entry): entry is string => Boolean(entry)),
  );

  if (!normalizedAllowed.has(origin)) {
    throw new ExtensionCatalogUrlNotAllowedError(
      `Extension catalog origin is not allowlisted: ${origin}`,
    );
  }
}

function isPathOnlyOrRelativeCatalogUrl(url: string): boolean {
  if (url.startsWith('//')) {
    return false;
  }
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function resolveCatalogUrlOrigin(url: string): string | undefined {
  try {
    if (url.startsWith('//')) {
      return new URL(`https:${url}`).origin;
    }
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function normalizeOrigin(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '*') {
    return undefined;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return undefined;
    }
  }
}
