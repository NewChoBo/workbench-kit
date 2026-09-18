import { mount, unmount, flushSync, tick } from 'svelte';
import Component from 'virtual:native-input-svelte';
import { startHost } from './common.mjs';
import { bindNativeTextInput } from '/vendor/native-text-input.js';

startHost('svelte', bindNativeTextInput, async (target, tracker) => {
  const component = mount(Component, { target, props: { tracker } });
  flushSync();
  await tick();
  return {
    async update(key, value) {
      flushSync(() => component.request(key, value));
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
