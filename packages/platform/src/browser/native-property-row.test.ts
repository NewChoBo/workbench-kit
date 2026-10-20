/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindNativeCheckbox } from './native-checkbox.js';
import { bindNativeTextInput } from './native-text-input.js';
import {
  bindNativePropertyRow,
  type NativePropertyRowBinding,
  type NativePropertyRowElements,
} from './native-property-row.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function row(doc = document, id = 'name') {
  const root = doc.createElement('div');
  const control = doc.createElement('input');
  control.id = id;
  control.defaultValue = 'Original';
  const label = doc.createElement('label');
  label.textContent = 'Name';
  const description = doc.createElement('p');
  description.id = `${id}-help`;
  description.textContent = 'Help';
  const error = doc.createElement('p');
  error.id = `${id}-error`;
  error.textContent = 'Problem';
  root.append(label, control, description, error);
  doc.body.append(root);
  return { root, control, label, description, error };
}
function bind(elements: NativePropertyRowElements): NativePropertyRowBinding {
  const binding = bindNativePropertyRow(elements);
  cleanups.push(() => binding.dispose());
  return binding;
}
function attributes(element: HTMLElement) {
  return Array.from(element.attributes).map(({ name, value }) => [name, value]);
}

describe('native property row binding', () => {
  it('associates native labels help and errors without creating or moving nodes', () => {
    const elements = row();
    const children = Array.from(elements.root.childNodes);
    bind(elements);
    expect(elements.label.control).toBe(elements.control);
    expect(elements.control.getAttribute('aria-describedby')).toBe('name-help name-error');
    expect(elements.control.getAttribute('aria-invalid')).toBe('true');
    expect(Array.from(elements.root.childNodes)).toEqual(children);
  });

  it('rejects wrong kinds argument shapes and unsupported control types without mutation', () => {
    const elements = row();
    const before = attributes(elements.control);
    for (const invalid of [null, undefined, 0, {}]) {
      expect(() => bindNativePropertyRow(invalid as NativePropertyRowElements)).toThrow(TypeError);
    }
    expect(() =>
      bind({ ...elements, label: elements.description as unknown as HTMLLabelElement }),
    ).toThrow(TypeError);
    for (const type of ['radio', 'number', 'hidden']) {
      elements.control.type = type;
      expect(() => bind(elements)).toThrow(TypeError);
    }
    elements.control.removeAttribute('type');
    for (const description of [null, 'id', {}, document.createTextNode('Text')]) {
      expect(() => bind({ ...elements, description: description as HTMLElement })).toThrow(
        TypeError,
      );
    }
    expect(attributes(elements.control)).toEqual(before);
    expect(elements.label.hasAttribute('for')).toBe(false);
  });

  it('requires ID tokens and a common document tree before mutating metadata', () => {
    const elements = row();
    for (const id of ['', 'two tokens', 'bad\tid']) {
      elements.control.id = id;
      expect(() => bind(elements)).toThrow(TypeError);
    }
    elements.control.id = 'name';
    elements.description.id = '';
    expect(() => bind(elements)).toThrow(TypeError);
    elements.description.id = 'name-help';
    elements.description.remove();
    expect(() => bind(elements)).toThrow('one DOM tree');
    expect(elements.label.hasAttribute('for')).toBe(false);
    expect(elements.control.hasAttribute('aria-describedby')).toBe(false);
  });

  it('accepts another DOM realm and one common detached tree but rejects cross-realm mixing', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const foreign = row(frame.contentDocument!);
    const local = row();
    expect(() => bind({ ...foreign, description: local.description })).toThrow(TypeError);
    bind(foreign);
    expect(foreign.label.control).toBe(foreign.control);
    local.root.remove();
    bind(local);
    expect(local.label.control).toBe(local.control);
  });

  it('rejects duplicate control or label ownership and allows cleanup then rebinding', () => {
    const first = row(document, 'first');
    const second = row(document, 'second');
    const binding = bind(first);
    expect(() => bind(first)).toThrow('active binding');
    expect(() => bind({ ...second, label: first.label })).toThrow('active binding');
    expect(second.control.hasAttribute('aria-describedby')).toBe(false);
    binding.dispose();
    const next = bind(first);
    binding.dispose();
    expect(first.label.control).toBe(first.control);
    next.dispose();
  });

  it('preserves baseline ID tokens deduplicates targets and removes only owned tokens', () => {
    const elements = row();
    elements.control.setAttribute('aria-describedby', '  external  name-help external ');
    const binding = bind(elements);
    expect(elements.control.getAttribute('aria-describedby')).toBe('external name-help name-error');
    binding.update({ description: elements.description, error: elements.description });
    expect(elements.control.getAttribute('aria-describedby')).toBe(
      '  external  name-help external ',
    );
    binding.update({});
    expect(elements.control.getAttribute('aria-describedby')).toBe(
      '  external  name-help external ',
    );
    binding.dispose();
    expect(elements.control.getAttribute('aria-describedby')).toBe(
      '  external  name-help external ',
    );
  });

  it('retains later external description tokens through updates and cleanup', () => {
    const elements = row();
    elements.control.setAttribute('aria-describedby', 'external');
    const binding = bind(elements);
    elements.control.setAttribute('aria-describedby', 'later external name-help name-error');
    const replacement = document.createElement('p');
    replacement.id = 'replacement';
    elements.root.append(replacement);
    binding.update({ description: replacement });
    expect(elements.control.getAttribute('aria-describedby')).toBe('later external replacement');
    binding.dispose();
    expect(elements.control.getAttribute('aria-describedby')).toBe('later external');
  });

  it.each([null, 'false', 'grammar', 'spelling', 'true'])(
    'restores the invalidity baseline %s for each error interval',
    (baseline) => {
      const elements = row();
      if (baseline !== null) elements.control.setAttribute('aria-invalid', baseline);
      const binding = bind(elements);
      expect(elements.control.getAttribute('aria-invalid')).toBe('true');
      binding.update({});
      expect(elements.control.getAttribute('aria-invalid')).toBe(baseline);
      elements.control.setAttribute('aria-invalid', 'grammar');
      binding.update({ error: elements.error });
      expect(elements.control.getAttribute('aria-invalid')).toBe('true');
      binding.dispose();
      expect(elements.control.getAttribute('aria-invalid')).toBe('grammar');
    },
  );

  it('preserves distinguishably newer external label and invalidity metadata', () => {
    const elements = row();
    elements.label.htmlFor = 'previous';
    const binding = bind(elements);
    elements.label.htmlFor = 'later';
    elements.control.setAttribute('aria-invalid', 'spelling');
    binding.update({ error: elements.error });
    expect(elements.control.getAttribute('aria-invalid')).toBe('spelling');
    binding.dispose();
    expect(elements.label.htmlFor).toBe('later');
    expect(elements.control.getAttribute('aria-invalid')).toBe('spelling');
  });

  it('restores original label metadata and never changes native names or validity', () => {
    const elements = row();
    elements.label.htmlFor = 'previous';
    elements.control.setAttribute('aria-label', 'Host name');
    elements.control.required = true;
    const binding = bind(elements);
    expect(elements.control.checkValidity()).toBe(true);
    expect(elements.control.getAttribute('aria-label')).toBe('Host name');
    binding.dispose();
    expect(elements.label.htmlFor).toBe('previous');
  });

  it('rejects invalid updates atomically and treats omission as a complete empty snapshot', () => {
    const elements = row();
    const binding = bind(elements);
    const before = attributes(elements.control);
    const missingId = document.createElement('p');
    elements.root.append(missingId);
    expect(() => binding.update({ description: missingId })).toThrow(TypeError);
    expect(attributes(elements.control)).toEqual(before);
    elements.control.id = 'changed';
    expect(() => binding.update({})).toThrow('remain stable');
    elements.control.id = 'name';
    binding.update({});
    expect(elements.control.hasAttribute('aria-describedby')).toBe(false);
    expect(elements.control.hasAttribute('aria-invalid')).toBe(false);
  });

  it('reads each target reference once for a synchronous snapshot', () => {
    const elements = row();
    const binding = bind({ control: elements.control, label: elements.label });
    let descriptionReads = 0;
    let errorReads = 0;
    binding.update({
      get description() {
        descriptionReads += 1;
        return elements.description;
      },
      get error() {
        errorReads += 1;
        return elements.error;
      },
    });
    expect([descriptionReads, errorReads]).toEqual([1, 1]);
    expect(elements.control.getAttribute('aria-describedby')).toBe('name-help name-error');
    expect(elements.control.getAttribute('aria-invalid')).toBe('true');
  });

  it('is inert after disposal or an unsupported type change while still validating arguments', () => {
    const elements = row();
    const binding = bind(elements);
    elements.control.type = 'number';
    const before = attributes(elements.control);
    expect(binding.update({})).toBe(false);
    expect(attributes(elements.control)).toEqual(before);
    elements.control.type = 'text';
    expect(binding.update({})).toBe(true);
    binding.dispose();
    binding.dispose();
    expect(binding.update({ error: elements.error })).toBe(false);
    expect(() => binding.update(null as never)).toThrow(TypeError);
    expect(elements.control.hasAttribute('aria-invalid')).toBe(false);
  });

  it('retains native values focus selection reset and edit behavior with the existing input binder', () => {
    const elements = row();
    const form = document.createElement('form');
    document.body.append(form);
    form.append(elements.root);
    elements.control.name = 'name';
    const edits = vi.fn();
    const input = bindNativeTextInput(elements.control, edits);
    cleanups.push(() => input.dispose());
    const binding = bind(elements);
    elements.control.focus();
    elements.control.setSelectionRange(1, 3);
    binding.update({ description: elements.description });
    expect(document.activeElement).toBe(elements.control);
    expect([elements.control.selectionStart, elements.control.selectionEnd]).toEqual([1, 3]);
    expect(elements.control.value).toBe('Original');
    expect(edits).not.toHaveBeenCalled();
    input.setValue('Edited');
    elements.control.dispatchEvent(new Event('input', { bubbles: true }));
    expect(edits).toHaveBeenCalledTimes(1);
    expect(new FormData(form).get('name')).toBe('Edited');
    form.reset();
    expect(elements.control.value).toBe('Original');
    expect(edits).toHaveBeenCalledTimes(1);
    binding.dispose();
    input.setValue('After row');
    expect(elements.control.value).toBe('After row');
  });

  it('retains checkbox checked indeterminate and native label/form behavior with its existing binder', () => {
    const elements = row();
    elements.control.type = 'checkbox';
    elements.control.defaultChecked = true;
    elements.control.name = 'enabled';
    elements.control.value = 'yes';
    elements.control.required = true;
    elements.control.indeterminate = true;
    const form = document.createElement('form');
    document.body.append(form);
    form.append(elements.root);
    const edits = vi.fn();
    const checkbox = bindNativeCheckbox(elements.control, edits);
    cleanups.push(() => checkbox.dispose());
    const binding = bind(elements);
    binding.update({ description: elements.description });
    expect(elements.control.checked).toBe(true);
    expect(elements.control.indeterminate).toBe(true);
    elements.label.click();
    expect(elements.control.checked).toBe(false);
    expect(edits).toHaveBeenCalledTimes(1);
    expect(new FormData(form).has('enabled')).toBe(false);
    form.reset();
    expect(new FormData(form).get('enabled')).toBe('yes');
    expect(edits).toHaveBeenCalledTimes(1);
    elements.control.disabled = true;
    elements.label.click();
    expect(edits).toHaveBeenCalledTimes(1);
    binding.dispose();
    expect(elements.control.disabled).toBe(true);
  });

  it('keeps instances independent and supports intentionally shared help targets', () => {
    const first = row(document, 'first');
    const second = row(document, 'second');
    const a = bind(first);
    const b = bind({ ...second, description: first.description });
    a.dispose();
    expect(second.control.getAttribute('aria-describedby')).toBe('first-help second-error');
    b.dispose();
    expect(second.control.hasAttribute('aria-describedby')).toBe(false);
  });
});
