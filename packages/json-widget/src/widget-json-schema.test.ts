import { describe, expect, it } from 'vitest';

import { createWidgetJsonSchema, DEMO_WIDGET_JSON_SCHEMA } from './widget-json-schema.js';

describe('createWidgetJsonSchema', () => {
  it('includes core widget definitions', () => {
    const schema = createWidgetJsonSchema() as {
      definitions?: { Widget?: { oneOf?: unknown[] } };
    };

    expect(schema.definitions?.Widget?.oneOf?.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_WIDGET_JSON_SCHEMA).toBeDefined();
  });

  it('merges custom registry schema definitions', () => {
    const schema = createWidgetJsonSchema([
      {
        type: 'demo:card',
        build: 'card',
        schema: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
          },
        },
      },
    ]) as { definitions?: Record<string, unknown> };

    expect(schema.definitions?.CustomWidget_demo_card).toBeDefined();
  });
});
