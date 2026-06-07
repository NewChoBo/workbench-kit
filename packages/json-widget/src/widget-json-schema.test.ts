import { describe, expect, it } from 'vitest';

import { createPlaygroundWidgetJsonSchema, PLAYGROUND_WIDGET_JSON_SCHEMA } from './widget-json-schema.js';

describe('createPlaygroundWidgetJsonSchema', () => {
  it('includes built-in playground widget definitions', () => {
    const schema = PLAYGROUND_WIDGET_JSON_SCHEMA;
    const definitions = schema.definitions as Record<string, unknown>;
    expect(definitions).toBeDefined();
    expect(definitions.TextWidget).toBeDefined();
    expect(definitions.GridWidget).toBeDefined();
  });

  it('merges custom widget schemas into oneOf', () => {
    const schema = createPlaygroundWidgetJsonSchema([
      {
        type: 'custom:clock',
        build: () => null,
        schema: {
          type: 'object',
          properties: {
            timezone: { type: 'string' },
          },
          required: ['timezone'],
        },
      },
    ]);

    const definitions = schema.definitions as Record<string, { oneOf?: unknown[] }>;
    expect(definitions.Widget.oneOf?.length).toBeGreaterThan(9);
    expect(definitions.CustomWidget_custom_clock).toBeDefined();
  });
});
