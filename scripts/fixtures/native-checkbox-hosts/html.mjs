/* global document */
import { fields, startHost } from './common.mjs';
import { bindNativeCheckbox } from '/vendor/native-checkbox.js';

startHost('html', bindNativeCheckbox, async (target, tracker) => {
  const form = document.createElement('form');
  const cleanup = [];
  for (const key of fields) {
    const label = document.createElement('label');
    label.htmlFor = key;
    label.textContent = `${key} checkbox`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = key;
    input.name = key;
    input.defaultChecked = true;
    if (key === 'primary') input.value = 'accepted';
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
    async update(key, property, value) {
      tracker.update(key, property, value);
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
