/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  applyWorkbenchShellAttributes,
  DEFAULT_SHELL_PRESET,
  isShellPresetId,
  SHELL_PRESET_OPTIONS,
} from './shellPresets';

describe('shellPresets', () => {
  it('exposes default shell preset id', () => {
    expect(DEFAULT_SHELL_PRESET).toBe('default');
  });

  it('validates shell preset ids', () => {
    expect(isShellPresetId('default')).toBe(true);
    expect(isShellPresetId('workbench')).toBe(true);
    expect(isShellPresetId('airy')).toBe(true);
    expect(isShellPresetId('compact')).toBe(false);
  });

  it('lists shell preset options from manifest', () => {
    expect(SHELL_PRESET_OPTIONS.map((option) => option.id)).toEqual([
      'default',
      'workbench',
      'airy',
    ]);
  });

  it('applies shell preset to a DOM root', () => {
    const root = document.createElement('html');

    applyWorkbenchShellAttributes(root, 'workbench');

    expect(root.dataset.shellPreset).toBe('workbench');
  });
});
