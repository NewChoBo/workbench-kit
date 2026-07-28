import { describe, expect, it, vi } from 'vitest';

import {
  defaultWorkbenchShellChromeLabels,
  resolveWorkbenchShellChromeLabels,
} from './chrome-labels.js';

describe('resolveWorkbenchShellChromeLabels', () => {
  it('returns English defaults when no overrides', () => {
    expect(resolveWorkbenchShellChromeLabels()).toEqual(defaultWorkbenchShellChromeLabels);
  });

  it('applies partial label overrides without forking other strings', () => {
    const labels = resolveWorkbenchShellChromeLabels({ settingsLabel: '환경설정' });
    expect(labels.settingsLabel).toBe('환경설정');
    expect(labels.commandPaletteTitle).toBe(defaultWorkbenchShellChromeLabels.commandPaletteTitle);
  });

  it('uses t() fallback when label prop is omitted', () => {
    const t = vi.fn((key: string, fallback: string) =>
      key === 'shell.settings' ? '설정' : fallback,
    );
    const labels = resolveWorkbenchShellChromeLabels(undefined, t);
    expect(labels.settingsLabel).toBe('설정');
    expect(t).toHaveBeenCalledWith('shell.settings', 'Settings');
  });

  it('prefers labels prop over t()', () => {
    const t = vi.fn(() => 'from-t');
    const labels = resolveWorkbenchShellChromeLabels({ settingsLabel: 'Settings UI' }, t);
    expect(labels.settingsLabel).toBe('Settings UI');
    expect(t).not.toHaveBeenCalledWith('shell.settings', expect.anything());
  });
});
