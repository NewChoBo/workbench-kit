import { createApp, h, reactive, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fields, startHost } from './common.mjs';
import { bindNativeTextInput } from '/vendor/native-text-input.js';

startHost('vue', bindNativeTextInput, async (target, tracker) => {
  const model = reactive({ requests: {}, revision: 0 });
  const Field = {
    props: ['field'],
    setup(props) {
      const element = ref(null);
      let dispose;
      onMounted(() => {
        dispose = tracker.attach(element.value, props.field);
      });
      onUnmounted(() => dispose());
      watch(
        () => model.requests[props.field],
        (request) => {
          if (request) tracker.update(props.field, request.value);
        },
        { flush: 'post' },
      );
      return () => [
        h('label', { for: props.field }, `${props.field} value`),
        h('input', {
          ref: element,
          id: props.field,
          name: props.field,
          type: 'text',
          defaultValue: 'default',
          required: true,
        }),
      ];
    },
  };
  const app = createApp({
    setup() {
      return () =>
        h('form', { 'data-appearance': model.revision % 2 ? 'alternate' : 'normal' }, [
          ...fields.map((field) => h(Field, { key: field, field })),
          h('button', { type: 'reset' }, 'Reset form'),
        ]);
    },
  });
  app.mount(target);
  return {
    async update(key, value) {
      model.requests[key] = { value };
      await nextTick();
    },
    async rerender() {
      model.revision += 1;
      await nextTick();
    },
    async unmount() {
      app.unmount();
      await nextTick();
    },
  };
});
