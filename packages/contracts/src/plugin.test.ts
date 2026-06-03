import { describe, expect, it } from 'vitest';
import {
  InstalledPlugin,
  isPluginEnabled,
  isPluginLifecycleFailure,
  isPluginLifecycleSuccess,
  type PluginContributions,
  type PluginDescriptor,
  type PluginLifecycleFailure,
  type PluginLifecycleResult,
  type PluginLifecycleSuccess,
  type PluginSource,
} from './index';

describe('plugin lifecycle contracts', () => {
  const source: PluginSource = {
    kind: 'manifest-url',
    ref: 'https://example.com/plugin.json',
  };

  const descriptor: PluginDescriptor = {
    description: 'Sample plugin',
    displayName: 'Sample',
    pluginId: 'example.sample-plugin',
    publisher: 'example',
    version: '1.0.0',
  };

  const contributions: PluginContributions = {
    surfaces: ['editor', 'settings'],
  };

  it('classifies plugin lifecycle success and failure results', () => {
    const plugin: InstalledPlugin = {
      contributions,
      descriptor,
      enabled: 'enabled',
      source,
      state: 'installed',
      trust: 'trusted',
    };

    const success: PluginLifecycleSuccess = {
      kind: 'plugin:success',
      plugin,
    };
    const failure: PluginLifecycleFailure = {
      code: 'invalid-state',
      kind: 'plugin:failure',
      pluginId: descriptor.pluginId,
    };

    expect(isPluginLifecycleSuccess(success)).toBe(true);
    expect(isPluginLifecycleFailure(success)).toBe(false);
    expect(isPluginLifecycleFailure(failure)).toBe(true);
    expect(isPluginLifecycleSuccess(failure)).toBe(false);
  });

  it('reflects enabled-state based on lifecycle state', () => {
    const enabledPlugin: InstalledPlugin = {
      descriptor,
      enabled: 'enabled',
      source,
      state: 'installed',
      trust: 'trusted',
    };
    const disabledPlugin: InstalledPlugin = {
      descriptor,
      enabled: 'disabled',
      source,
      state: 'installed',
      trust: 'trusted',
    };
    const failedPlugin: InstalledPlugin = {
      descriptor,
      enabled: 'enabled',
      source,
      state: 'failed',
      trust: 'trusted',
    };

    expect(isPluginEnabled(enabledPlugin)).toBe(true);
    expect(isPluginEnabled(disabledPlugin)).toBe(false);
    expect(isPluginEnabled(failedPlugin)).toBe(false);
  });

  it('preserves source kinds and supports metadata fields', () => {
    const result: PluginLifecycleResult = {
      code: 'source-unreachable',
      kind: 'plugin:failure',
      message: 'Unable to fetch plugin manifest',
      source,
    };

    expect(result).toMatchObject({
      kind: 'plugin:failure',
      code: 'source-unreachable',
      message: 'Unable to fetch plugin manifest',
      source: { kind: 'manifest-url', ref: 'https://example.com/plugin.json' },
    });
  });
});
