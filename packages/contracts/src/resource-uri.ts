export type ResourceUri = string;
export type ResourceIdentityKey = string;

export interface ResourceIdentity {
  readonly key: ResourceIdentityKey;
  readonly uri: ResourceUri;
}

const resourceSchemePattern = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

export function normalizeResourceUri(value: string): ResourceUri {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('Resource URI is required.');
  }

  if (!resourceSchemePattern.test(trimmed)) {
    throw new Error(`Resource URI must include a scheme: ${trimmed}`);
  }

  return trimmed;
}

export function createResourceIdentity(uri: string): ResourceIdentity {
  const normalizedUri = normalizeResourceUri(uri);
  return {
    key: createResourceIdentityKey(normalizedUri),
    uri: normalizedUri,
  };
}

export function createResourceIdentityKey(uri: string): ResourceIdentityKey {
  return normalizeResourceUri(uri);
}

export function isSameResourceUri(left: string, right: string): boolean {
  return createResourceIdentityKey(left) === createResourceIdentityKey(right);
}
