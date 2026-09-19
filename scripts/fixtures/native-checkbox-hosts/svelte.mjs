import { mount, unmount, flushSync, tick } from 'svelte';
import Component from 'virtual:native-checkbox-svelte';
import { startHost } from './common.mjs';
import { bindNativeCheckbox } from '/vendor/native-checkbox.js';

startHost('svelte', bindNativeCheckbox, async (target, tracker) => {
  const component = mount(Component, { target, props: { tracker } });
  flushSync();
  await tick();
  return {
    async update(key, property, value) {
      flushSync(() => component.request(key, property, value));
      await tick();
    },
    async rerender() {
      flushSync(() => component.rerender());
      await tick();
    },
    async unmount() {
      await unmount(component);
    },
  };
});
