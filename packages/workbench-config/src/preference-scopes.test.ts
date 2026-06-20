import { describe, expect, it } from 'vitest';

import {
  mergePreferenceValuesByScope,
  mergeScopedPreferences,
  PREFERENCE_SCOPE_MERGE_ORDER,
} from './preference-scopes.js';

describe('PREFERENCE_SCOPE_MERGE_ORDER', () => {
  it('orders default before workspace before local', () => {
    expect(PREFERENCE_SCOPE_MERGE_ORDER).toEqual(['default', 'workspace', 'local']);
  });
});

describe('mergeScopedPreferences', () => {
  it('applies default < workspace < local precedence', () => {
    expect(
      mergeScopedPreferences([
        { scope: 'default', values: { 'editor.fontSize': 12, 'editor.tabSize': 2 } },
        { scope: 'workspace', values: { 'editor.fontSize': 14 } },
        { scope: 'local', values: { 'editor.fontSize': 16, 'editor.wordWrap': 'on' } },
      ]),
    ).toEqual({
      'editor.fontSize': 16,
      'editor.tabSize': 2,
      'editor.wordWrap': 'on',
    });
  });

  it('skips missing layers', () => {
    expect(
      mergeScopedPreferences([
        { scope: 'default', values: { 'workbench.colorTheme': 'dark' } },
        { scope: 'local', values: { 'workbench.colorTheme': 'light' } },
      ]),
    ).toEqual({
      'workbench.colorTheme': 'light',
    });
  });
});

describe('mergePreferenceValuesByScope', () => {
  it('merges a values-by-scope map in precedence order', () => {
    expect(
      mergePreferenceValuesByScope({
        default: { 'workbench.settings.openOnStartup': false },
        workspace: { 'workbench.settings.openOnStartup': true },
        local: { 'workbench.settings.openOnStartup': false },
      }),
    ).toEqual({
      'workbench.settings.openOnStartup': false,
    });
  });
});
