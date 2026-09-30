import { createApp, h, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { startHost } from './common.mjs';

startHost('vue', async (target, model) => {
  const app = createApp({
    setup() {
      const snapshot = ref(model.snapshot());
      let dispose;
      onMounted(() => {
        dispose = model.subscribe((value) => {
          snapshot.value = value;
        });
      });
      onUnmounted(() => dispose());
      return () => [
        ...model.controls.map(([id, label, run]) =>
          h('button', { key: id, type: 'button', 'data-action': id, onClick: run }, label),
        ),
        h('pre', { 'data-state': '' }, JSON.stringify(snapshot.value)),
      ];
    },
  });
  app.mount(target);
  await nextTick();
  return {
    async unmount() {
      app.unmount();
      await nextTick();
    },
  };
});
