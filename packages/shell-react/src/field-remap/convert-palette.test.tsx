/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createBuiltinValueTransformRegistry } from '@workbench-kit/field-remap';

import { FieldRemapConvertPalette } from './convert-palette.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('FieldRemapConvertPalette', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;
  const transforms = createBuiltinValueTransformRegistry();

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('uses labelled IconButtons for primary palette chrome', () => {
    const onPlaceDraft = vi.fn();
    const onSelectedTransformIdChange = vi.fn();
    const onAddCombine = vi.fn();
    const onAddSplit = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <FieldRemapConvertPalette
          transforms={transforms}
          selectedTransformId="string:trim"
          onSelectedTransformIdChange={onSelectedTransformIdChange}
          onPlaceDraft={onPlaceDraft}
          onAddCombine={onAddCombine}
          onAddSplit={onAddSplit}
        />,
      );
    });
    expect(
      container.querySelector('[data-testid="field-remap-convert-palette"] .ui-sidebar-list'),
    ).toBeTruthy();
    expect(
      container
        .querySelector(
          '[data-testid="field-remap-palette-item-string:trim"].ui-sidebar-list-item--stacked',
        )
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    const paletteItem = container.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-palette-item-string:trim"]',
    );
    act(() => {
      paletteItem?.click();
      paletteItem?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onSelectedTransformIdChange).toHaveBeenCalledWith('string:trim');
    expect(onPlaceDraft).toHaveBeenCalledWith('string:trim');
    onPlaceDraft.mockClear();
    const placeButton = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-place-draft"]',
    );
    expect(placeButton?.classList.contains('ui-icon-button')).toBe(true);
    expect(placeButton?.getAttribute('aria-label')).toBe('Place convert');
    act(() => {
      placeButton?.click();
    });
    expect(onPlaceDraft).toHaveBeenCalledWith('string:trim');

    const combineButton = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-add-combine"]',
    );
    expect(combineButton?.classList.contains('ui-icon-button')).toBe(true);
    expect(combineButton?.getAttribute('aria-label')).toBe('Add combine');
    const splitButton = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-add-split"]',
    );
    expect(splitButton?.classList.contains('ui-icon-button')).toBe(true);
    expect(splitButton?.getAttribute('aria-label')).toBe('Add split');
    act(() => {
      combineButton?.click();
      splitButton?.click();
    });
    expect(onAddCombine).toHaveBeenCalledTimes(1);
    expect(onAddSplit).toHaveBeenCalledTimes(1);
  });
});
