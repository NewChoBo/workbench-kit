import { describe, expect, it } from 'vitest';

import { ExtensionRegistry } from './extension-registry.js';
import { LocalizationRegistry } from './localization-registry.js';

describe('LocalizationRegistry', () => {
  it('registers contributed locales from extensions', () => {
    const registry = new ExtensionRegistry();

    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.samples.locale-ko',
        name: 'samples-locale-ko',
        displayName: 'Korean Locale',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: { workbench: '^0.0.0', extensionApi: '^0.0.0' },
        activationEvents: ['onStartup'],
        contributes: {
          localizations: [
            {
              locale: 'ko',
              label: 'Korean',
              translations: {
                'settings.appearance': '모양',
              },
            },
          ],
        },
      },
    });

    expect(registry.localizations.getLocalizations()).toEqual([
      expect.objectContaining({
        extensionId: 'workbench-kit.samples.locale-ko',
        locale: 'ko',
        label: 'Korean',
      }),
    ]);
  });

  it('translates keys for a registered locale', () => {
    const registry = new LocalizationRegistry();

    registry.registerLocalization({
      extensionId: 'workbench-kit.samples.locale-ko',
      locale: 'ko',
      label: 'Korean',
      translations: {
        'activityBar.explorer': '탐색기',
      },
    });

    expect(registry.translate('ko', 'activityBar.explorer', 'Explorer')).toBe('탐색기');
    expect(registry.translate('en', 'activityBar.explorer', 'Explorer')).toBe('Explorer');
  });
});
