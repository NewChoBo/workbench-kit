/** @vitest-environment jsdom */

import { act, createRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextInput } from './TextInput';

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('TextInput adapter contract', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  function render(node: ReactNode) {
    act(() => root.render(node));
  }
  function input() {
    return container.querySelector('input')!;
  }
  function edit(value: string, isComposing = false) {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input(),
        value,
      );
      input().dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: value,
          inputType: 'insertText',
          isComposing,
        }),
      );
    });
  }

  it('rerenders controlled values without emitting change callbacks', () => {
    const changed = vi.fn();
    const valueChanged = vi.fn();
    render(<TextInput value="first" onChange={changed} onValueChange={valueChanged} />);
    render(<TextInput value="second" onChange={changed} onValueChange={valueChanged} />);
    expect(input().value).toBe('second');
    expect(changed).not.toHaveBeenCalled();
    expect(valueChanged).not.toHaveBeenCalled();
  });

  it('delivers user edits in native callback then value callback order', () => {
    const calls: string[] = [];
    render(
      <TextInput
        defaultValue=""
        onChange={(event) => calls.push(`change:${event.currentTarget.value}`)}
        onValueChange={(value, event) => {
          expect(event.currentTarget).toBe(input());
          calls.push(`value:${value}`);
        }}
      />,
    );
    edit('Ada');
    expect(calls).toEqual(['change:Ada', 'value:Ada']);
    expect(input().value).toBe('Ada');
  });

  it('forwards composition events and identifies composing edits', () => {
    const composition: string[] = [];
    const edits: [string, boolean][] = [];
    render(
      <TextInput
        defaultValue=""
        onCompositionStart={() => composition.push('start')}
        onCompositionEnd={() => composition.push('end')}
        onValueChange={(value, event) =>
          edits.push([value, (event.nativeEvent as InputEvent).isComposing])
        }
      />,
    );
    act(() => input().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
    edit('ㅎ', true);
    act(() =>
      input().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' })),
    );
    edit('한', false);
    expect(composition).toEqual(['start', 'end']);
    expect(edits).toEqual([
      ['ㅎ', true],
      ['한', false],
    ]);
  });

  it('preserves the input node focus and ref across value updates', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <label htmlFor="name">
        Name
        <TextInput
          id="name"
          ref={ref}
          value="first"
          onValueChange={() => {}}
          aria-describedby="hint"
        />
      </label>,
    );
    const element = input();
    act(() => element.focus());
    render(
      <label htmlFor="name">
        Name
        <TextInput
          id="name"
          ref={ref}
          value="second"
          onValueChange={() => {}}
          aria-describedby="hint"
        />
      </label>,
    );
    expect(input()).toBe(element);
    expect(ref.current).toBe(element);
    expect(document.activeElement).toBe(element);
    expect(element.labels?.[0]?.textContent).toBe('Name');
    expect(element.getAttribute('aria-describedby')).toBe('hint');
  });

  it('retains native uncontrolled form reset and disabled semantics', () => {
    const changed = vi.fn();
    render(
      <form>
        <TextInput name="name" defaultValue="initial" onValueChange={changed} />
        <TextInput name="excluded" defaultValue="hidden" disabled />
        <TextInput name="readonly" defaultValue="readable" readOnly />
      </form>,
    );
    edit('edited');
    const form = container.querySelector('form')!;
    const submitted = new FormData(form);
    expect(submitted.get('name')).toBe('edited');
    expect(submitted.has('excluded')).toBe(false);
    expect(submitted.get('readonly')).toBe('readable');
    act(() => form.reset());
    expect(input().value).toBe('initial');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(container.querySelector<HTMLInputElement>('[name="excluded"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('[name="readonly"]')?.readOnly).toBe(true);
  });

  it('clears refs and stops delegated callbacks after removal', () => {
    const ref = createRef<HTMLInputElement>();
    const changed = vi.fn();
    render(<TextInput ref={ref} onValueChange={changed} />);
    const detached = input();
    render(null);
    expect(ref.current).toBeNull();
    act(() => detached.dispatchEvent(new InputEvent('input', { bubbles: true })));
    expect(changed).not.toHaveBeenCalled();
  });
});
