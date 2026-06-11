import { describe, expect, it } from 'vitest';

import {
  parseWorkbenchExtensionsConfig,
  parseWorkbenchExtensionsConfigJson,
  WorkbenchConfigValidationError,
} from './index.js';

describe('parseWorkbenchExtensionsConfig', () => {
  it('parses enabled and recommended extension IDs', () => {
    expect(
      parseWorkbenchExtensionsConfig({
        enabled: ['workbench-kit.builtin.explorer'],
        recommendations: ['workbench-kit.samples.hello-world'],
      }),
    ).toEqual({
      enabled: ['workbench-kit.builtin.explorer'],
      recommendations: ['workbench-kit.samples.hello-world'],
    });
  });

  it('defaults missing arrays to empty lists', () => {
    expect(parseWorkbenchExtensionsConfig({})).toEqual({
      enabled: [],
      recommendations: [],
    });
  });

  it('rejects malformed config values', () => {
    expect(() => parseWorkbenchExtensionsConfig({ enabled: [42] })).toThrow(
      WorkbenchConfigValidationError,
    );
  });

  it('parses extensions config from JSON text', () => {
    expect(
      parseWorkbenchExtensionsConfigJson(`{
        "enabled": ["workbench-kit.builtin.settings"]
      }`),
    ).toEqual({
      enabled: ['workbench-kit.builtin.settings'],
      recommendations: [],
    });
  });
});
