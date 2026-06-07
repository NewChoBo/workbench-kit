import { describe, expect, it } from 'vitest';

import {
  WidgetRegistry,
  createWidgetRegistry,
  type WidgetDefinition,
} from './widget-registry.js';
import type { WidgetTypeShape } from '@workbench-kit/contracts';

interface ClockWidget extends WidgetTypeShape {
  type: 'custom:clock';
  label: string;
}

describe('WidgetRegistry', () => {
  it('stores framework-neutral build handlers by widget type', () => {
    const registry = new WidgetRegistry<(label: string) => string>();

    registry.bind({
      type: 'text',
      build: (label) => label.toUpperCase(),
      displayName: 'Text',
      schema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      inspector: [
        {
          title: 'Text',
          fields: [{ kind: 'text', prop: 'text', label: 'Content' }],
        },
      ],
    });

    expect(registry.has('text')).toBe(true);
    expect(registry.types()).toEqual(['text']);
    expect(registry.get('text')?.('core')).toBe('CORE');
    expect(registry.definition('text')?.displayName).toBe('Text');
    expect(registry.definition('text')?.schema).toBeDefined();
    expect(registry.definition('text')?.inspector?.[0]?.fields[0]?.prop).toBe('text');
  });

  it('creates independent registry instances', () => {
    const first = createWidgetRegistry<string>([{ type: 'box', build: 'box-build' }]);
    const second = createWidgetRegistry<string>();

    second.bind({ type: 'text', build: 'text-build' });

    expect(first.get('box')).toBe('box-build');
    expect(first.get('text')).toBeUndefined();
    expect(second.get('text')).toBe('text-build');
    expect(first.definitions()).toHaveLength(1);
    expect(second.definitions()).toHaveLength(1);
  });

  it('accepts typed custom widget definitions', () => {
    const registry = new WidgetRegistry<string, ClockWidget>();
    const entry: WidgetDefinition<ClockWidget, string> = {
      type: 'custom:clock',
      build: 'clock-build',
    };

    registry.bind(entry);

    expect(registry.get('custom:clock')).toBe('clock-build');
  });
});
