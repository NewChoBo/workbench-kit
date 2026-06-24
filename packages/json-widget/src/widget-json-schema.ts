import type { WidgetJsonSchema, WidgetTypeDefinition } from '@workbench-kit/contracts';

import { WORKBENCH_JDW_KNOWN_TYPES } from './jdw-profile.js';

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
        { $ref: '#/definitions/StackWidget' },
        { $ref: '#/definitions/BoxWidget' },
        { $ref: '#/definitions/ContainerWidget' },
        { $ref: '#/definitions/PaddingWidget' },
        { $ref: '#/definitions/AlignWidget' },
        { $ref: '#/definitions/CenterWidget' },
        { $ref: '#/definitions/SizedBoxWidget' },
        { $ref: '#/definitions/ImageWidget' },
        { $ref: '#/definitions/IconWidget' },
        { $ref: '#/definitions/ButtonWidget' },
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
    StackWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'stack' },
        id: { type: 'string' },
        background: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/definitions/Widget' },
        },
      },
      additionalProperties: true,
    },
    BoxWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'box' },
        id: { type: 'string' },
        width: { type: 'number', minimum: 0 },
        height: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    ContainerWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'container' },
        id: { type: 'string' },
        width: { type: 'number', minimum: 0 },
        height: { type: 'number', minimum: 0 },
        padding: { type: 'number', minimum: 0 },
        background: { type: 'string' },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    PaddingWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'padding' },
        id: { type: 'string' },
        padding: { type: 'number', minimum: 0 },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    AlignWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'align' },
        id: { type: 'string' },
        alignment: { type: 'string' },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    CenterWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'center' },
        id: { type: 'string' },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    SizedBoxWidget: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { const: 'sized_box' },
        id: { type: 'string' },
        width: { type: 'number', minimum: 0 },
        height: { type: 'number', minimum: 0 },
        child: { $ref: '#/definitions/Widget' },
      },
      additionalProperties: true,
    },
    ImageWidget: {
      type: 'object',
      required: ['type', 'src'],
      properties: {
        type: { const: 'image' },
        id: { type: 'string' },
        src: { type: 'string', minLength: 1 },
        alt: { type: 'string' },
        fit: { type: 'string' },
        width: { type: 'number', minimum: 0 },
        height: { type: 'number', minimum: 0 },
      },
      additionalProperties: true,
    },
    IconWidget: {
      type: 'object',
      required: ['type', 'name'],
      properties: {
        type: { const: 'icon' },
        id: { type: 'string' },
        name: { type: 'string', minLength: 1 },
        color: { type: 'string' },
        size: { type: 'number', minimum: 1 },
      },
      additionalProperties: true,
    },
    ButtonWidget: {
      type: 'object',
      required: ['type', 'label'],
      properties: {
        type: { const: 'button' },
        id: { type: 'string' },
        label: { type: 'string', minLength: 1 },
        variant: { type: 'string' },
        color: { type: 'string' },
        background: { type: 'string' },
        disabled: { type: 'boolean' },
      },
      additionalProperties: true,
    },
  },
};

const JDW_NODE_DEFINITION_NAMES = [
  'TextJdwNode',
  'RowJdwNode',
  'ColumnJdwNode',
  'ExpandedJdwNode',
  'FlexibleJdwNode',
  'StackJdwNode',
  'ContainerJdwNode',
  'PaddingJdwNode',
  'AlignJdwNode',
  'CenterJdwNode',
  'SizedBoxJdwNode',
  'ImageJdwNode',
  'IconJdwNode',
  'GridJdwNode',
  'BoxJdwNode',
  'ButtonJdwNode',
] as const;

