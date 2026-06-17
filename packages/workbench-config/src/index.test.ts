import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKBENCH_LAYOUT_CONFIG,
  parseWorkbenchExtensionsConfig,
  parseWorkbenchExtensionsConfigJson,
  parseWorkbenchLayoutConfig,
  parseWorkbenchLayoutConfigJson,
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

describe('parseWorkbenchLayoutConfig', () => {
  it('parses shareable layout defaults', () => {
    expect(
      parseWorkbenchLayoutConfig({
        activityBar: {
          visible: true,
        },
        panel: {
          visible: false,
        },
        sideBar: {
          activeViewContainer: 'explorer',
          visible: true,
        },
      }),
    ).toEqual({
      activityBar: {
        visible: true,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: 'explorer',
        visible: true,
      },
    });
  });

  it('defaults missing layout sections to the public default config', () => {
    expect(parseWorkbenchLayoutConfig({})).toEqual(DEFAULT_WORKBENCH_LAYOUT_CONFIG);
  });

  it('rejects malformed layout values', () => {
    expect(() =>
      parseWorkbenchLayoutConfig({
        sideBar: {
          activeViewContainer: '',
        },
      }),
    ).toThrow(WorkbenchConfigValidationError);
    expect(() =>
      parseWorkbenchLayoutConfig({
        sideBar: {
          visible: 'yes',
        },
      }),
    ).toThrow(WorkbenchConfigValidationError);
  });

  it('rejects unknown layout fields so committed defaults stay portable', () => {
    expect(() =>
      parseWorkbenchLayoutConfig({
        sideBar: {
          lastFocusedFile: 'src/index.ts',
        },
      }),
    ).toThrow('Unexpected layout config sideBar field "lastFocusedFile".');
  });

  it('parses layout config from JSON text', () => {
    expect(
      parseWorkbenchLayoutConfigJson(`{
        "sideBar": {
          "activeViewContainer": "settings",
          "visible": false
        }
      }`),
    ).toEqual({
      activityBar: {
        visible: true,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: 'settings',
        visible: false,
      },
    });
  });
});
