/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindNativeTextInput,
  type NativeTextInputBinding,
  type NativeTextInputEdit,
} from './native-text-input.js';

describe('native text input binding', () => {
  const bindings: NativeTextInputBinding[] = [];
  afterEach(() => {
    for (const binding of bindings.splice(0)) binding.dispose();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function input() {
    const element = document.createElement('input');
    element.type = 'text';
    document.body.append(element);
    return element;
  }
  function bind(element: HTMLInputElement, onEdit: (edit: NativeTextInputEdit) => void = () => {}) {
    const binding = bindNativeTextInput(element, onEdit);
    bindings.push(binding);
    return binding;
  }

  it('rejects invalid inputs callbacks and active duplicate ownership', () => {
    for (const value of [null, undefined, {}, document.createElement('textarea')]) {
      expect(() => bindNativeTextInput(value as HTMLInputElement, () => {})).toThrow(TypeError);
    }
    const element = input();
    for (const type of ['checkbox', 'number', 'file', 'search', 'email', 'password']) {
      element.type = type;
      expect(() => bind(element)).toThrow(TypeError);
    }
    element.type = 'text';
    expect(() => bind(element, null as unknown as () => void)).toThrow(TypeError);
    const first = bind(element);
    expect(() => bind(element)).toThrow('Text input already has an active binding');
    first.dispose();
    expect(() => bind(element)).not.toThrow();
  });

  it('reports native input events once without cancellation or synthesized changes', () => {
    const element = input();
    const edits: NativeTextInputEdit[] = [];
    const propagated = vi.fn();
    const changed = vi.fn();
    document.body.addEventListener('input', propagated, { once: true });
    element.addEventListener('change', changed);
    bind(element, (edit) => edits.push(edit));
    element.value = 'edited';
    expect(edits).toEqual([]);
    const event = new InputEvent('input', { bubbles: true, cancelable: true, data: 'edited' });
    expect(element.dispatchEvent(event)).toBe(true);
    expect(edits).toEqual([{ value: 'edited', isComposing: false, event }]);
    expect(edits[0].event).toBe(event);
    expect(event.defaultPrevented).toBe(false);
    expect(propagated).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
  });

  it('sets values without events or host attribute and default value changes', () => {
    const element = input();
    element.defaultValue = 'default';
    element.name = 'title';
    element.className = 'host-class';
    element.style.color = 'red';
    element.setAttribute('aria-label', 'Title');
    const attributes = element.outerHTML;
    const edited = vi.fn();
    const changed = vi.fn();
    element.addEventListener('change', changed);
    const binding = bind(element, edited);
    const previousFocus = document.activeElement;
    expect(binding.setValue('next\r\nline')).toBe(true);
    expect(element.value).toBe('nextline');
    expect(element.defaultValue).toBe('default');
    expect(element.outerHTML).toBe(attributes);
    expect(document.activeElement).toBe(previousFocus);
    expect(edited).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(() => binding.setValue(42 as unknown as string)).toThrow(TypeError);
    expect(element.value).toBe('nextline');
  });

  it('avoids same-value writes while preserving selection node and focus', () => {
    const element = input();
    element.value = 'selection';
    element.focus();
    element.setSelectionRange(1, 4, 'backward');
    const setter = vi.spyOn(element, 'value', 'set');
    const binding = bind(element);
    expect(binding.setValue('selection')).toBe(true);
    expect(setter).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element);
    expect(document.body.firstElementChild).toBe(element);
    expect(element.selectionStart).toBe(1);
    expect(element.selectionEnd).toBe(4);
    expect(element.selectionDirection).toBe('backward');
    element.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(binding.setValue('selection')).toBe(true);
    expect(binding.setValue('replacement')).toBe(false);
    expect(setter).not.toHaveBeenCalled();
  });

  it('tracks composition before reentrant edits and never replays refused updates', () => {
    const element = input();
    const edits: NativeTextInputEdit[] = [];
    const attempts: boolean[] = [];
    const binding = bind(element, (edit) => {
      edits.push(edit);
      attempts.push(binding.setValue('replacement'));
    });
    element.dispatchEvent(new CompositionEvent('compositionstart'));
    element.value = 'ㅎ';
    element.dispatchEvent(new Event('input'));
    expect(edits[0].isComposing).toBe(true);
    expect(attempts).toEqual([false]);
    expect(element.value).toBe('ㅎ');
    element.dispatchEvent(new CompositionEvent('compositionend'));
    expect(edits).toHaveLength(1);
    expect(element.value).toBe('ㅎ');
    expect(binding.setValue('accepted')).toBe(true);

    element.value = '한';
    element.dispatchEvent(new InputEvent('input', { isComposing: true }));
    expect(edits[1].isComposing).toBe(true);
    expect(attempts).toEqual([false, false]);
    expect(element.value).toBe('한');
    element.dispatchEvent(new Event('blur'));
    expect(edits).toHaveLength(2);
    expect(binding.setValue('after blur')).toBe(true);
    expect(element.value).toBe('after blur');
    element.dispatchEvent(new InputEvent('input', { isComposing: false }));
    expect(edits[2].isComposing).toBe(false);
    expect(attempts).toEqual([false, false, true]);
  });

  it('preserves native form reset validity disabled and readOnly properties', () => {
    const form = document.createElement('form');
    const element = input();
    element.defaultValue = 'initial';
    element.name = 'title';
    element.required = true;
    form.append(element);
    document.body.append(form);
    const edited = vi.fn();
    const binding = bind(element, edited);
    expect(binding.setValue('')).toBe(true);
    expect(element.validity.valueMissing).toBe(true);
    expect(binding.setValue('updated')).toBe(true);
    expect(new FormData(form).get('title')).toBe('updated');
    element.readOnly = true;
    expect(new FormData(form).get('title')).toBe('updated');
    element.disabled = true;
    expect(new FormData(form).has('title')).toBe(false);
    form.reset();
    expect(element.value).toBe('initial');
    expect(element.defaultValue).toBe('initial');
    expect(element.disabled).toBe(true);
    expect(element.readOnly).toBe(true);
    expect(element.required).toBe(true);
    expect(edited).not.toHaveBeenCalled();
  });

  it('ignores edits and writes while the host uses an unsupported input type', () => {
    const element = input();
    const edited = vi.fn();
    const binding = bind(element, edited);
    element.dispatchEvent(new CompositionEvent('compositionstart'));
    element.type = 'number';
    element.value = '42';
    element.dispatchEvent(new InputEvent('input'));
    expect(binding.setValue('42')).toBe(false);
    expect(binding.setValue('99')).toBe(false);
    expect(element.value).toBe('42');
    expect(element.type).toBe('number');
    expect(edited).not.toHaveBeenCalled();
    element.dispatchEvent(new Event('blur'));
    element.type = 'text';
    expect(binding.setValue('restored')).toBe(true);
    element.dispatchEvent(new InputEvent('input'));
    expect(edited).toHaveBeenCalledTimes(1);
    expect(edited.mock.calls[0][0].isComposing).toBe(false);
  });

  it('disposes only owned listeners and permits rebind without stale disposal effects', () => {
    const element = input();
    const hostListener = vi.fn();
    element.addEventListener('input', hostListener);
    element.value = 'host';
    const firstEdited = vi.fn();
    const secondEdited = vi.fn();
    const first = bind(element, firstEdited);
    element.remove();
    element.dispatchEvent(new Event('input'));
    expect(firstEdited).toHaveBeenCalledTimes(1);
    first.dispose();
    first.dispose();
    expect(first.setValue('ignored')).toBe(false);
    expect(first.setValue('host')).toBe(false);
    expect(() => first.setValue(null as unknown as string)).toThrow(TypeError);
    expect(element.value).toBe('host');
    element.dispatchEvent(new Event('input'));
    expect(firstEdited).toHaveBeenCalledTimes(1);
    const second = bind(element, secondEdited);
    first.dispose();
    element.dispatchEvent(new Event('input'));
    expect(secondEdited).toHaveBeenCalledTimes(1);
    expect(hostListener).toHaveBeenCalledTimes(3);
    second.dispose();
  });

  it('isolates control composition and supports disposal during edit callbacks', () => {
    const firstInput = input();
    const secondInput = input();
    const firstEdited = vi.fn();
    const first = bind(firstInput, firstEdited);
    const secondEdited = vi.fn(() => second.dispose());
    const second = bind(secondInput, secondEdited);
    firstInput.dispatchEvent(new CompositionEvent('compositionstart'));
    expect(first.setValue('deferred')).toBe(false);
    expect(second.setValue('independent')).toBe(true);
    secondInput.dispatchEvent(new Event('input'));
    secondInput.dispatchEvent(new Event('input'));
    expect(secondEdited).toHaveBeenCalledTimes(1);
    expect(firstEdited).not.toHaveBeenCalled();
    firstInput.dispatchEvent(new CompositionEvent('compositionend'));
    expect(first.setValue('finished')).toBe(true);
  });

  it('imports without DOM globals and reports invalid binding with TypeError', async () => {
    vi.resetModules();
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('HTMLInputElement', undefined);
    const module = await import('./native-text-input.js');
    expect(typeof module.bindNativeTextInput).toBe('function');
    expect(() => module.bindNativeTextInput(null as unknown as HTMLInputElement, () => {})).toThrow(
      TypeError,
    );
    vi.unstubAllGlobals();
  });
});
