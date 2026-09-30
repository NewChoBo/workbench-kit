/* global document */
import { startHost } from './common.mjs';

startHost('html', async (target, model) => {
  const output = document.createElement('pre');
  output.dataset.state = '';
  const buttons = model.controls.map(([id, label, run]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = id;
    button.textContent = label;
    button.onclick = run;
    return button;
  });
  target.append(...buttons, output);
  const dispose = model.subscribe((snapshot) => {
    output.textContent = JSON.stringify(snapshot);
  });
  return {
    async unmount() {
      dispose();
      target.replaceChildren();
    },
  };
});
