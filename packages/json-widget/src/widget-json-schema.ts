import type { WidgetJsonSchema, WidgetTypeDefinition } from '@workbench-kit/contracts';

type JsonSchemaObject = Record<string, unknown>;

const CORE_WIDGET_SCHEMA: JsonSchemaObject = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'WidgetDocumentSchema',
  $ref: '#/definitions/Widget',
  definitions: {
    Widget: {
      oneOf: [
        { $ref: '#/definitions/TextWidget' },
        { $ref: '#/definitions/RowWidget' },
        { $ref: '#/definitions/ColumnWidget' },
        { $ref: '#/definitions/GridWidget' },
      ],
    },
    TextWidget: {
      type: 'object',
      required: ['type', 'text'],
      properties: {
        type: { const: 'text' },
        id: { type: 'string' },
        text: { type: 'string' },
        color: { type: 'string' },
        background: { type: 'string' },
        fontSize: { type: 'number' },
      },
      additionalProperties: true,
    },
    RowWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'row' },
        id: { type: 'string' },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
      },
      additionalProperties: true,
    },
    ColumnWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'column' },
        id: { type: 'string' },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
      },
      additionalProperties: true,
    },
    GridWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'grid' },
        id: { type: 'string' },
        columns: { type: 'number', minimum: 1 },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
      },
      additionalProperties: true,
    },
  },
};

function customDefinitionName(type: string): string {
  return `CustomWidget_${type.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

function withTypeDiscriminator(type: string, schema: JsonSchemaObject): JsonSchemaObject {
  const properties = {
    ...(typeof schema.properties === 'object' && schema.properties !== null
      ? (schema.properties as JsonSchemaObject)
      : {}),
    type: { const: type },
  };
  const required = Array.isArray(schema.required)
    ? Array.from(new Set(['type', ...schema.required.filter((item) => typeof item === 'string')]))
    : ['type'];

  return {
    ...schema,
    type: schema.type ?? 'object',
    properties,
    required,
  };
}

export function createWidgetJsonSchema(
  customDefinitions: readonly WidgetTypeDefinition[] = [],
): WidgetJsonSchema {
  const customWithSchema = customDefinitions.filter((definition) => definition.schema);
  const customSchemaDefinitions = Object.fromEntries(
    customWithSchema.map((definition) => [
      customDefinitionName(definition.type),
      withTypeDiscriminator(definition.type, definition.schema ?? {}),
    ]),
  );

  const baseDefinitions = CORE_WIDGET_SCHEMA.definitions as Record<string, JsonSchemaObject>;
  const widgetDefinition = baseDefinitions.Widget ?? {};
  const widgetOneOf = Array.isArray(widgetDefinition.oneOf) ? [...widgetDefinition.oneOf] : [];

  return {
    ...CORE_WIDGET_SCHEMA,
    definitions: {
      ...baseDefinitions,
      Widget: {
        ...widgetDefinition,
        oneOf: [
          ...widgetOneOf,
          ...customWithSchema.map((definition) => ({
            $ref: `#/definitions/${customDefinitionName(definition.type)}`,
          })),
        ],
      },
      ...customSchemaDefinitions,
    },
  };
}

export const DEMO_WIDGET_JSON_SCHEMA = createWidgetJsonSchema();
