import { isSchemeUrlTarget } from './scheme-url-target';

const EXTERNAL_URL_PROTOCOLS: Record<ExternalUrlPolicy, ReadonlySet<string>> = {
  'system-launch': new Set(['http:', 'https:', 'steam:']),
  'web-navigation': new Set(['http:', 'https:']),
};

export { EXTERNAL_URL_PROTOCOLS };
export type ExternalUrlPolicy = 'system-launch' | 'web-navigation';

export function normalizeExternalUrlTarget(
  target: string | null,
  policy: ExternalUrlPolicy,
): string | null {
  if (typeof target !== 'string') {
    return null;
  }

  const normalizedTarget = target.trim();
  if (normalizedTarget.length === 0) {
    return null;
  }

  if (!isSchemeUrlTarget(normalizedTarget)) {
    return null;
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(normalizedTarget);
  } catch {
    return null;
  }

  const protocol = parsedTarget.protocol.toLowerCase();
  if (!EXTERNAL_URL_PROTOCOLS[policy].has(protocol)) {
    return null;
  }

  if (
    (protocol === 'http:' || protocol === 'https:') &&
    parsedTarget.hostname.trim().length === 0
  ) {
    return null;
  }

  return parsedTarget.toString();
}
