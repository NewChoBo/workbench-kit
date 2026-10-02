import { describe, expect, it, vi } from 'vitest';

import {
  createHostLaunchService,
  type CreateHostLaunchServiceOptions,
  type HostLaunchChild,
  type HostLaunchPlatform,
} from './host-launch.js';

type Observation = Awaited<ReturnType<CreateHostLaunchServiceOptions['probePath']>>;

function fixture(platform: HostLaunchPlatform = 'linux') {
  let onSpawn: (() => void) | undefined;
  let onError: ((error: unknown) => void) | undefined;
  const child: HostLaunchChild = {
    once: vi.fn((event: 'spawn' | 'error', listener: (error?: unknown) => void) => {
      if (event === 'spawn') onSpawn = listener;
      else onError = listener;
    }),
    unref: vi.fn(),
  };
  const observation: Observation = {
    canonicalPath: platform === 'win32' ? 'C:\\Apps\\Editor.exe' : '/opt/editor/bin/editor',
    kind: 'regular-file',
    executable: true,
    format: 'elf',
  };
  const ports = {
    platform,
    allowExternalUri: vi.fn((uri: URL) => uri.protocol === 'https:'),
    probePath: vi.fn(async (): Promise<Observation> => observation),
    spawn: vi.fn(() => child),
    openExternal: vi.fn(async () => undefined),
    openPath: vi.fn(async () => ''),
  } satisfies CreateHostLaunchServiceOptions;
  return {
    ports,
    observation,
    child,
    service: createHostLaunchService(ports),
    emitSpawn: () => onSpawn?.(),
    emitError: (error: unknown) => onError?.(error),
  };
}

const native = { kind: 'native-executable', path: '/usr/local/bin/editor' };
const uri = { kind: 'external-uri', uri: 'https://example.com/help' };

