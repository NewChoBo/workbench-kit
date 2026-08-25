/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createBuiltinValueTransformRegistry } from '@workbench-kit/field-remap';

import type { FieldRemapChromeLabels } from './chrome-labels.js';
import { FieldRemapConvertPalette } from './convert-palette.js';
import { readFieldRemapTransformDragData } from './drag-payload.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const legacyChromeLabels = {
  bindingsTitle: 'Bindings',
  convertPaletteTitle: 'Convert palette',
  convertPaletteDescription: 'Choose a convert.',
  convertPaletteAriaLabel: 'Convert palette',
  convertsListAriaLabel: 'Converts',
  placeConvert: 'Place convert',
  addCombine: 'Add combine',
  addSplit: 'Add split',
  operatorsTitle: 'Operators',
  operatorsDescription: 'Choose an operator.',
  addTransform: 'Add convert',
  editItems: 'Edit items',
  removeBinding: 'Remove binding',
  showMinimap: 'Show minimap',
  hideMinimap: 'Hide minimap',
  showHiddenFields: 'Show hidden fields',
  hideHiddenFields: 'Hide hidden fields',
  emptyDetailTitle: 'Start with a convert',
  emptyDetailDescription: 'Place a convert.',
} satisfies FieldRemapChromeLabels;

function changeInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function pressKey(element: HTMLElement, key: string): boolean {
  let accepted = true;
  act(() => {
    accepted = element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    );
  });
  return accepted;
}

function createDataTransfer(): DataTransfer {
  const entries = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    get types() {
      return [...entries.keys()];
    },
    getData: (type: string) => entries.get(type) ?? '',
    setData: (type: string, value: string) => {
      entries.set(type, value);
    },
  } as unknown as DataTransfer;
}

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
    expect(container.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe(
      'Converts',
    );
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
    expect(paletteItem?.draggable).toBe(true);
    const dataTransfer = createDataTransfer();
    const dragStart = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });
    act(() => {
      paletteItem?.click();
      paletteItem?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      paletteItem?.dispatchEvent(dragStart);
    });
    expect(onSelectedTransformIdChange).toHaveBeenCalledWith('string:trim');
    expect(onPlaceDraft).toHaveBeenCalledWith('string:trim');
    expect(onPlaceDraft).toHaveBeenCalledTimes(1);
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(readFieldRemapTransformDragData(dataTransfer)).toBe('string:trim');
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

  it('filters by label and id without rewriting a controlled selection', () => {
    const onPlaceDraft = vi.fn();
    const onSelectedTransformIdChange = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <FieldRemapConvertPalette
          transforms={transforms}
          selectedTransformId="string:trim"
          chromeLabels={legacyChromeLabels}
          onSelectedTransformIdChange={onSelectedTransformIdChange}
          onPlaceDraft={onPlaceDraft}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('[aria-label="Filter converts"]')!;
    const placeButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-place-draft"]',
    )!;
    changeInputValue(input, 'UPPERCASE');
    expect(
      container.querySelector('[data-testid="field-remap-palette-item-string:upper"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="field-remap-palette-item-string:trim"]'),
    ).toBeNull();
    expect(container.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
    expect(placeButton.disabled).toBe(true);
    expect(onSelectedTransformIdChange).not.toHaveBeenCalled();

    changeInputValue(input, 'STRING:TRIM');
    expect(
      container.querySelector('[data-testid="field-remap-palette-item-string:trim"]'),
    ).toBeTruthy();
    expect(placeButton.disabled).toBe(false);

    changeInputValue(input, 'not-a-transform');
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('No matching converts.');
    input.focus();
    expect(pressKey(input, 'ArrowDown')).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(pressKey(input, 'a')).toBe(true);

    const clearButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Clear convert filter"]',
    )!;
    act(() => clearButton.click());
    expect(input.value).toBe('');
    expect(
      container.querySelector('[data-testid="field-remap-palette-item-string:trim"]'),
    ).toBeTruthy();
    expect(
      container
        .querySelector('[data-testid="field-remap-palette-item-string:trim"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(placeButton.disabled).toBe(false);
    expect(onSelectedTransformIdChange).not.toHaveBeenCalled();
  });

  it('enters the list from the filter and roves locally before placing with Enter', () => {
    const onPlaceDraft = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    function ControlledPalette() {
      const [selectedTransformId, setSelectedTransformId] = useState('string:trim');
      return (
        <FieldRemapConvertPalette
          transforms={transforms}
          selectedTransformId={selectedTransformId}
          onSelectedTransformIdChange={setSelectedTransformId}
          onPlaceDraft={onPlaceDraft}
        />
      );
    }

    act(() => root!.render(<ControlledPalette />));
    const input = container.querySelector<HTMLInputElement>('[aria-label="Filter converts"]')!;
    changeInputValue(input, 'string:');
    input.focus();
    expect(pressKey(input, 'ArrowDown')).toBe(false);
    const options = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const selectedOption = container.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-palette-item-string:trim"]',
    )!;
    expect(document.activeElement).toBe(selectedOption);
    expect(options.filter((option) => option.tabIndex === 0)).toEqual([selectedOption]);

    expect(pressKey(selectedOption, 'ArrowDown')).toBe(false);
    const nextOption = options[Math.min(options.indexOf(selectedOption) + 1, options.length - 1)]!;
    expect(document.activeElement).toBe(nextOption);
    expect(nextOption.getAttribute('aria-selected')).toBe('true');

    expect(pressKey(nextOption, 'ArrowUp')).toBe(false);
    expect(document.activeElement).toBe(selectedOption);
    expect(selectedOption.getAttribute('aria-selected')).toBe('true');
    expect(pressKey(selectedOption, 'ArrowDown')).toBe(false);
    expect(document.activeElement).toBe(nextOption);
    expect(nextOption.getAttribute('aria-selected')).toBe('true');

    expect(pressKey(nextOption, 'End')).toBe(false);
    const lastOption = options[options.length - 1]!;
    expect(document.activeElement).toBe(lastOption);
    expect(lastOption.getAttribute('aria-selected')).toBe('true');
    expect(pressKey(lastOption, 'Home')).toBe(false);
    expect(document.activeElement).toBe(options[0]);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
    expect(pressKey(options[0]!, 'Enter')).toBe(false);
    expect(onPlaceDraft).toHaveBeenCalledWith(
      options[0]!.dataset.testid?.replace('field-remap-palette-item-', ''),
    );
  });

  it('uses first or last visible fallback when the controlled selection is filtered out', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <FieldRemapConvertPalette
          transforms={transforms}
          selectedTransformId="array:first"
          onSelectedTransformIdChange={() => undefined}
          onPlaceDraft={() => undefined}
        />,
      );
    });
    const input = container.querySelector<HTMLInputElement>('[aria-label="Filter converts"]')!;
    changeInputValue(input, 'string:');
    const options = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    expect(options.length).toBeGreaterThan(1);
    expect(container.querySelector('[role="option"][aria-selected="true"]')).toBeNull();

    input.focus();
    expect(pressKey(input, 'ArrowDown')).toBe(false);
    expect(document.activeElement).toBe(options[0]);
    expect(container.querySelector('[role="option"][aria-selected="true"]')).toBeNull();

    input.focus();
    expect(pressKey(input, 'ArrowUp')).toBe(false);
    expect(document.activeElement).toBe(options[options.length - 1]);
    expect(container.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  });
});
