export type HostLaunchPlatform = 'linux' | 'win32' | 'darwin';

export type HostLaunchIntent =
  | { readonly kind: 'external-uri'; readonly uri: string }
  | { readonly kind: 'native-executable'; readonly path: string }
  | { readonly kind: 'windows-default-path'; readonly path: string };

export type HostLaunchReason =
  | 'invalid-target'
  | 'unsupported-platform'
  | 'unsupported-target'
  | 'policy-blocked'
  | 'missing-target'
  | 'permission-denied'
  | 'handler-unavailable'
  | 'dispatch-failed';

export type HostLaunchAssessment =
  | { readonly status: 'requestable'; readonly targetPresence: 'unknown' }
  | { readonly status: 'blocked'; readonly reason: HostLaunchReason };

export type HostLaunchResult =
  | { readonly status: 'accepted' }
  | { readonly status: 'blocked' | 'failed'; readonly reason: HostLaunchReason };

export interface HostLaunchService {
  /** Synchronous shape, platform and policy only; never proof of installation. */
  assess(intent: unknown): HostLaunchAssessment;
  launch(intent: unknown): Promise<HostLaunchResult>;
}

export interface HostLaunchChild {
  once(event: 'spawn', listener: () => void): unknown;
  once(event: 'error', listener: (error: unknown) => void): unknown;
  unref(): void;
}

export interface CreateHostLaunchServiceOptions {
  readonly platform: HostLaunchPlatform;
  readonly allowExternalUri: (uri: URL, original: string, platform: HostLaunchPlatform) => boolean;
  readonly probePath: (path: string) => Promise<{
    readonly canonicalPath: string;
    readonly kind: 'regular-file' | 'directory' | 'other' | 'missing';
    readonly executable: boolean;
    readonly format: 'elf' | 'other' | 'unknown';
  }>;
  readonly spawn: (
    file: string,
    args: readonly string[],
    options: { readonly shell: false; readonly detached: true; readonly stdio: 'ignore' },
  ) => HostLaunchChild;
  readonly openExternal: (uri: string) => Promise<void>;
  /** Explicit legacy desktop-default-open behavior, not executable-only validation. */
  readonly openPath: (path: string) => Promise<string>;
}

type Blocked = Extract<HostLaunchAssessment, { status: 'blocked' }>;
type Validated = { readonly intent: HostLaunchIntent } | Blocked;

function blocked(reason: HostLaunchReason): Blocked {
  return { status: 'blocked', reason };
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !hasControlCharacter(value)
  );
}

function isPosixAbsolutePath(value: unknown): value is string {
  return isBoundedText(value, 32768) && value.startsWith('/') && !value.startsWith('//');
}

function isWindowsAbsolutePath(value: unknown): value is string {
  if (!isBoundedText(value, 32768) || /[<>"|?*]/u.test(value)) return false;
  if (value.startsWith('\\\\.\\')) return false;
  if (/^[a-z]:[\\/]/iu.test(value)) return !value.slice(2).includes(':');
  return /^\\\\[^\\/:]+\\[^\\/:]+(?:[\\/]|$)/u.test(value) && !value.includes(':');
}

function readIntent(input: unknown): HostLaunchIntent | undefined {
  if (!input || typeof input !== 'object') return undefined;
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(descriptors).length !== 2) return undefined;
    const kindDescriptor = descriptors.kind;
    if (!kindDescriptor || !('value' in kindDescriptor)) return undefined;
    const kind: unknown = kindDescriptor.value;
    const valueDescriptor = descriptors[kind === 'external-uri' ? 'uri' : 'path'];
    if (!valueDescriptor || !('value' in valueDescriptor)) return undefined;
    const value: unknown = valueDescriptor.value;
    if (typeof value !== 'string') return undefined;
    if (kind === 'external-uri') return { kind, uri: value };
    if (kind === 'native-executable' || kind === 'windows-default-path') {
      return { kind, path: value };
    }
  } catch {
    // Proxies and accessors are not execution intents.
  }
  return undefined;
}

