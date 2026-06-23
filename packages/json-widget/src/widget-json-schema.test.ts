import { describe, expect, it } from 'vitest';

import {
  createJdwDocumentJsonSchema,
  createWidgetJsonSchema,
  DEMO_WIDGET_JSON_SCHEMA,
} from './widget-json-schema.js';

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

  it('allows JDW documents to declare their schema URI', () => {
    const schema = createJdwDocumentJsonSchema() as {
      definitions?: {
        CustomJdwNode?: { properties?: Record<string, unknown> };
      };
    };

    expect(schema.definitions?.CustomJdwNode?.properties?.$schema).toEqual({
      type: 'string',
      minLength: 1,
    });
  });

  it('describes recursive JDW node definitions for static authoring', () => {
    const schema = createJdwDocumentJsonSchema() as {
      definitions?: {
        JdwNode?: { oneOf?: unknown[] };
        JdwDynamicValue?: unknown;
        TextJdwNode?: {
          properties?: { args?: { properties?: { fontSize?: unknown } } };
        };
        FlexibleJdwNode?: {
          properties?: { args?: { properties?: { fit?: unknown } } };
        };
        StackJdwNode?: unknown;
        ImageJdwNode?: unknown;
        ButtonJdwNode?: unknown;
      };
    };

    expect(schema.definitions?.JdwNode?.oneOf?.length).toBeGreaterThanOrEqual(16);
    expect(schema.definitions?.JdwDynamicValue).toMatchObject({
      type: 'string',
      pattern: '^\\$\\{[A-Za-z0-9_.-]+\\}$',
    });
    expect(schema.definitions?.StackJdwNode).toBeDefined();
    expect(schema.definitions?.ImageJdwNode).toBeDefined();
    expect(schema.definitions?.ButtonJdwNode).toBeDefined();
    expect(schema.definitions?.TextJdwNode?.properties?.args?.properties?.fontSize).toEqual({
      oneOf: [{ type: 'number', minimum: 1 }, { $ref: '#/definitions/JdwDynamicValue' }],
    });
    expect(schema.definitions?.FlexibleJdwNode?.properties?.args?.properties?.fit).toEqual({
      oneOf: [
        { type: 'string', enum: ['tight', 'loose'] },
        { $ref: '#/definitions/JdwDynamicValue' },
      ],
    });
  });
});
