import { createApp, h, ref, shallowRef, onMounted, onUpdated, onUnmounted, nextTick } from 'vue';
import { bindNativePropertyRow } from '/vendor/native-property-row.js';
import { fields, startHost } from './common.mjs';

startHost('vue', bindNativePropertyRow, async (target, tracker) => {
  const presentation = shallowRef(tracker.presentation);
  const Field = {
    props: ['field', 'item'],
    setup(props) {
      const root = ref(null);
      let dispose;
      onMounted(() => {
        dispose = tracker.attach(props.field.id, root.value);
      });
      onUpdated(() => tracker.refresh(props.field.id));
      onUnmounted(() => dispose());
      return () =>
        h(
          'div',
          {
            ref: root,
            class: `ui-native-property-row${props.field.type === 'checkbox' ? ' ui-native-property-row--checkbox' : ''}`,
          },
          [
            h('label', { class: 'ui-native-property-row__label' }, props.field.label),
            h('div', { class: 'ui-native-property-row__control' }, [
              h('input', {
                type: props.field.type,
                id: props.field.id,
                name: props.field.id,
                'aria-describedby': 'external-help',
                'aria-invalid': 'grammar',
                ...(props.field.type === 'text'
                  ? { defaultValue: 'Workspace' }
                  : { defaultChecked: true, value: 'yes' }),
              }),
            ]),
            props.item.description
              ? h(
                  'p',
                  {
                    key: `help-${props.item.generation}`,
                    id: `${props.field.id}-help-${props.item.generation}`,
                    'data-description': '',
                    class: 'ui-native-property-row__description',
                  },
                  props.item.description,
                )
              : null,
            props.item.error
              ? h(
                  'p',
                  {
                    key: 'error',
                    id: `${props.field.id}-error`,
                    'data-error': '',
                    class: 'ui-native-property-row__error',
                  },
                  props.item.error,
                )
              : null,
          ],
        );
    },
  };
  const app = createApp({
    setup: () => () =>
      h(
        'form',
        fields.map((field) =>
          h(Field, { key: field.id, field, item: presentation.value[field.id] }),
        ),
      ),
  });
  app.mount(target);
  await nextTick();
  return {
    async update(next) {
      presentation.value = next;
      await nextTick();
    },
    async unmount() {
      app.unmount();
      await nextTick();
    },
  };
});
