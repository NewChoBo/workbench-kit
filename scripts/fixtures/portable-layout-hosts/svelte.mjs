import { mount, unmount, flushSync, tick } from 'svelte';
import Component from 'virtual:portable-layout-svelte';
import { startHost } from './common.mjs';

startHost('svelte', async (target, model) => {
  const component = mount(Component, { target, props: { model } });
  flushSync();
  await tick();
  return {
    async unmount() {
      await unmount(component);
    },
  };
});
