export type ExternalLinkAllowlist = Readonly<Record<string, string>>;

export class UnknownExternalLinkIdError extends Error {
  readonly code = 'unknown_external_link_id' as const;
  readonly linkId: string;

  constructor(linkId: string) {
    super('External link id is not in the allowlist.');
    this.name = 'UnknownExternalLinkIdError';
    this.linkId = linkId;
  }
}

export class InvalidExternalLinkUrlError extends Error {
  readonly code = 'invalid_external_link_url' as const;
  readonly linkId: string;

  constructor(linkId: string, message = 'Allowlisted external link URL is invalid.') {
    super(message);
    this.name = 'InvalidExternalLinkUrlError';
    this.linkId = linkId;
  }
}

export interface OpenAllowlistedExternalLinkInput {
  readonly linkId: string;
  readonly allowlist: ExternalLinkAllowlist;
  readonly openExternal: (url: string) => Promise<void>;
}

function assertHttpsUrl(linkId: string, url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidExternalLinkUrlError(linkId, 'Allowlisted external link URL is not absolute.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new InvalidExternalLinkUrlError(
      linkId,
      'Allowlisted external link URL must use http: or https:.',
    );
  }
}

/**
 * Resolve an opaque link id through a host-injected allowlist, then open via `openExternal`.
 * Pair IPC entry with `requireOwnedWindowForSender`. No product URL catalogs in kit.
 */
export async function openAllowlistedExternalLink(
  input: OpenAllowlistedExternalLinkInput,
): Promise<void> {
  const linkId = input.linkId.trim();
  if (linkId.length === 0) {
    throw new UnknownExternalLinkIdError(linkId);
  }

  const url = input.allowlist[linkId];
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new UnknownExternalLinkIdError(linkId);
  }

  const resolvedUrl = url.trim();
  assertHttpsUrl(linkId, resolvedUrl);
  await input.openExternal(resolvedUrl);
}
