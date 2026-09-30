/* global document */
import { bindNativePropertyRow } from '/vendor/native-property-row.js';
import { fields, startHost } from './common.mjs';

startHost('html', bindNativePropertyRow, async (target, tracker) => {
  const form = document.createElement('form');
  const roots = new Map();
  for (const field of fields) {
    const root = document.createElement('div');
    root.className = `ui-native-property-row${field.type === 'checkbox' ? ' ui-native-property-row--checkbox' : ''}`;
    const label = document.createElement('label');
    label.className = 'ui-native-property-row__label';
    label.textContent = field.label;
    const slot = document.createElement('div');
    slot.className = 'ui-native-property-row__control';
    const control = document.createElement('input');
    control.type = field.type;
    control.id = field.id;
    control.name = field.id;
    control.setAttribute('aria-describedby', 'external-help');
    control.setAttribute('aria-invalid', 'grammar');
    if (field.type === 'text') control.defaultValue = 'Workspace';
    else {
      control.defaultChecked = true;
      control.value = 'yes';
    }
    slot.append(control);
    root.append(label, slot);
    form.append(root);
    roots.set(field.id, root);
  }
  target.append(form);
  const renderMetadata = (presentation) => {
    for (const { id } of fields) {
      const root = roots.get(id);
      const item = presentation[id];
      for (const kind of ['description', 'error']) {
        const old = root.querySelector(`[data-${kind}]`);
        const value = item[kind];
        const nodeId = kind === 'description' ? `${id}-help-${item.generation}` : `${id}-error`;
        if (!value) {
          old?.remove();
          continue;
        }
        let node = old;
        if (!node || node.id !== nodeId) {
          node = document.createElement('p');
          node.id = nodeId;
          node.dataset[kind] = '';
          node.className = `ui-native-property-row__${kind}`;
          if (old) old.replaceWith(node);
          else root.append(node);
        }
        node.textContent = value;
      }
    }
  };
  renderMetadata(tracker.presentation);
  const disposals = fields.map(({ id }) => tracker.attach(id, roots.get(id)));
  return {
    async update(presentation) {
      renderMetadata(presentation);
      tracker.refreshAll();
    },
    async unmount() {
      disposals.forEach((dispose) => dispose());
      form.remove();
    },
  };
});
