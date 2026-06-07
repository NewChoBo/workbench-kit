import type { WidgetJsonSchema, WidgetTypeDefinition } from '@workbench-kit/contracts';

type JsonSchemaObject = Record<string, unknown>;

const PLAYGROUND_WIDGET_TYPES = [
  'text',
  'box',
  'grid',
  'stack',
  'row',
  'column',
  'button',
  'input',
  'list-view',
  'tile',
] as const;

function placementProperties(): JsonSchemaObject {
  return {
    col: { type: 'number' },
    row: { type: 'number' },
    colSpan: { type: 'number' },
    rowSpan: { type: 'number' },
    flex: { type: 'number' },
    left: { type: 'number' },
    top: { type: 'number' },
    right: { type: 'number' },
    bottom: { type: 'number' },
  };
}

const BASE_PLAYGROUND_WIDGET_SCHEMA: JsonSchemaObject = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlaygroundWidgetSchema',
  $ref: '#/definitions/Widget',
  definitions: {
    Widget: {
      oneOf: [
        { $ref: '#/definitions/TextWidget' },
        { $ref: '#/definitions/BoxWidget' },
        { $ref: '#/definitions/GridWidget' },
        { $ref: '#/definitions/StackWidget' },
        { $ref: '#/definitions/RowWidget' },
        { $ref: '#/definitions/ColumnWidget' },
        { $ref: '#/definitions/ButtonWidget' },
        { $ref: '#/definitions/InputWidget' },
        { $ref: '#/definitions/ListViewWidget' },
        { $ref: '#/definitions/TileWidget' },
      ],
    },
    TextWidget: {
      type: 'object',
      required: ['type', 'text'],
      properties: {
        type: { const: 'text' },
        text: { type: 'string' },
        color: { type: 'string' },
        background: { type: 'string' },
        fontSize: { type: 'number' },
        fontWeight: { enum: ['normal', 'bold'] },
        textAlign: { enum: ['left', 'center', 'right'] },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    BoxWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'box' },
        background: { type: 'string' },
        borderRadius: { type: 'number' },
        padding: { type: 'number' },
        child: { $ref: '#/definitions/Widget' },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    GridWidget: {
      type: 'object',
      required: ['type', 'columns'],
      properties: {
        type: { const: 'grid' },
        columns: { type: 'number', minimum: 1 },
        rows: { type: 'number', minimum: 1 },
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
    StackWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'stack' },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    RowWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'row' },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    ColumnWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'column' },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    ButtonWidget: {
      type: 'object',
      required: ['type', 'label'],
      properties: {
        type: { const: 'button' },
        label: { type: 'string' },
        variant: { enum: ['primary', 'secondary', 'ghost', 'danger'] },
        disabled: { type: 'boolean' },
        background: { type: 'string' },
        color: { type: 'string' },
        borderRadius: { type: 'number' },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    InputWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'input' },
        label: { type: 'string' },
        placeholder: { type: 'string' },
        value: { type: 'string' },
        background: { type: 'string' },
        color: { type: 'string' },
        borderRadius: { type: 'number' },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    ListViewWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'list-view' },
        direction: { enum: ['vertical', 'horizontal'] },
        itemExtent: { type: 'number', minimum: 1 },
        gap: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
        ...placementProperties(),
      },
      additionalProperties: true,
    },
    TileWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'tile' },
        label: { type: 'string' },
        layers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { enum: ['color', 'text', 'image', 'badge'] },
              color: { type: 'string' },
              text: { type: 'string' },
              fontSize: { type: 'number' },
            },
            additionalProperties: true,
          },
        },
        ...placementProperties(),
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

export function createPlaygroundWidgetJsonSchema(
  customDefinitions: readonly WidgetTypeDefinition[] = [],
): WidgetJsonSchema {
  const customWithSchema = customDefinitions.filter((definition) => definition.schema);
  const customTypeNames = customWithSchema.map((definition) => definition.type);
  const customSchemaDefinitions = Object.fromEntries(
    customWithSchema.map((definition) => [
      customDefinitionName(definition.type),
      withTypeDiscriminator(definition.type, definition.schema ?? {}),
    ]),
  );

  const baseDefinitions = BASE_PLAYGROUND_WIDGET_SCHEMA.definitions as Record<
    string,
    JsonSchemaObject
  >;
  const widgetDefinition = baseDefinitions.Widget ?? {};
  const widgetOneOf = Array.isArray(widgetDefinition.oneOf) ? [...widgetDefinition.oneOf] : [];

  return {
    ...BASE_PLAYGROUND_WIDGET_SCHEMA,
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
    $comment: `Playground types: ${[...PLAYGROUND_WIDGET_TYPES, ...customTypeNames].join(', ')}`,
  };
}

export const PLAYGROUND_WIDGET_JSON_SCHEMA = createPlaygroundWidgetJsonSchema();
