import { createApp, h, reactive, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fields, startHost } from './common.mjs';
import { bindNativeCheckbox } from '/vendor/native-checkbox.js';

startHost('vue', bindNativeCheckbox, async (target, tracker) => {
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
          if (request) tracker.update(props.field, request.property, request.value);
        },
        { flush: 'post' },
      );
      return () => [
        h('label', { for: props.field }, `${props.field} checkbox`),
        h('input', {
          ref: element,
          id: props.field,
          name: props.field,
          type: 'checkbox',
          defaultChecked: true,
          ...(props.field === 'primary' ? { value: 'accepted' } : {}),
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
    async update(key, property, value) {
      model.requests[key] = { property, value };
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
