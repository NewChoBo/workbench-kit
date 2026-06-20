import { describe, expect, it } from 'vitest';

import {
  collectConfigurationContributionDefaults,
  PreferenceService,
} from './preference-service.js';

describe('PreferenceService', () => {
  it('merges default, workspace, and local values for effective reads', () => {
    const service = new PreferenceService({
      contributionDefaults: {
        'editor.fontSize': 12,
        'workbench.settings.openOnStartup': false,
      },
      initialValuesByScope: {
        workspace: {
          'editor.fontSize': 14,
        },
        local: {
          'editor.fontSize': 16,
        },
      },
    });

    expect(service.getEffectiveValue('editor.fontSize')).toBe(16);
    expect(service.getEffectiveValue('workbench.settings.openOnStartup')).toBe(false);
  });

  it('fires change events when a scoped value is updated', () => {
    const service = new PreferenceService({
      contributionDefaults: {
        'workbench.settings.openOnStartup': false,
      },
    });
    const changes: Array<{ key: string; scope: string; effectiveValue: unknown }> = [];

    const disposable = service.onDidChangePreference((event) => {
      changes.push({
        effectiveValue: event.effectiveValue,
        key: event.key,
        scope: event.scope,
      });
    });

    service.setScopedValue('workbench.settings.openOnStartup', 'workspace', true);

    expect(changes).toEqual([
      {
        effectiveValue: true,
        key: 'workbench.settings.openOnStartup',
        scope: 'workspace',
      },
    ]);

    disposable.dispose();
  });

  it('inspects values per scope', () => {
    const service = new PreferenceService({
      contributionDefaults: {
        'workbench.settings.openOnStartup': false,
      },
      initialValuesByScope: {
        workspace: {
          'workbench.settings.openOnStartup': true,
        },
      },
    });

    expect(service.inspect('workbench.settings.openOnStartup')).toEqual({
      defaultValue: false,
      effectiveValue: true,
      localValue: undefined,
      workspaceValue: true,
    });
  });
});

describe('collectConfigurationContributionDefaults', () => {
  it('collects default values from configuration contributions', () => {
    expect(
      collectConfigurationContributionDefaults([
        {
          properties: {
            'workbench.settings.openOnStartup': {
              default: false,
              type: 'boolean',
            },
          },
        },
      ]),
    ).toEqual({
      'workbench.settings.openOnStartup': false,
    });
  });
});
