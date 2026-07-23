/**
 * Allowlist markdown link targets for safe preview rendering.
 * Blocks javascript:/data:/vbscript: and other non-navigation schemes.
 */
export function sanitizeMarkdownHref(href: string | undefined): string | undefined {
  if (href == null || href.trim() === '') {
    return undefined;
  }

  const trimmed = href.trim();
  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    const base =
      typeof globalThis.location?.href === 'string' && globalThis.location.href.length > 0
        ? globalThis.location.href
        : 'https://workbench.local/';
    const url = new URL(trimmed, base);
    const protocol = url.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      return trimmed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
