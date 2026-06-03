import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  InstalledPlugin,
  PluginDescriptor,
  PluginLifecycleResult,
  PluginSource,
} from '@newchobo-ui/contracts';
import {
  isPluginLifecycleFailure,
  isPluginLifecycleSuccess,
  type PluginLifecycleFailure,
} from '@newchobo-ui/contracts';
import {
  InMemoryPluginLifecycleService,
  createInMemoryPluginLifecycleService,
} from './plugins';

function createDescriptor(pluginId: string, version = '1.0.0'): PluginDescriptor {
  return {
    description: `desc-${pluginId}`,
    displayName: pluginId,
    pluginId,
    publisher: 'acme',
    version,
  };
}

function createSource(ref = 'https://example.com/plugin.json'): PluginSource {
  return {
    kind: 'manifest-url',
    ref,
  };
}

function toFailure(result: PluginLifecycleResult): PluginLifecycleFailure {
  if (!isPluginLifecycleFailure(result)) {
    throw new Error('expected failure');
  }
  return result;
}

describe('InMemoryPluginLifecycleService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('installs a valid descriptor into installed state', async () => {
    const now = vi.fn()
      .mockReturnValueOnce('2026-06-01T00:00:00.000Z')
      .mockReturnValueOnce('2026-06-01T00:00:01.000Z');
    const service = new InMemoryPluginLifecycleService({ now });

    const result = await service.install(createSource('https://example.com/plugin-a.json'), {
      descriptor: createDescriptor('acme.plugin-a'),
    });

    expect(isPluginLifecycleSuccess(result)).toBe(true);
    if (isPluginLifecycleSuccess(result)) {
      expect(result.plugin).toMatchObject({
        descriptor: createDescriptor('acme.plugin-a'),
        enabled: 'enabled',
        state: 'installed',
        trust: 'unknown',
        installedAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:01.000Z',
      });
      expect(result.plugin.source).toMatchObject({
        kind: 'manifest-url',
        ref: 'https://example.com/plugin-a.json',
      });
    }
  });

  it('validates descriptor before install', async () => {
    const service = new InMemoryPluginLifecycleService();
    const result = await service.install(createSource(), {
      descriptor: {
        displayName: 'bad',
        version: '1.0.0',
        publisher: 'acme',
        pluginId: '',
      },
    });

    const failure = toFailure(result);
    expect(failure).toMatchObject({
      kind: 'plugin:failure',
      code: 'invalid-descriptor',
      pluginId: '',
      message: 'Descriptor must contain pluginId, version, and displayName.',
    });
  });

  it('returns invalid-state on duplicate plugin ID unless force is true', async () => {
    const installed: InstalledPlugin = {
      descriptor: createDescriptor('acme.plugin-b'),
      enabled: 'enabled',
      source: createSource('https://example.com/plugin-b-v1.json'),
      state: 'installed',
      trust: 'trusted',
      description: 'existing',
      installedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    };
    const service = new InMemoryPluginLifecycleService({ plugins: [installed] });

    const duplicate = await service.install(createSource('https://example.com/plugin-b-v2.json'), {
      descriptor: createDescriptor('acme.plugin-b', '2.0.0'),
    });
    const duplicateFailure = toFailure(duplicate);
    expect(duplicateFailure).toMatchObject({
      code: 'invalid-state',
      pluginId: 'acme.plugin-b',
      message: `Plugin 'acme.plugin-b' is already installed.`,
    });

    const forced = await service.install(
      createSource('https://example.com/plugin-b-v2.json'),
      {
        descriptor: createDescriptor('acme.plugin-b', '2.0.0'),
        force: true,
      },
    );
    expect(isPluginLifecycleSuccess(forced)).toBe(true);
    if (isPluginLifecycleSuccess(forced)) {
      expect(forced.plugin).toMatchObject({
        descriptor: createDescriptor('acme.plugin-b', '2.0.0'),
        description: 'existing',
        trust: 'trusted',
        state: 'installed',
        installedAt: '2026-05-01T00:00:00.000Z',
      });
      expect(forced.plugin.source.ref).toBe('https://example.com/plugin-b-v2.json');
    }
  });

  it('toggles enabled and failure states through enable()', async () => {
    const disabled: InstalledPlugin = {
      descriptor: createDescriptor('acme.plugin-c', '1.0.0'),
      enabled: 'disabled',
      source: createSource('file:///plugin-c'),
      state: 'disabled',
      trust: 'trusted',
      installedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    };
    const failed: InstalledPlugin = {
      descriptor: createDescriptor('acme.plugin-failed', '1.0.0'),
      enabled: 'enabled',
      source: createSource('file:///plugin-failed'),
      state: 'failed',
      trust: 'trusted',
      installedAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    };
    const service = new InMemoryPluginLifecycleService({
      now: vi.fn().mockReturnValue('2026-06-01T00:00:02.000Z'),
      plugins: [disabled, failed],
    });

    const notFound = await service.enable('acme.plugin-unknown', true);
    const notFoundFailure = toFailure(notFound);
    expect(notFoundFailure.code).toBe('not-found');

    const enabled = await service.enable('acme.plugin-c', true);
    expect(isPluginLifecycleSuccess(enabled)).toBe(true);
    if (isPluginLifecycleSuccess(enabled)) {
      expect(enabled.plugin).toMatchObject({
        descriptor: createDescriptor('acme.plugin-c', '1.0.0'),
        enabled: 'enabled',
        state: 'installed',
      });
    }

    const disabledResult = await service.enable('acme.plugin-c', false);
    expect(isPluginLifecycleSuccess(disabledResult)).toBe(true);
    if (isPluginLifecycleSuccess(disabledResult)) {
      expect(disabledResult.plugin).toMatchObject({
        enabled: 'disabled',
        state: 'disabled',
      });
    }

    const blocked = await service.enable('acme.plugin-failed', true);
    expect(toFailure(blocked).code).toBe('invalid-state');
  });

  it('uninstalls plugin and removes it from future enable lookups', async () => {
    const service = new InMemoryPluginLifecycleService({
      now: vi.fn().mockReturnValue('2026-06-01T00:00:03.000Z'),
      plugins: [
        {
          descriptor: createDescriptor('acme.plugin-d'),
          enabled: 'enabled',
          source: createSource('file:///plugin-d'),
          state: 'installed',
          trust: 'trusted',
        },
      ],
    });

    const uninstalled = await service.uninstall('acme.plugin-d');
    expect(isPluginLifecycleSuccess(uninstalled)).toBe(true);
    if (isPluginLifecycleSuccess(uninstalled)) {
      expect(uninstalled.plugin).toMatchObject({
        state: 'uninstalled',
        enabled: 'disabled',
        updatedAt: '2026-06-01T00:00:03.000Z',
      });
    }

    const afterUninstall = await service.enable('acme.plugin-d', true);
    expect(toFailure(afterUninstall).code).toBe('not-found');
  });

  it('updates existing plugin and replaces source when provided', async () => {
    const now = vi.fn()
      .mockReturnValueOnce('2026-06-01T00:00:04.000Z')
      .mockReturnValueOnce('2026-06-01T00:00:05.000Z');
    const service = new InMemoryPluginLifecycleService({
      now,
      plugins: [
        {
          descriptor: createDescriptor('acme.plugin-e', '1.0.0'),
          enabled: 'enabled',
          source: createSource('file:///plugin-e-v1'),
          state: 'installed',
          trust: 'trusted',
          installedAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    });

    const updated = await service.update('acme.plugin-e', createSource('https://example.com/plugin-e-v2.json'));
    expect(isPluginLifecycleSuccess(updated)).toBe(true);
    if (isPluginLifecycleSuccess(updated)) {
      expect(updated.plugin).toMatchObject({
        descriptor: createDescriptor('acme.plugin-e', '1.0.0'),
        state: 'installed',
        source: {
          kind: 'manifest-url',
          ref: 'https://example.com/plugin-e-v2.json',
        },
      });
      expect(updated.plugin.updatedAt).toBe('2026-06-01T00:00:05.000Z');
    }
  });

  it('returns not-found for missing plugin update()', async () => {
    const service = new InMemoryPluginLifecycleService();
    const result = await service.update('acme.missing', createSource('https://example.com/should-not-run'));
    expect(toFailure(result).code).toBe('not-found');
  });

  it('exposes factory helper for testability', () => {
    expect(
      createInMemoryPluginLifecycleService(),
    ).toBeInstanceOf(InMemoryPluginLifecycleService);
  });
});
