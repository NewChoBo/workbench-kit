/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindNativeCheckbox,
  type NativeCheckboxBinding,
  type NativeCheckboxEdit,
} from './native-checkbox.js';

describe('native checkbox binding', () => {
  const bindings: NativeCheckboxBinding[] = [];
  afterEach(() => {
    for (const binding of bindings.splice(0)) binding.dispose();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function checkbox() {
    const element = document.createElement('input');
    element.type = 'checkbox';
    document.body.append(element);
    return element;
  }
  function bind(element: HTMLInputElement, onEdit: (edit: NativeCheckboxEdit) => void = () => {}) {
    const binding = bindNativeCheckbox(element, onEdit);
    bindings.push(binding);
    return binding;
  }

  it('rejects invalid elements callbacks and active duplicate ownership', () => {
    for (const value of [null, undefined, {}, document.createElement('div')]) {
      expect(() => bindNativeCheckbox(value as HTMLInputElement, () => {})).toThrow(TypeError);
    }
    const element = checkbox();
    for (const type of ['text', 'radio', 'number', 'file', 'button']) {
      element.type = type;
      expect(() => bind(element)).toThrow(TypeError);
    }
    element.type = 'checkbox';
    for (const callback of [null, undefined, true, {}]) {
      expect(() => bindNativeCheckbox(element, callback as unknown as () => void)).toThrow(
        TypeError,
      );
    }
    const first = bind(element);
    expect(() => bind(element)).toThrow('Checkbox already has an active binding');
    first.dispose();
    expect(() => bind(element)).not.toThrow();
  });

  it('accepts a checkbox from another DOM realm', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const foreign = frame.contentDocument!.createElement('input');
    foreign.type = 'checkbox';
    frame.contentDocument!.body.append(foreign);
    expect(foreign instanceof HTMLInputElement).toBe(false);
    const edited = vi.fn();
    const binding = bind(foreign, edited);
    expect(binding.setChecked(true)).toBe(true);
    foreign.click();
    expect(edited).toHaveBeenCalledTimes(1);
    expect(edited.mock.calls[0][0].checked).toBe(false);
    expect(edited.mock.calls[0][0].event.target).toBe(foreign);
  });

  it('registers without changing native state markup defaults or focus', () => {
    const element = checkbox();
    element.defaultChecked = true;
    element.checked = false;
    element.indeterminate = true;
    element.value = 'submitted';
    element.name = 'choice';
    element.className = 'host-class';
    element.style.color = 'red';
    element.required = true;
    element.setAttribute('aria-label', 'Choice');
    element.focus();
    const markup = element.outerHTML;
    const edited = vi.fn();
    bind(element, edited);
    expect(element.outerHTML).toBe(markup);
    expect(element.checked).toBe(false);
    expect(element.indeterminate).toBe(true);
    expect(element.defaultChecked).toBe(true);
    expect(document.activeElement).toBe(element);
    expect(document.body.firstElementChild).toBe(element);
    expect(edited).not.toHaveBeenCalled();
  });

  it('reports one original change after native input without blocking propagation', () => {
    const element = checkbox();
    element.indeterminate = true;
    element.value = 'custom';
    const order: string[] = [];
    const edits: NativeCheckboxEdit[] = [];
    element.addEventListener('click', () => order.push('click'));
    element.addEventListener('input', () => order.push('input'));
    bind(element, (edit) => {
      order.push('edit');
      edits.push(edit);
    });
    const propagated = vi.fn((event: Event) => {
      order.push('change');
      expect(edits[0].event).toBe(event);
    });
    document.body.addEventListener('change', propagated, { once: true });
    element.click();
    expect(order).toEqual(['click', 'input', 'edit', 'change']);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ checked: true, indeterminate: false, value: 'custom' });
    expect(edits[0].event.defaultPrevented).toBe(false);
    expect(propagated).toHaveBeenCalledTimes(1);
  });

  it('snapshots each native field once before a reentrant synthetic change callback', () => {
    const element = checkbox();
    element.checked = true;
    element.indeterminate = true;
    element.value = 'before';
    const checked = vi.spyOn(element, 'checked', 'get');
    const indeterminate = vi.spyOn(element, 'indeterminate', 'get');
    const value = vi.spyOn(element, 'value', 'get');
    const edits: NativeCheckboxEdit[] = [];
    bind(element, (edit) => {
      edits.push(edit);
      element.checked = false;
      element.indeterminate = false;
      element.value = 'after';
    });
    element.dispatchEvent(new Event('input'));
    expect(edits).toHaveLength(0);
    const event = new Event('change', { bubbles: true, cancelable: true });
    expect(element.dispatchEvent(event)).toBe(true);
    expect(checked).toHaveBeenCalledTimes(1);
    expect(indeterminate).toHaveBeenCalledTimes(1);
    expect(value).toHaveBeenCalledTimes(1);
    expect(edits).toEqual([{ checked: true, indeterminate: true, value: 'before', event }]);
    expect(edits[0].event).toBe(event);
    expect(event.defaultPrevented).toBe(false);
    expect(element.value).toBe('after');
  });

  it('silently changes only the requested property and skips equal writes', () => {
    const element = checkbox();
    element.defaultChecked = true;
    element.checked = false;
    element.value = 'custom';
    element.name = 'choice';
    element.disabled = true;
    element.required = true;
    element.readOnly = true;
    element.setAttribute('aria-label', 'Choice');
    element.disabled = false;
    element.focus();
    element.disabled = true;
    const focus = document.activeElement;
    const markup = element.outerHTML;
    const edited = vi.fn();
    const nativeEvents = vi.fn();
    for (const type of ['click', 'input', 'change']) element.addEventListener(type, nativeEvents);
    const checked = vi.spyOn(element, 'checked', 'set');
    const indeterminate = vi.spyOn(element, 'indeterminate', 'set');
    const binding = bind(element, edited);
    expect(binding.setChecked(false)).toBe(true);
    expect(binding.setIndeterminate(false)).toBe(true);
    expect(checked).not.toHaveBeenCalled();
    expect(indeterminate).not.toHaveBeenCalled();
    expect(binding.setChecked(true)).toBe(true);
    expect(element.indeterminate).toBe(false);
    expect(binding.setIndeterminate(true)).toBe(true);
    expect(element.checked).toBe(true);
    expect(binding.setChecked(true)).toBe(true);
    expect(binding.setIndeterminate(true)).toBe(true);
    expect(checked).toHaveBeenCalledTimes(1);
    expect(indeterminate).toHaveBeenCalledTimes(1);
    expect(element.outerHTML).toBe(markup);
    expect(element.defaultChecked).toBe(true);
    expect(element.value).toBe('custom');
    expect(document.activeElement).toBe(focus);
    expect(document.body.firstElementChild).toBe(element);
    expect(edited).not.toHaveBeenCalled();
    expect(nativeEvents).not.toHaveBeenCalled();
  });

  it('requires primitive booleans before disposed and unsupported state checks', () => {
    const element = checkbox();
    const binding = bind(element);
    for (const phase of ['active', 'unsupported', 'disposed']) {
      if (phase === 'unsupported') element.type = 'text';
      if (phase === 'disposed') binding.dispose();
      for (const value of [null, undefined, 0, 1, 'false', {}, [], Object(true)]) {
        expect(() => binding.setChecked(value as boolean)).toThrow(TypeError);
        expect(() => binding.setIndeterminate(value as boolean)).toThrow(TypeError);
      }
      expect(element.checked).toBe(false);
      expect(element.indeterminate).toBe(false);
      if (phase !== 'active') {
        expect(binding.setChecked(false)).toBe(false);
        expect(binding.setIndeterminate(false)).toBe(false);
      }
    }
  });

  it('keeps checked indeterminate and native form values separate', () => {
    const form = document.createElement('form');
    const element = checkbox();
    element.name = 'choice';
    element.required = true;
    form.append(element);
    document.body.append(form);
    const edited = vi.fn();
    const binding = bind(element, edited);
    expect(element.validity.valueMissing).toBe(true);
    expect(binding.setIndeterminate(true)).toBe(true);
    expect(new FormData(form).has('choice')).toBe(false);
    expect(binding.setChecked(true)).toBe(true);
    expect(element.validity.valueMissing).toBe(false);
    expect(element.indeterminate).toBe(true);
    expect(new FormData(form).get('choice')).toBe('on');
    element.value = 'custom';
    expect(new FormData(form).get('choice')).toBe('custom');
    element.disabled = true;
    expect(new FormData(form).has('choice')).toBe(false);
    element.click();
    expect(element.checked).toBe(true);
    expect(edited).not.toHaveBeenCalled();
    element.disabled = false;
    element.readOnly = true;
    element.click();
    expect(element.checked).toBe(false);
    expect(element.indeterminate).toBe(false);
    expect(new FormData(form).has('choice')).toBe(false);
    expect(edited).toHaveBeenCalledTimes(1);
  });

  it('preserves native label activation reset and canceled activation rollback', () => {
    const form = document.createElement('form');
    const element = checkbox();
    element.id = 'choice';
    element.defaultChecked = true;
    const label = document.createElement('label');
    label.htmlFor = element.id;
    label.textContent = 'Choice';
    form.append(label, element);
    document.body.append(form);
    const edited = vi.fn();
    const binding = bind(element, edited);
    label.click();
    expect(element.checked).toBe(false);
    expect(edited).toHaveBeenCalledTimes(1);
    binding.setIndeterminate(true);
    form.reset();
    expect(element.checked).toBe(true);
    expect(element.defaultChecked).toBe(true);
    expect(element.indeterminate).toBe(true);
    expect(edited).toHaveBeenCalledTimes(1);

    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    element.click();
    expect(element.checked).toBe(true);
    expect(element.indeterminate).toBe(true);
    expect(edited).toHaveBeenCalledTimes(1);
    binding.setChecked(false);
    form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
    form.reset();
    expect(element.checked).toBe(false);
    expect(element.indeterminate).toBe(true);
    expect(edited).toHaveBeenCalledTimes(1);
  });

  it('ignores changes and writes for other types then resumes on the same checkbox', () => {
    const element = checkbox();
    const edited = vi.fn();
    const binding = bind(element, edited);
    element.type = 'radio';
    element.dispatchEvent(new Event('change'));
    expect(binding.setChecked(true)).toBe(false);
    expect(binding.setIndeterminate(true)).toBe(false);
    expect(element.checked).toBe(false);
    expect(element.indeterminate).toBe(false);
    expect(edited).not.toHaveBeenCalled();
    element.type = 'checkbox';
    expect(() => bind(element)).toThrow('Checkbox already has an active binding');
    expect(binding.setIndeterminate(true)).toBe(true);
    element.click();
    expect(edited).toHaveBeenCalledTimes(1);
    expect(edited.mock.calls[0][0]).toMatchObject({ checked: true, indeterminate: false });
  });

  it('requires explicit disposal and leaves host state and listeners intact on rebind', () => {
    const element = checkbox();
    element.value = 'host';
    const hostListener = vi.fn();
    element.addEventListener('change', hostListener);
    const firstEdited = vi.fn();
    const secondEdited = vi.fn();
    const first = bind(element, firstEdited);
    element.remove();
    element.dispatchEvent(new Event('change'));
    expect(firstEdited).toHaveBeenCalledTimes(1);
    first.setChecked(true);
    first.setIndeterminate(true);
    const markup = element.outerHTML;
    first.dispose();
    first.dispose();
    expect(first.setChecked(false)).toBe(false);
    expect(first.setIndeterminate(false)).toBe(false);
    expect(element.checked).toBe(true);
    expect(element.indeterminate).toBe(true);
    expect(element.outerHTML).toBe(markup);
    element.dispatchEvent(new Event('change'));
    expect(firstEdited).toHaveBeenCalledTimes(1);
    const second = bind(element, secondEdited);
    first.dispose();
    element.dispatchEvent(new Event('change'));
    expect(secondEdited).toHaveBeenCalledTimes(1);
    expect(hostListener).toHaveBeenCalledTimes(3);
    second.dispose();
  });

  it('supports synchronous setters disposal and rebind during a callback', () => {
    const element = checkbox();
    const edits: NativeCheckboxEdit[] = [];
    const secondEdited = vi.fn();
    const first = bind(element, (edit) => {
      edits.push(edit);
      expect(first.setChecked(false)).toBe(true);
      expect(first.setIndeterminate(true)).toBe(true);
      first.dispose();
      bind(element, secondEdited);
    });
    element.click();
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ checked: true, indeterminate: false });
    expect(element.checked).toBe(false);
    expect(element.indeterminate).toBe(true);
    expect(secondEdited).not.toHaveBeenCalled();
    first.dispose();
    element.click();
    expect(edits).toHaveLength(1);
    expect(secondEdited).toHaveBeenCalledTimes(1);
    expect(secondEdited.mock.calls[0][0]).toMatchObject({ checked: true, indeterminate: false });
  });

  it('keeps bindings and native properties independent across controls', () => {
    const firstElement = checkbox();
    const secondElement = checkbox();
    const firstEdited = vi.fn();
    const secondEdited = vi.fn();
    const first = bind(firstElement, firstEdited);
    const second = bind(secondElement, secondEdited);
    first.setChecked(true);
    second.setIndeterminate(true);
    expect(firstElement.indeterminate).toBe(false);
    expect(secondElement.checked).toBe(false);
    firstElement.click();
    expect(firstEdited).toHaveBeenCalledTimes(1);
    expect(secondEdited).not.toHaveBeenCalled();
    expect(secondElement.indeterminate).toBe(true);
    first.dispose();
    expect(second.setChecked(true)).toBe(true);
    secondElement.click();
    expect(secondEdited).toHaveBeenCalledTimes(1);
  });

  it('leaves callback exceptions to native EventTarget reporting', () => {
    const element = checkbox();
    const error = new Error('consumer callback failed');
    const reported: unknown[] = [];
    const reportError = (event: ErrorEvent) => {
      reported.push(event.error);
      event.preventDefault();
    };
    const hostListener = vi.fn();
    bind(element, () => {
      throw error;
    });
    element.addEventListener('change', hostListener);
    window.addEventListener('error', reportError);
    try {
      expect(element.dispatchEvent(new Event('change', { cancelable: true }))).toBe(true);
      expect(reported).toEqual([error]);
      expect(hostListener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('error', reportError);
    }
  });

  it('imports without DOM globals and fails invalid binding with TypeError', async () => {
    vi.resetModules();
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('HTMLInputElement', undefined);
    const module = await import('./native-checkbox.js');
    expect(typeof module.bindNativeCheckbox).toBe('function');
    expect(() => module.bindNativeCheckbox(null as unknown as HTMLInputElement, () => {})).toThrow(
      TypeError,
    );
    vi.unstubAllGlobals();
  });
});
