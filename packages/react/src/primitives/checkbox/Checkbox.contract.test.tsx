/** @vitest-environment jsdom */

import { act, createRef, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('Checkbox adapter contract', () => {
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
  function input(name?: string) {
    return container.querySelector<HTMLInputElement>(name ? `input[name="${name}"]` : 'input')!;
  }
  function click(element: HTMLElement) {
    act(() => element.click());
  }

  it('rerenders controlled checked values without emitting change callbacks', () => {
    const changed = vi.fn();
    const checkedChanged = vi.fn();
    render(<Checkbox checked={false} onChange={changed} onCheckedChange={checkedChanged} />);
    expect(input().checked).toBe(false);
    render(<Checkbox checked onChange={changed} onCheckedChange={checkedChanged} />);
    expect(input().checked).toBe(true);
    render(<Checkbox checked={false} onChange={changed} onCheckedChange={checkedChanged} />);
    expect(input().checked).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(checkedChanged).not.toHaveBeenCalled();
  });

  it('delivers clicks in native callback then boolean callback order with the same event', () => {
    const calls: string[] = [];
    const nativeEvents: ChangeEvent<HTMLInputElement>[] = [];
    const checkedEvents: ChangeEvent<HTMLInputElement>[] = [];
    render(
      <Checkbox
        defaultChecked={false}
        onChange={(event) => {
          nativeEvents.push(event);
          expect(event.currentTarget).toBe(input());
          calls.push(`change:${event.currentTarget.checked}`);
        }}
        onCheckedChange={(checked, event) => {
          checkedEvents.push(event);
          expect(typeof checked).toBe('boolean');
          expect(event.currentTarget).toBe(input());
          expect(checked).toBe(event.currentTarget.checked);
          calls.push(`checked:${checked}`);
        }}
      />,
    );
    click(input());
    click(input());
    expect(calls).toEqual(['change:true', 'checked:true', 'change:false', 'checked:false']);
    expect(nativeEvents).toHaveLength(2);
    expect(checkedEvents).toHaveLength(2);
    expect(checkedEvents[0]).toBe(nativeEvents[0]);
    expect(checkedEvents[1]).toBe(nativeEvents[1]);
    expect(input().checked).toBe(false);
  });

  it('activates the associated input once when its label is clicked', () => {
    const changed = vi.fn();
    const checkedChanged = vi.fn();
    render(<Checkbox label="Enable option" onChange={changed} onCheckedChange={checkedChanged} />);
    const label = container.querySelector('label')!;
    expect(input().labels?.[0]).toBe(label);
    expect(label.textContent).toBe('Enable option');
    click(label);
    expect(input().checked).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(checkedChanged).toHaveBeenCalledTimes(1);
    expect(checkedChanged.mock.calls[0][0]).toBe(true);
  });

  it('preserves the input node focus and ref across checked and appearance updates', () => {
    const ref = createRef<HTMLInputElement>();
    const changed = vi.fn();
    render(<Checkbox ref={ref} checked={false} label="Option" onCheckedChange={changed} />);
    const element = input();
    act(() => element.focus());
    render(
      <Checkbox
        ref={ref}
        checked
        label="Option"
        className="alternate-appearance"
        aria-describedby="option-help"
        onCheckedChange={changed}
      />,
    );
    expect(input()).toBe(element);
    expect(ref.current).toBe(element);
    expect(document.activeElement).toBe(element);
    expect(element.checked).toBe(true);
    expect(element.getAttribute('aria-describedby')).toBe('option-help');
    expect(container.querySelector('label')?.classList.contains('alternate-appearance')).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  it('retains native form values disabled readOnly and uncontrolled reset semantics', () => {
    const selectedChanged = vi.fn();
    const optionalChanged = vi.fn();
    const disabledChanged = vi.fn();
    const readonlyChanged = vi.fn();
    render(
      <form>
        <Checkbox
          name="selected"
          value="selected-value"
          defaultChecked
          onCheckedChange={selectedChanged}
        />
        <Checkbox
          name="optional"
          value="optional-value"
          defaultChecked={false}
          onCheckedChange={optionalChanged}
        />
        <Checkbox
          name="disabled"
          value="disabled-value"
          defaultChecked
          disabled
          onCheckedChange={disabledChanged}
        />
        <Checkbox
          name="readonly"
          value="readonly-value"
          defaultChecked
          readOnly
          onCheckedChange={readonlyChanged}
        />
      </form>,
    );
    const form = container.querySelector('form')!;
    const initial = new FormData(form);
    expect(initial.get('selected')).toBe('selected-value');
    expect(initial.has('optional')).toBe(false);
    expect(initial.has('disabled')).toBe(false);
    expect(initial.get('readonly')).toBe('readonly-value');
    expect(input('disabled').disabled).toBe(true);
    expect(input('readonly').readOnly).toBe(true);
    click(input('selected'));
    click(input('optional'));
    click(input('disabled'));
    click(input('readonly'));
    expect(input('disabled').checked).toBe(true);
    expect(input('readonly').checked).toBe(false);
    const edited = new FormData(form);
    expect(edited.has('selected')).toBe(false);
    expect(edited.get('optional')).toBe('optional-value');
    expect(edited.has('disabled')).toBe(false);
    expect(edited.has('readonly')).toBe(false);
    act(() => form.reset());
    expect(input('selected').checked).toBe(true);
    expect(input('optional').checked).toBe(false);
    expect(input('readonly').checked).toBe(true);
    expect(new FormData(form).get('selected')).toBe('selected-value');
    expect(selectedChanged).toHaveBeenCalledTimes(1);
    expect(optionalChanged).toHaveBeenCalledTimes(1);
    expect(disabledChanged).not.toHaveBeenCalled();
    expect(readonlyChanged).toHaveBeenCalledTimes(1);
  });

  it('retains native required validity as the checked state changes', () => {
    render(<Checkbox name="agreement" required defaultChecked={false} />);
    expect(input().required).toBe(true);
    expect(input().validity.valueMissing).toBe(true);
    expect(input().checkValidity()).toBe(false);
    click(input());
    expect(input().validity.valueMissing).toBe(false);
    expect(input().checkValidity()).toBe(true);
    click(input());
    expect(input().validity.valueMissing).toBe(true);
    expect(input().checkValidity()).toBe(false);
  });

  it('clears refs and prevents detached or duplicate callbacks across remounts', () => {
    const ref = createRef<HTMLInputElement>();
    const changed = vi.fn();
    const checkedChanged = vi.fn();
    for (let index = 0; index < 3; index += 1) {
      render(<Checkbox ref={ref} onChange={changed} onCheckedChange={checkedChanged} />);
      const detached = input();
      expect(ref.current).toBe(detached);
      click(detached);
      expect(changed).toHaveBeenCalledTimes(index + 1);
      expect(checkedChanged).toHaveBeenCalledTimes(index + 1);
      render(null);
      expect(ref.current).toBeNull();
      click(detached);
      expect(changed).toHaveBeenCalledTimes(index + 1);
      expect(checkedChanged).toHaveBeenCalledTimes(index + 1);
    }
  });
});
