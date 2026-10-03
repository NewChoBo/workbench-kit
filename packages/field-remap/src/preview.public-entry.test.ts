import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '@workbench-kit/field-remap';
import {
  createFieldRemapPreviewController,
  type FieldRemapPreviewCommand,
  type FieldRemapPreviewController,
} from '@workbench-kit/field-remap/preview';

describe('neutral public preview controller', () => {
  it('exports a working generic owner backed by the existing converter', async () => {
    const controller: FieldRemapPreviewController = createFieldRemapPreviewController();
    const states: string[] = [];
    const unsubscribe = controller.subscribe(() => states.push(controller.getSnapshot().status));
    const command: FieldRemapPreviewCommand = {
      kind: 'evaluate',
      revision: 'public-1',
      input: {
        sources: [{ id: 'in.title', path: 'title', label: 'Title' }],
        targets: [{ id: 'out.label', path: 'label', label: 'Label' }],
        edges: [
          {
            id: 'title',
            sourceFieldId: 'in.title',
            targetSlotId: 'out.label',
            transformIds: ['string:trim', 'string:upper'],
          },
        ],
        inputs: { source: { title: '  local sample  ' } },
        transforms: createBuiltinValueTransformRegistry(),
      },
    };
    controller.update(command);
    expect(controller.getSnapshot().status).toBe('loading');
    await expect.poll(() => controller.getSnapshot().status).toBe('ready');
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      result: {
        output: { label: 'LOCAL SAMPLE' },
        slots: [{ edgeId: 'title', value: 'LOCAL SAMPLE' }],
      },
    });
    expect(states).toEqual(['loading', 'ready']);
    unsubscribe();
    controller.dispose();
  });

  it('keeps hide and disposal available through the same public contract', () => {
    const controller = createFieldRemapPreviewController();
    controller.update({ kind: 'hidden' });
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', reason: 'hidden' });
    controller.dispose();
    controller.update({ kind: 'no-sample' });
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', reason: 'hidden' });
  });
});
