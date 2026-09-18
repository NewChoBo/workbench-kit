/* global document */
import { fields, startHost } from './common.mjs';
import { bindNativeTextInput } from '/vendor/native-text-input.js';

startHost('html', bindNativeTextInput, async (target, tracker) => {
  const form = document.createElement('form');
  const cleanup = [];
  for (const key of fields) {
    const label = document.createElement('label');
    label.htmlFor = key;
    label.textContent = `${key} value`;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = key;
    input.name = key;
    input.defaultValue = 'default';
    input.required = true;
    form.append(label, input);
  }
  const reset = document.createElement('button');
  reset.type = 'reset';
  reset.textContent = 'Reset form';
  form.append(reset);
  target.append(form);
  for (const key of fields) cleanup.push(tracker.attach(form.elements.namedItem(key), key));
  return {
    async update(key, value) {
      tracker.update(key, value);
    },
    async rerender() {
      form.dataset.appearance = form.dataset.appearance === 'alternate' ? 'normal' : 'alternate';
    },
    async unmount() {
      cleanup.forEach((dispose) => dispose());
      form.remove();
    },
  };
});
