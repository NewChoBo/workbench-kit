import { createElement as h, Fragment, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { startHost, waitFor } from './common.mjs';

function Layout({ model }) {
  const [snapshot, setSnapshot] = useState(model.snapshot);
  useEffect(() => model.subscribe(setSnapshot), [model]);
  return h(
    Fragment,
    null,
    ...model.controls.map(([id, label, run]) =>
      h('button', { key: id, type: 'button', 'data-action': id, onClick: run }, label),
    ),
    h('pre', { 'data-state': '' }, JSON.stringify(snapshot)),
  );
}
startHost('react', async (target, model) => {
  const root = createRoot(target);
  root.render(h(StrictMode, null, h(Layout, { model })));
  await waitFor(() => model.active === 1, 'React effects');
  return {
    async unmount() {
      root.unmount();
    },
  };
});