function validateUri(
  uri: string,
  platform: HostLaunchPlatform,
  allow: CreateHostLaunchServiceOptions['allowExternalUri'],
): Blocked | undefined {
  if (
    !isBoundedText(uri, 8192) ||
    /\s/u.test(uri) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu.test(uri) ||
    !/^[a-z][a-z0-9+.-]*:/iu.test(uri)
  ) {
    return blocked('invalid-target');
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return blocked('invalid-target');
  }
  if (parsed.username || parsed.password) return blocked('invalid-target');
  if (['file:', 'javascript:', 'data:', 'vbscript:', 'blob:', 'about:'].includes(parsed.protocol)) {
    return blocked('policy-blocked');
  }
  try {
    if (!allow(parsed, uri, platform)) return blocked('policy-blocked');
  } catch {
    return blocked('policy-blocked');
  }
  return undefined;
}

function errorReason(error: unknown): HostLaunchReason {
  let code: unknown;
  try {
    code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  } catch {
    return 'dispatch-failed';
  }
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'missing-target';
  if (code === 'EACCES' || code === 'EPERM') return 'permission-denied';
  if (code === 'ENOEXEC') return 'unsupported-target';
  return 'dispatch-failed';
}

/** Main-only mechanism with host-injected policy and OS ports; accepted is not app-ready. */
export function createHostLaunchService(
  options: CreateHostLaunchServiceOptions,
): HostLaunchService {
  const { platform, allowExternalUri, probePath, spawn, openExternal, openPath } = options;

  function validate(input: unknown): Validated {
    const intent = readIntent(input);
    if (!intent) return blocked('invalid-target');
    if (platform !== 'linux' && platform !== 'win32' && platform !== 'darwin') {
      return blocked('unsupported-platform');
    }
    if (intent.kind === 'external-uri') {
      return validateUri(intent.uri, platform, allowExternalUri) ?? { intent };
    }
    if (intent.kind === 'native-executable') {
      if (platform !== 'linux') return blocked('unsupported-platform');
      if (!isPosixAbsolutePath(intent.path)) return blocked('invalid-target');
    } else {
      if (platform !== 'win32') return blocked('unsupported-platform');
      if (!isWindowsAbsolutePath(intent.path)) return blocked('invalid-target');
    }
    return { intent };
  }

  function spawnNative(canonicalPath: string): Promise<HostLaunchResult> {
    return new Promise((resolve) => {
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        resolve({ status: 'failed', reason: errorReason(error) });
      };
      try {
        // Revalidate the exact probe result immediately before dispatch, never its alias.
        if (!isPosixAbsolutePath(canonicalPath)) {
          resolve(blocked('invalid-target'));
          return;
        }
        const child = spawn(canonicalPath, [], { shell: false, detached: true, stdio: 'ignore' });
        // Keep the error listener after spawn; late process errors must not escape.
        child.once('error', fail);
        child.once('spawn', () => {
          if (settled) return;
          settled = true;
          try {
            child.unref();
          } catch {
            // Spawn already succeeded; a bookkeeping failure does not undo dispatch.
          }
          resolve({ status: 'accepted' });
        });
      } catch (error) {
        fail(error);
      }
    });
  }

  return {
    assess(input) {
      const value = validate(input);
      return 'intent' in value ? { status: 'requestable', targetPresence: 'unknown' } : value;
    },
    async launch(input) {
      const value = validate(input);
      if (!('intent' in value)) return value;
      const { intent } = value;
      if (intent.kind === 'external-uri') {
        try {
          await openExternal(intent.uri);
          return { status: 'accepted' };
        } catch {
          // Electron does not consistently identify absent protocol handlers.
          return { status: 'failed', reason: 'dispatch-failed' };
        }
      }
      try {
        const { canonicalPath, kind, executable, format } = await probePath(intent.path);
        if (kind === 'missing') return blocked('missing-target');
        if (intent.kind === 'native-executable') {
          if (kind !== 'regular-file') return blocked('unsupported-target');
          if (executable !== true) return blocked('permission-denied');
          if (format !== 'elf') return blocked('unsupported-target');
          return spawnNative(canonicalPath);
        }
        if (!isWindowsAbsolutePath(canonicalPath)) return blocked('invalid-target');
        if (kind !== 'regular-file' && kind !== 'directory' && kind !== 'other') {
          return blocked('unsupported-target');
        }
        return (await openPath(canonicalPath)) === ''
          ? { status: 'accepted' }
          : { status: 'failed', reason: 'dispatch-failed' };
      } catch (error) {
        return { status: 'failed', reason: errorReason(error) };
      }
    },
  };
}