const JDW_DYNAMIC_VALUE_PATTERN = '^\\$\\{[A-Za-z0-9_.-]+\\}$';
const JDW_MAIN_AXIS_ALIGNMENT_VALUES = [
  'start',
  'center',
  'end',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const;
const JDW_CROSS_AXIS_ALIGNMENT_VALUES = ['stretch', 'start', 'center', 'end'] as const;
const JDW_FLEX_FIT_VALUES = ['tight', 'loose'] as const;
const JDW_LINEAR_PLACEMENT_PROPERTY_NAMES = [
  'width',
  'height',
  'flex',
  'flexFit',
  'align',
] as const;
const JDW_GRID_PLACEMENT_PROPERTY_NAMES = ['col', 'row', 'colSpan', 'rowSpan'] as const;
const JDW_STACK_PLACEMENT_PROPERTY_NAMES = ['left', 'top', 'right', 'bottom'] as const;

const JDW_COMMON_NODE_PROPERTIES = {
  $schema: { type: 'string', minLength: 1 },
  id: { type: 'string', minLength: 1 },
  listen: { type: 'array', items: { type: 'string' } },
} satisfies JsonSchemaObject;

function jdwDefinitionRef(definitionName: string): JsonSchemaObject {
  return { $ref: `#/definitions/${definitionName}` };
}

function jdwNodeRef(): JsonSchemaObject {
  return jdwDefinitionRef('JdwNode');
}

function jdwChildrenProperty(itemDefinitionName = 'JdwNode'): JsonSchemaObject {
  return {
    type: 'array',
    items: jdwDefinitionRef(itemDefinitionName),
  };
}

function jdwDynamicValueRef(): JsonSchemaObject {
  return { $ref: '#/definitions/JdwDynamicValue' };
}

function withJdwDynamicValue(schema: JsonSchemaObject): JsonSchemaObject {
  return {
    oneOf: [schema, jdwDynamicValueRef()],
  };
}

function jdwNumberProperty(minimum: number): JsonSchemaObject {
  return withJdwDynamicValue({ type: 'number', minimum });
}

function jdwUnboundedNumberProperty(): JsonSchemaObject {
  return withJdwDynamicValue({ type: 'number' });
}

function jdwBooleanProperty(): JsonSchemaObject {
  return withJdwDynamicValue({ type: 'boolean' });
}

function jdwStringEnumProperty(values: readonly string[]): JsonSchemaObject {
  return withJdwDynamicValue({ type: 'string', enum: [...values] });
}

function jdwArgsDefinition(
  properties: JsonSchemaObject,
  required: readonly string[] = [],
): JsonSchemaObject {
  return {
    type: 'object',
    ...(required.length > 0 ? { required: [...required] } : {}),
    properties,
    additionalProperties: true,
  };
}

function jdwPlacementArgsProperties(): JsonSchemaObject {
  return {
    width: jdwNumberProperty(0),
    height: jdwNumberProperty(0),
    flex: jdwNumberProperty(0),
    flexFit: jdwStringEnumProperty(JDW_FLEX_FIT_VALUES),
    align: jdwStringEnumProperty(JDW_CROSS_AXIS_ALIGNMENT_VALUES),
    col: jdwNumberProperty(0),
    row: jdwNumberProperty(0),
    colSpan: jdwNumberProperty(1),
    rowSpan: jdwNumberProperty(1),
    left: jdwUnboundedNumberProperty(),
    top: jdwUnboundedNumberProperty(),
    right: jdwUnboundedNumberProperty(),
    bottom: jdwUnboundedNumberProperty(),
  };
}

function pickJdwPlacementArgsProperties(propertyNames: readonly string[]): JsonSchemaObject {
  const properties = jdwPlacementArgsProperties();
  return Object.fromEntries(
    propertyNames.flatMap((propertyName) => {
      const property = properties[propertyName];
      return property ? [[propertyName, property]] : [];
    }),
  );
}

function jdwParentScopedPlacementDefinition(
  title: string,
  description: string,
  propertyNames: readonly string[],
): JsonSchemaObject {
  return {
    title,
    description,
    type: 'object',
    properties: pickJdwPlacementArgsProperties(propertyNames),
  };
}

function jdwParentScopedChildNodeDefinition(
  title: string,
  description: string,
  placementDefinitionName: string,
): JsonSchemaObject {
  return {
    title,
    description,
    allOf: [
      jdwNodeRef(),
      {
        type: 'object',
        properties: {
          args: {
            allOf: [jdwDefinitionRef(placementDefinitionName)],
          },
        },
      },
    ],
  };
}

function jdwTypedNodeDefinition(
  type: string,
  title: string,
  args: JsonSchemaObject,
): JsonSchemaObject {
  return {
    title,
    type: 'object',
    required: ['type', 'args'],
    properties: {
      type: { const: type },
      ...JDW_COMMON_NODE_PROPERTIES,
      args,
    },
    additionalProperties: false,
  };
}

function createJdwNodeDefinitions(): Record<string, JsonSchemaObject> {
  return {
    JdwDynamicValue: {
      title: 'JdwDynamicValue',
      description: 'Exact ${path} expression resolved from explicit render or preview values.',
      type: 'string',
      pattern: JDW_DYNAMIC_VALUE_PATTERN,
    },
    JdwPlacementArgs: {
      title: 'JdwPlacementArgs',
      description: 'Parent-scoped placement hints used by row/column, grid, and stack containers.',
      type: 'object',
      properties: jdwPlacementArgsProperties(),
    },
    JdwLinearChildPlacementArgs: jdwParentScopedPlacementDefinition(
      'JdwLinearChildPlacementArgs',
      'Placement hints available for direct row/column children.',
      JDW_LINEAR_PLACEMENT_PROPERTY_NAMES,
    ),
    JdwGridChildPlacementArgs: jdwParentScopedPlacementDefinition(
      'JdwGridChildPlacementArgs',
      'Placement hints available for direct grid children.',
      JDW_GRID_PLACEMENT_PROPERTY_NAMES,
    ),
    JdwStackChildPlacementArgs: jdwParentScopedPlacementDefinition(
      'JdwStackChildPlacementArgs',
      'Placement hints available for direct stack children.',
      JDW_STACK_PLACEMENT_PROPERTY_NAMES,
    ),
    JdwLinearChildNode: jdwParentScopedChildNodeDefinition(
      'JdwLinearChildNode',
      'JDW node when authored as a direct row/column child.',
      'JdwLinearChildPlacementArgs',
    ),
    JdwGridChildNode: jdwParentScopedChildNodeDefinition(
      'JdwGridChildNode',
      'JDW node when authored as a direct grid child.',
      'JdwGridChildPlacementArgs',
    ),
    JdwStackChildNode: jdwParentScopedChildNodeDefinition(
      'JdwStackChildNode',
      'JDW node when authored as a direct stack child.',
      'JdwStackChildPlacementArgs',
    ),
    JdwNode: {
      oneOf: [
        ...JDW_NODE_DEFINITION_NAMES.map((name) => ({ $ref: `#/definitions/${name}` })),
        { $ref: '#/definitions/CustomJdwNode' },
      ],
    },
    CustomJdwNode: {
      title: 'CustomJdwNode',
      type: 'object',
      required: ['type', 'args'],
      properties: {
        type: {
          type: 'string',
          minLength: 1,
          not: { enum: [...WORKBENCH_JDW_KNOWN_TYPES] },
        },
        ...JDW_COMMON_NODE_PROPERTIES,
        args: { type: 'object' },
      },
      additionalProperties: false,
    },
    TextJdwNode: jdwTypedNodeDefinition(
      'text',
      'TextJdwNode',
      jdwArgsDefinition(
        {
          text: { type: 'string' },
          color: { type: 'string' },
          background: { type: 'string' },
          fontSize: jdwNumberProperty(1),
        },
        ['text'],
      ),
    ),
    RowJdwNode: jdwTypedNodeDefinition(
      'row',
      'RowJdwNode',
      jdwArgsDefinition({
        gap: jdwNumberProperty(0),
        padding: jdwNumberProperty(0),
        background: { type: 'string' },
        mainAxisAlignment: jdwStringEnumProperty(JDW_MAIN_AXIS_ALIGNMENT_VALUES),
        crossAxisAlignment: jdwStringEnumProperty(JDW_CROSS_AXIS_ALIGNMENT_VALUES),
        children: jdwChildrenProperty('JdwLinearChildNode'),
      }),
    ),
    ColumnJdwNode: jdwTypedNodeDefinition(
      'column',
      'ColumnJdwNode',
      jdwArgsDefinition({
        gap: jdwNumberProperty(0),
        padding: jdwNumberProperty(0),
        background: { type: 'string' },
        mainAxisAlignment: jdwStringEnumProperty(JDW_MAIN_AXIS_ALIGNMENT_VALUES),
        crossAxisAlignment: jdwStringEnumProperty(JDW_CROSS_AXIS_ALIGNMENT_VALUES),
        children: jdwChildrenProperty('JdwLinearChildNode'),
      }),
    ),
    ExpandedJdwNode: jdwTypedNodeDefinition(
      'expanded',
      'ExpandedJdwNode',
      jdwArgsDefinition(
        {
          flex: jdwNumberProperty(0),
          child: jdwNodeRef(),
        },
        ['child'],
      ),
    ),
    FlexibleJdwNode: jdwTypedNodeDefinition(
      'flexible',
      'FlexibleJdwNode',
      jdwArgsDefinition(
        {
          flex: jdwNumberProperty(0),
          fit: jdwStringEnumProperty(JDW_FLEX_FIT_VALUES),
          child: jdwNodeRef(),
        },
        ['child'],
      ),
    ),
    StackJdwNode: jdwTypedNodeDefinition(
      'stack',
      'StackJdwNode',
      jdwArgsDefinition({
        background: { type: 'string' },
        children: jdwChildrenProperty('JdwStackChildNode'),
      }),
    ),
    ContainerJdwNode: jdwTypedNodeDefinition(
      'container',
      'ContainerJdwNode',
      jdwArgsDefinition({
        width: jdwNumberProperty(0),
        height: jdwNumberProperty(0),
        padding: jdwNumberProperty(0),
        background: { type: 'string' },
        child: jdwNodeRef(),
      }),
    ),
    PaddingJdwNode: jdwTypedNodeDefinition(
      'padding',
      'PaddingJdwNode',
      jdwArgsDefinition({
        padding: jdwNumberProperty(0),
        child: jdwNodeRef(),
      }),
    ),
    AlignJdwNode: jdwTypedNodeDefinition(
      'align',
      'AlignJdwNode',
      jdwArgsDefinition({
        alignment: { type: 'string' },
        child: jdwNodeRef(),
      }),
    ),
    CenterJdwNode: jdwTypedNodeDefinition(
      'center',
      'CenterJdwNode',
      jdwArgsDefinition({
        child: jdwNodeRef(),
      }),
    ),
    SizedBoxJdwNode: jdwTypedNodeDefinition(
      'sized_box',
      'SizedBoxJdwNode',
      jdwArgsDefinition({
        width: jdwNumberProperty(0),
        height: jdwNumberProperty(0),
        child: jdwNodeRef(),
      }),
    ),
    ImageJdwNode: jdwTypedNodeDefinition(
      'image',
      'ImageJdwNode',
      jdwArgsDefinition(
        {
          src: { type: 'string', minLength: 1 },
          alt: { type: 'string' },
          fit: { type: 'string' },
          width: jdwNumberProperty(0),
          height: jdwNumberProperty(0),
        },
        ['src'],
      ),
    ),
    IconJdwNode: jdwTypedNodeDefinition(
      'icon',
      'IconJdwNode',
      jdwArgsDefinition(
        {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string' },
          size: jdwNumberProperty(1),
        },
        ['name'],
      ),
    ),
    GridJdwNode: jdwTypedNodeDefinition(
      'grid',
      'GridJdwNode',
      jdwArgsDefinition(
        {
          columns: jdwNumberProperty(1),
          gap: jdwNumberProperty(0),
          padding: jdwNumberProperty(0),
          background: { type: 'string' },
          children: jdwChildrenProperty('JdwGridChildNode'),
        },
        ['columns'],
      ),
    ),
    BoxJdwNode: jdwTypedNodeDefinition(
      'box',
      'BoxJdwNode',
      jdwArgsDefinition({
        width: jdwNumberProperty(0),
        height: jdwNumberProperty(0),
        padding: jdwNumberProperty(0),
        background: { type: 'string' },
        child: jdwNodeRef(),
      }),
    ),
    ButtonJdwNode: jdwTypedNodeDefinition(
      'button',
      'ButtonJdwNode',
      jdwArgsDefinition(
        {
          label: { type: 'string', minLength: 1 },
          variant: { type: 'string' },
          color: { type: 'string' },
          background: { type: 'string' },
          disabled: jdwBooleanProperty(),
        },
        ['label'],
      ),
    ),
  };
}

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

/** Monaco/JSON schema for JDW v7 document roots (`type` + `args` envelope). */
export function createJdwDocumentJsonSchema(): WidgetJsonSchema {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://workbench-kit.dev/schemas/jdw-node.jdw.schema.json',
    title: 'JsonWidgetNode',
    description: 'Recursive JDW v7 widget envelope (type + args).',
    $ref: '#/definitions/JdwNode',
    definitions: createJdwNodeDefinitions(),
  };
}
