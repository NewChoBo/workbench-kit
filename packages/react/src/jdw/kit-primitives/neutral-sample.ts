import type { JsonWidgetNode } from '@workbench-kit/jdw';

/** Renderable raw JDW sample; URLs, callbacks and target identities stay in the host. */
export const KIT_JDW_PRIMITIVES_SAMPLE: JsonWidgetNode = Object.freeze({
  type: 'column',
  args: Object.freeze({
    gap: 12,
    children: Object.freeze([
      Object.freeze({
        type: 'text',
        args: Object.freeze({ text: '${record.title}', fontSize: 18 }),
      }),
      Object.freeze({
        type: 'kit.media-slot.v1',
        args: Object.freeze({ resourceKey: 'cover', alt: '${record.title}', fit: 'contain' }),
      }),
      Object.freeze({
        type: 'row',
        args: Object.freeze({
          gap: 8,
          children: Object.freeze([
            Object.freeze({
              type: 'kit.button.v1',
              args: Object.freeze({ label: 'Open details', variant: 'primary', actionKey: 'open' }),
            }),
            Object.freeze({
              type: 'kit.icon-button.v1',
              args: Object.freeze({ label: 'More actions', icon: 'more', actionKey: 'more' }),
            }),
          ]),
        }),
      }),
      Object.freeze({
        type: 'grid',
        args: Object.freeze({
          columns: 1,
          children: Object.freeze([
            Object.freeze({
              type: 'kit.badge.v1',
              args: Object.freeze({ text: '${record.status}', variant: 'muted' }),
            }),
          ]),
        }),
      }),
    ]),
  }),
});
