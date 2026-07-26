/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TransformOptionField } from '@workbench-kit/field-remap';

import { TransformOptionsEditor } from './transform-options-editor.js';

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const fields: TransformOptionField[] = [
  { key: 'expression', label: 'Expression', kind: 'string' },
  { key: 'maxLength', label: 'Max length', kind: 'number' },
  { key: 'showSeconds', label: 'Show seconds', kind: 'boolean' },
  { key: 'codeLabels', label: 'Code labels', kind: 'stringMap' },
  { key: 'meta', label: 'Meta', kind: 'json' },
];

describe('TransformOptionsEditor', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const mount = (node: ReactNode) => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(node);
    });
  };

  it('edits string / number / boolean kinds', () => {
    const onChange = vi.fn();
    mount(
      <TransformOptionsEditor
        fields={fields.slice(0, 3)}
        value={{ expression: '$', maxLength: 3, showSeconds: false }}
        onChange={onChange}
      />,
    );

    const expression = container!.querySelector(
      '[data-testid="field-remap-option-expression"]',
    ) as HTMLInputElement;
    act(() => {
      setInputValue(expression, '$.name');
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ expression: '$.name' }));

    const maxLength = container!.querySelector(
      '[data-testid="field-remap-option-maxLength"]',
    ) as HTMLInputElement;
    act(() => {
      setInputValue(maxLength, '12');
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ maxLength: 12 }));

    const checkbox = container!.querySelector(
      '[data-testid="field-remap-option-showSeconds"]',
    ) as HTMLInputElement;
    act(() => {
      checkbox.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ showSeconds: true }));
  });

  it('commits parseable JSON on blur and reports invalid JSON', () => {
    const onChange = vi.fn();
    mount(<TransformOptionsEditor fields={[fields[4]!]} value={{}} onChange={onChange} />);

    const textarea = container!.querySelector(
      '[data-testid="field-remap-option-meta"]',
    ) as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, '{bad');
      // React root delegation listens to focusout for onBlur.
      textarea.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(container!.querySelector('[role="alert"]')?.textContent ?? '').toContain('Invalid JSON');
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      setInputValue(textarea, '{"a":1}');
      textarea.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ meta: { a: 1 } });
  });

  it('adds stringMap rows', () => {
    const onChange = vi.fn();
    mount(
      <TransformOptionsEditor
        fields={[fields[3]!]}
        value={{ codeLabels: { A: 'Alpha' } }}
        onChange={onChange}
      />,
    );

    const keyInput = container!.querySelector(
      '[aria-label="New Code labels key"]',
    ) as HTMLInputElement;
    const valueInput = container!.querySelector(
      '[aria-label="New Code labels value"]',
    ) as HTMLInputElement;
    const addButton = Array.from(container!.querySelectorAll('button')).find(
      (button) => button.textContent === 'Add',
    ) as HTMLButtonElement;

    act(() => {
      setInputValue(keyInput, 'B');
      setInputValue(valueInput, 'Beta');
      addButton.click();
    });

    expect(onChange).toHaveBeenLastCalledWith({
      codeLabels: { A: 'Alpha', B: 'Beta' },
    });
  });

  it('shows empty state when there are no option fields', () => {
    mount(<TransformOptionsEditor fields={[]} value={{}} onChange={() => undefined} />);
    expect(container!.querySelector('[data-testid="field-remap-option-empty"]')).toBeTruthy();
  });
});
