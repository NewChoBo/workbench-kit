import type { WidgetRegistryContract, WidgetTypeShape } from '@workbench-kit/contracts';
import {
  createWidgetRegistry,
  formatWidgetDocumentJson,
  type GenericWidget,
} from '@workbench-kit/json-widget';

import { renderDemoWidgetNode } from './demo-render.js';

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

export const WIDGET_TREE_DEMO_REGISTRY: WidgetRegistryContract<unknown> = createWidgetRegistry([
  {
    type: 'text',
    build: (widget: WidgetTypeShape) => renderDemoWidgetNode(widget as GenericWidget),
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
    build: (widget: WidgetTypeShape) => renderDemoWidgetNode(widget as GenericWidget),
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
    build: (widget: WidgetTypeShape) => renderDemoWidgetNode(widget as GenericWidget),
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
    build: (widget: WidgetTypeShape) => renderDemoWidgetNode(widget as GenericWidget),
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

export const WIDGET_TREE_WELCOME_DOCUMENT = formatWidgetDocumentJson({
  type: 'column',
  gap: 12,
  padding: 16,
  children: [
    { type: 'text', text: 'Widget Tree' },
    {
      type: 'grid',
      columns: 2,
      gap: 8,
      children: [
        { type: 'text', text: 'A', col: 0, row: 0 },
        { type: 'text', text: 'B', col: 1, row: 0 },
        { type: 'text', text: 'Wide', col: 0, row: 1, colSpan: 2 },
      ],
    },
    {
      type: 'row',
      gap: 8,
      children: [
        { type: 'text', text: 'Left', flex: 1 },
        { type: 'text', text: 'Right', flex: 1 },
      ],
    },
  ],
});
