import { createElement as h, StrictMode, useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { bindNativePropertyRow } from '/vendor/native-property-row.js';
import { fields, startHost, waitFor } from './common.mjs';

function Field({ field, item, tracker }) {
  const root = useRef(null);
  useLayoutEffect(() => tracker.attach(field.id, root.current), [field, tracker]);
  useLayoutEffect(() => tracker.refresh(field.id), [field, item, tracker]);
  return h(
    'div',
    {
      ref: root,
      className: `ui-native-property-row${field.type === 'checkbox' ? ' ui-native-property-row--checkbox' : ''}`,
    },
    h('label', { className: 'ui-native-property-row__label' }, field.label),
    h(
      'div',
      { className: 'ui-native-property-row__control' },
      h('input', {
        type: field.type,
        id: field.id,
        name: field.id,
        'aria-describedby': 'external-help',
        'aria-invalid': 'grammar',
        ...(field.type === 'text'
          ? { defaultValue: 'Workspace' }
          : { defaultChecked: true, value: 'yes' }),
      }),
    ),
    item.description
      ? h(
          'p',
          {
            key: `help-${item.generation}`,
            id: `${field.id}-help-${item.generation}`,
            'data-description': '',
            className: 'ui-native-property-row__description',
          },
          item.description,
        )
      : null,
    item.error
      ? h(
          'p',
          {
            key: 'error',
            id: `${field.id}-error`,
            'data-error': '',
            className: 'ui-native-property-row__error',
          },
          item.error,
        )
      : null,
  );
}
startHost('react', bindNativePropertyRow, async (target, tracker) => {
  const root = createRoot(target);
  let revision = 0;
  const render = (presentation) =>
    root.render(
      h(
        StrictMode,
        null,
        h(
          'form',
          { 'data-revision': revision },
          ...fields.map((field) =>
            h(Field, { key: field.id, field, item: presentation[field.id], tracker }),
          ),
        ),
      ),
    );
  render(tracker.presentation);
  await waitFor(() => tracker.activeCount === 2, 'React effects');
  return {
    async update(presentation) {
      revision += 1;
      render(presentation);
      await waitFor(
        () => target.querySelector('form')?.dataset.revision === String(revision),
        'React presentation commit',
      );
    },
    async unmount() {
      root.unmount();
    },
  };
});
