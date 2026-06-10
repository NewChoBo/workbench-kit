import type { WidgetRegistryContract, WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, type GenericWidget } from '@workbench-kit/jdw';

import { renderBuiltinWidgetNode } from './builtins/renderBuiltinWidgetNode.js';

const LAYOUT_INSPECTOR = [
  {
    title: 'Layout',
    fields: [
      { kind: 'number' as const, prop: 'gap', label: 'Gap', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

function build(widget: WidgetTypeShape) {
  return renderBuiltinWidgetNode(widget as GenericWidget);
}

/** workbench-jdw-react-v1 builtin widget registry (text, row, column, grid). */
export function createBuiltinJdwRegistry(): WidgetRegistryContract<unknown> {
  return createWidgetRegistry([
    {
      type: 'text',
      build,
      displayName: 'Text',
      schema: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          color: { type: 'string' },
          background: { type: 'string' },
          fontSize: { type: 'number' },
        },
      },
      inspector: [
        {
          title: 'Text',
          fields: [
            { kind: 'text', prop: 'text', label: 'Content' },
            { kind: 'color', prop: 'color', label: 'Color' },
            { kind: 'number', prop: 'fontSize', label: 'Font size', min: 8, max: 96 },
          ],
        },
      ],
    },
    {
      type: 'row',
      build,
      displayName: 'Row',
      schema: {
        type: 'object',
        properties: {
          gap: { type: 'number', minimum: 0 },
          padding: { type: 'number', minimum: 0 },
          background: { type: 'string' },
          children: { type: 'array' },
        },
      },
      inspector: LAYOUT_INSPECTOR,
      capabilities: ['container'],
    },
    {
      type: 'column',
      build,
      displayName: 'Column',
      schema: {
        type: 'object',
        properties: {
          gap: { type: 'number', minimum: 0 },
          padding: { type: 'number', minimum: 0 },
          background: { type: 'string' },
          children: { type: 'array' },
        },
      },
      inspector: LAYOUT_INSPECTOR,
      capabilities: ['container'],
    },
    {
      type: 'grid',
      build,
      displayName: 'Grid',
      schema: {
        type: 'object',
        properties: {
          columns: { type: 'number', minimum: 1 },
          gap: { type: 'number', minimum: 0 },
          padding: { type: 'number', minimum: 0 },
          background: { type: 'string' },
          children: { type: 'array' },
        },
      },
      inspector: [
        {
          title: 'Grid',
          fields: [
            { kind: 'number', prop: 'columns', label: 'Columns', min: 1, max: 12 },
            { kind: 'number', prop: 'gap', label: 'Gap', min: 0 },
            { kind: 'number', prop: 'padding', label: 'Padding', min: 0 },
            { kind: 'color', prop: 'background', label: 'Background' },
          ],
        },
      ],
      capabilities: ['container'],
    },
  ]);
}

export const BUILTIN_JDW_REGISTRY = createBuiltinJdwRegistry();
