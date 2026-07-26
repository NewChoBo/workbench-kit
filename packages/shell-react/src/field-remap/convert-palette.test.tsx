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

  it('places the selected convert from primary palette chrome', () => {
    const onPlaceDraft = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <FieldRemapConvertPalette
          transforms={transforms}
          selectedTransformId="string:trim"
          onSelectedTransformIdChange={() => undefined}
          onPlaceDraft={onPlaceDraft}
        />,
      );
    });
    expect(container.querySelector('[data-testid="field-remap-convert-palette"]')).toBeTruthy();
    act(() => {
      container!
        .querySelector<HTMLButtonElement>('[data-testid="field-remap-place-draft"]')
        ?.click();
    });
    expect(onPlaceDraft).toHaveBeenCalledWith('string:trim');
  });
});
