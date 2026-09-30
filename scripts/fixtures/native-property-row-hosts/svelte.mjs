import { mount, unmount, flushSync, tick } from 'svelte';
import Component from 'virtual:native-property-row-svelte';
import { bindNativePropertyRow } from '/vendor/native-property-row.js';
import { startHost } from './common.mjs';

startHost('svelte', bindNativePropertyRow, async (target, tracker) => {
  const component = mount(Component, { target, props: { tracker } });
  flushSync();
  await tick();
  return {
    async update(next) {
      flushSync(() => component.updatePresentation(next));
      await tick();
      tracker.refreshAll();
    },
    async unmount() {
      await unmount(component);
    },
  };
});
