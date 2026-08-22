import { describe, expect, it, vi } from 'vitest';

import { defaultFieldRemapChromeLabels, resolveFieldRemapChromeLabels } from './chrome-labels.js';

describe('resolveFieldRemapChromeLabels', () => {
  it('returns English defaults when no overrides', () => {
    expect(resolveFieldRemapChromeLabels()).toEqual(defaultFieldRemapChromeLabels);
  });

  it('applies partial label overrides without forking other strings', () => {
    const labels = resolveFieldRemapChromeLabels({
      bindingsTitle: 'Field maps',
      addCombine: 'Create join',
      previewTitle: 'Live result',
    });
    expect(labels.bindingsTitle).toBe('Field maps');
    expect(labels.addCombine).toBe('Create join');
    expect(labels.previewTitle).toBe('Live result');
    expect(labels.convertPaletteTitle).toBe(defaultFieldRemapChromeLabels.convertPaletteTitle);
    expect(labels.previewLoading).toBe(defaultFieldRemapChromeLabels.previewLoading);
  });

  it('uses t() fallback when label prop is omitted', () => {
    const t = vi.fn((key: string, fallback: string) =>
      key === 'fieldRemap.bindingsTitle' ? 'Mappings' : fallback,
    );
    const labels = resolveFieldRemapChromeLabels(undefined, t);
    expect(labels.bindingsTitle).toBe('Mappings');
    expect(t).toHaveBeenCalledWith('fieldRemap.bindingsTitle', 'Bindings');
  });

  it('prefers labels prop over t()', () => {
    const t = vi.fn(() => 'from-t');
    const labels = resolveFieldRemapChromeLabels({ bindingsTitle: 'Field maps' }, t);
    expect(labels.bindingsTitle).toBe('Field maps');
    expect(t).not.toHaveBeenCalledWith('fieldRemap.bindingsTitle', expect.anything());
  });
});