describe('createHostLaunchService', () => {
  it('assesses without effects and does not claim installation', () => {
    const f = fixture();
    expect(f.service.assess(native)).toEqual({ status: 'requestable', targetPresence: 'unknown' });
    expect(f.ports.probePath).not.toHaveBeenCalled();
    expect(f.ports.spawn).not.toHaveBeenCalled();
    expect(f.ports.openExternal).not.toHaveBeenCalled();
    expect(f.ports.openPath).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { ...native, args: [] },
    { ...native, env: {} },
    { ...native, cwd: '/tmp' },
    { ...native, command: 'editor' },
    { kind: 'shell-command', command: 'editor' },
    { ...native, path: '' },
    { ...native, path: 'editor' },
    { ...native, path: '/opt/editor\0' },
    { ...native, path: '/opt/editor\n' },
    { ...native, path: '/opt/editor\u0085' },
    { ...native, path: 'C:\\Apps\\Editor.exe' },
    { ...native, path: '\\\\server\\share\\editor' },
  ])('blocks invalid or expanded execution input without effects: %j', async (input) => {
    const f = fixture();
    expect(f.service.assess(input)).toEqual({ status: 'blocked', reason: 'invalid-target' });
    expect(await f.service.launch(input)).toEqual({ status: 'blocked', reason: 'invalid-target' });
    expect(f.ports.probePath).not.toHaveBeenCalled();
    expect(f.ports.spawn).not.toHaveBeenCalled();
    expect(f.ports.openExternal).not.toHaveBeenCalled();
    expect(f.ports.openPath).not.toHaveBeenCalled();
  });

  it('rejects accessor fields without evaluating them', async () => {
    const f = fixture();
    const getter = vi.fn(() => '/opt/editor');
    const input = Object.defineProperty({ kind: 'native-executable' }, 'path', { get: getter });
    expect(await f.service.launch(input)).toEqual({ status: 'blocked', reason: 'invalid-target' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('waits for probe and spawn and dispatches the canonical path with no shell or argv', async () => {
    const f = fixture();
    let resolveProbe!: (value: Observation) => void;
    f.ports.probePath.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const settled = vi.fn();
    const result = f.service.launch(native).then((value) => {
      settled(value);
      return value;
    });
    expect(f.ports.spawn).not.toHaveBeenCalled();
    resolveProbe(f.observation);
    await Promise.resolve();
    expect(f.ports.probePath).toHaveBeenCalledWith(native.path);
    expect(f.ports.spawn).toHaveBeenCalledExactlyOnceWith('/opt/editor/bin/editor', [], {
      shell: false,
      detached: true,
      stdio: 'ignore',
    });
    expect(settled).not.toHaveBeenCalled();
    f.emitSpawn();
    expect(await result).toEqual({ status: 'accepted' });
    f.emitError({ code: 'EACCES', message: '/private/path' });
    f.emitSpawn();
    expect(settled).toHaveBeenCalledOnce();
    expect(f.child.unref).toHaveBeenCalledOnce();
    expect(f.ports.openPath).not.toHaveBeenCalled();
  });

  it.each(['relative', '', 'C:\\Apps\\Editor.exe', '/opt/editor\0'])(
    'revalidates returned canonical path immediately before spawn: %j',
    async (canonicalPath) => {
      const f = fixture();
      f.ports.probePath.mockResolvedValue({ ...f.observation, canonicalPath });
      expect(await f.service.launch(native)).toEqual({
        status: 'blocked',
        reason: 'invalid-target',
      });
      expect(f.ports.spawn).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ kind: 'missing', executable: false, format: 'unknown' }, 'missing-target'],
    [{ kind: 'directory', executable: true, format: 'unknown' }, 'unsupported-target'],
    [{ kind: 'other', executable: true, format: 'unknown' }, 'unsupported-target'],
    [{ kind: 'regular-file', executable: false, format: 'elf' }, 'permission-denied'],
    [{ kind: 'regular-file', executable: true, format: 'other' }, 'unsupported-target'],
    [{ kind: 'regular-file', executable: true, format: 'unknown' }, 'unsupported-target'],
  ] as const)('blocks unsuitable observations: %j', async (observation, reason) => {
    const f = fixture();
    f.ports.probePath.mockResolvedValue({ canonicalPath: '/opt/editor', ...observation });
    expect(await f.service.launch(native)).toEqual({ status: 'blocked', reason });
    expect(f.ports.spawn).not.toHaveBeenCalled();
  });

  it.each([
    ['ENOENT', 'missing-target'],
    ['ENOTDIR', 'missing-target'],
    ['EACCES', 'permission-denied'],
    ['EPERM', 'permission-denied'],
    ['ENOEXEC', 'unsupported-target'],
    ['UNKNOWN', 'dispatch-failed'],
  ])('maps probe and process errors without exposing private details: %s', async (code, reason) => {
    const probe = fixture();
    probe.ports.probePath.mockRejectedValue({ code, message: '/private/path' });
    expect(await probe.service.launch(native)).toEqual({ status: 'failed', reason });
    expect(probe.ports.spawn).not.toHaveBeenCalled();
    const process = fixture();
    const result = process.service.launch(native);
    await Promise.resolve();
    process.emitError({ code, message: '/private/path' });
    process.emitSpawn();
    expect(await result).toEqual({ status: 'failed', reason });
    expect(process.child.unref).not.toHaveBeenCalled();
  });

  it('contains synchronous spawn throws', async () => {
    const f = fixture();
    f.ports.spawn.mockImplementation(() => {
      throw new Error('/private/path');
    });
    expect(await f.service.launch(native)).toEqual({ status: 'failed', reason: 'dispatch-failed' });
  });

  it.each(['file:///tmp/private', 'javascript:alert(1)', 'data:text/plain,test'])(
    'does not allow product policy to bypass unsafe URI rejection: %s',
    async (value) => {
      const f = fixture();
      f.ports.allowExternalUri.mockReturnValue(true);
      expect(await f.service.launch({ kind: 'external-uri', uri: value })).toEqual({
        status: 'blocked',
        reason: 'policy-blocked',
      });
      expect(f.ports.openExternal).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    'not-a-uri',
    ' https://example.com',
    'https://example.com\n',
    'https://user:secret@example.com',
    'x'.repeat(8193),
  ])('rejects malformed, credential-bearing or unbounded URI input: %s', async (value) => {
    const f = fixture();
    expect(await f.service.launch({ kind: 'external-uri', uri: value })).toEqual({
      status: 'blocked',
      reason: 'invalid-target',
    });
    expect(f.ports.openExternal).not.toHaveBeenCalled();
  });

  it('dispatches approved URI without a probe and rechecks changing policy', async () => {
    const f = fixture();
    expect(await f.service.launch(uri)).toEqual({ status: 'accepted' });
    expect(f.ports.openExternal).toHaveBeenCalledExactlyOnceWith(uri.uri);
    expect(f.ports.allowExternalUri).toHaveBeenCalledWith(expect.any(URL), uri.uri, 'linux');
    expect(f.ports.probePath).not.toHaveBeenCalled();
    f.ports.allowExternalUri.mockReturnValue(false);
    expect(await f.service.launch(uri)).toEqual({ status: 'blocked', reason: 'policy-blocked' });
    f.ports.allowExternalUri.mockImplementation(() => {
      throw new Error('private');
    });
    expect(f.service.assess(uri)).toEqual({ status: 'blocked', reason: 'policy-blocked' });
    expect(f.ports.openExternal).toHaveBeenCalledOnce();
  });

  it('does not report an unknown external dispatch error as proven handler absence', async () => {
    const f = fixture();
    f.ports.openExternal.mockRejectedValue(new Error('private'));
    expect(await f.service.launch(uri)).toEqual({ status: 'failed', reason: 'dispatch-failed' });
  });

  it.each([
    'C:\\Apps\\Editor.exe',
    'C:\\Links\\Editor.lnk',
    'C:\\Start.cmd',
    'C:\\Start.bat',
    'C:\\Readme.txt',
    '\\\\server\\share\\Editor.lnk',
  ])('retains Windows legacy default-open file compatibility: %s', async (path) => {
    const f = fixture('win32');
    f.ports.probePath.mockResolvedValue({
      canonicalPath: path,
      kind: 'regular-file',
      executable: false,
      format: 'other',
    });
    expect(await f.service.launch({ kind: 'windows-default-path', path })).toEqual({
      status: 'accepted',
    });
    expect(f.ports.openPath).toHaveBeenCalledExactlyOnceWith(path);
    expect(f.ports.spawn).not.toHaveBeenCalled();
    f.ports.openPath.mockResolvedValue('private OS error');
    expect(await f.service.launch({ kind: 'windows-default-path', path })).toEqual({
      status: 'failed',
      reason: 'dispatch-failed',
    });
  });

  it.each([
    'C:relative.exe',
    '/opt/editor',
    '\\rooted.exe',
    '\\\\?\\C:\\Editor.exe',
    '\\\\.\\COM1',
  ])('rejects nonabsolute or device Windows paths: %s', async (path) => {
    const f = fixture('win32');
    expect(await f.service.launch({ kind: 'windows-default-path', path })).toEqual({
      status: 'blocked',
      reason: 'invalid-target',
    });
    expect(f.ports.probePath).not.toHaveBeenCalled();
  });

  it.each(['linux', 'darwin'] as const)('rejects Windows path dispatch on %s', async (platform) => {
    const f = fixture(platform);
    expect(
      await f.service.launch({ kind: 'windows-default-path', path: 'C:\\Editor.exe' }),
    ).toEqual({ status: 'blocked', reason: 'unsupported-platform' });
    expect(f.ports.probePath).not.toHaveBeenCalled();
  });

  it.each(['win32', 'darwin'] as const)(
    'supports approved URI but not native path on %s',
    async (platform) => {
      const f = fixture(platform);
      expect(await f.service.launch(native)).toEqual({
        status: 'blocked',
        reason: 'unsupported-platform',
      });
      expect(await f.service.launch(uri)).toEqual({ status: 'accepted' });
      expect(f.ports.probePath).not.toHaveBeenCalled();
    },
  );

  it('never normalizes an unknown host to Linux', async () => {
    const f = fixture('freebsd' as HostLaunchPlatform);
    expect(await f.service.launch(native)).toEqual({
      status: 'blocked',
      reason: 'unsupported-platform',
    });
    expect(f.ports.spawn).not.toHaveBeenCalled();
  });
});
