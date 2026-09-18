import { createElement as h, Fragment, StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { fields, pause, startHost, waitFor } from './common.mjs';
import { bindNativeTextInput } from '/vendor/native-text-input.js';

function Field({ field, tracker, request }) {
  const element = useRef(null);
  useEffect(() => tracker.attach(element.current, field), [field, tracker]);
  useEffect(() => {
    if (request) tracker.update(field, request.value);
  }, [field, request, tracker]);
  return h(
    Fragment,
    null,
    h('label', { htmlFor: field }, `${field} value`),
    h('input', {
      ref: element,
      id: field,
      name: field,
      type: 'text',
      defaultValue: 'default',
      required: true,
    }),
  );
}

startHost('react', bindNativeTextInput, async (target, tracker) => {
  const root = createRoot(target);
  let requests = {};
  let revision = 0;
  const render = () =>
    root.render(
      h(
        StrictMode,
        null,
        h(
          'form',
          { 'data-appearance': revision % 2 ? 'alternate' : 'normal' },
          ...fields.map((field) =>
            h(Field, { key: field, field, tracker, request: requests[field] }),
          ),
          h('button', { type: 'reset' }, 'Reset form'),
        ),
      ),
    );
  render();
  await waitFor(() => tracker.activeCount === 2, 'React effects');
  return {
    async update(key, value) {
      requests = { ...requests, [key]: { value } };
      render();
      await pause();
    },
    async rerender() {
      revision += 1;
      render();
      await pause();
    },
    async unmount() {
      root.unmount();
    },
  };
});
