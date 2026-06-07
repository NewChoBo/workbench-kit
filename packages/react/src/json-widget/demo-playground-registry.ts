import { createElement } from 'react';
import { createWidgetRegistry, type GenericWidget } from '@workbench-kit/json-widget';

import {
  DEFAULT_PLAYGROUND_PREVIEW_RECT,
  PlaygroundWidgetRenderer,
} from './playground-renderer/PlaygroundWidgetRenderer.js';

export type PlaygroundWidget = GenericWidget;

function buildVisualPreview(widget: PlaygroundWidget) {
  return createElement(PlaygroundWidgetRenderer, {
    rect: DEFAULT_PLAYGROUND_PREVIEW_RECT,
    widget,
  });
}

const textInspector = [
  {
    title: 'Text',
    fields: [
      { kind: 'text' as const, prop: 'text', label: 'Content' },
      { kind: 'number' as const, prop: 'fontSize', label: 'Font size', min: 6, max: 120 },
      { kind: 'color' as const, prop: 'color', label: 'Color' },
      {
        kind: 'select' as const,
        prop: 'fontWeight',
        label: 'Font weight',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Bold', value: 'bold' },
        ],
      },
      {
        kind: 'select' as const,
        prop: 'textAlign',
        label: 'Text align',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const boxInspector = [
  {
    title: 'Box',
    fields: [
      { kind: 'color' as const, prop: 'background', label: 'Background' },
      { kind: 'number' as const, prop: 'borderRadius', label: 'Border radius', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
    ],
  },
];

const gridInspector = [
  {
    title: 'Grid',
    fields: [
      { kind: 'number' as const, prop: 'columns', label: 'Columns', min: 1, max: 24 },
      { kind: 'number' as const, prop: 'rows', label: 'Rows', min: 1, max: 24 },
      { kind: 'number' as const, prop: 'gap', label: 'Gap', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const stackInspector = [
  {
    title: 'Stack',
    fields: [{ kind: 'color' as const, prop: 'background', label: 'Background' }],
  },
];

const linearInspector = [
  {
    title: 'Layout',
    fields: [
      { kind: 'number' as const, prop: 'gap', label: 'Gap', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const buttonInspector = [
  {
    title: 'Button',
    fields: [
      { kind: 'text' as const, prop: 'label', label: 'Label' },
      {
        kind: 'select' as const,
        prop: 'variant',
        label: 'Variant',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Danger', value: 'danger' },
        ],
      },
      { kind: 'boolean' as const, prop: 'disabled', label: 'Disabled' },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
      { kind: 'color' as const, prop: 'color', label: 'Text color' },
      { kind: 'number' as const, prop: 'borderRadius', label: 'Border radius', min: 0 },
    ],
  },
];

const listViewInspector = [
  {
    title: 'List View',
    fields: [
      {
        kind: 'select' as const,
        prop: 'direction',
        label: 'Direction',
        options: [
          { label: 'Vertical', value: 'vertical' },
          { label: 'Horizontal', value: 'horizontal' },
        ],
      },
      { kind: 'number' as const, prop: 'itemExtent', label: 'Item extent', min: 1 },
      { kind: 'number' as const, prop: 'gap', label: 'Gap', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const inputInspector = [
  {
    title: 'Input',
    fields: [
      { kind: 'text' as const, prop: 'label', label: 'Label' },
      { kind: 'text' as const, prop: 'placeholder', label: 'Placeholder' },
      { kind: 'text' as const, prop: 'value', label: 'Value' },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
      { kind: 'color' as const, prop: 'color', label: 'Text color' },
      { kind: 'number' as const, prop: 'borderRadius', label: 'Border radius', min: 0 },
    ],
  },
];

const tileInspector = [
  {
    title: 'Tile',
    fields: [
      { kind: 'text' as const, prop: 'label', label: 'Label' },
      { kind: 'color' as const, prop: 'background', label: 'Background (via layers)' },
    ],
  },
];

const definitions = [
  {
    type: 'text',
    build: buildVisualPreview,
    displayName: 'Text',
    inspector: textInspector,
  },
  {
    type: 'box',
    build: buildVisualPreview,
    displayName: 'Box',
    inspector: boxInspector,
  },
  {
    type: 'grid',
    build: buildVisualPreview,
    displayName: 'Grid',
    inspector: gridInspector,
  },
  {
    type: 'stack',
    build: buildVisualPreview,
    displayName: 'Stack',
    inspector: stackInspector,
  },
  {
    type: 'row',
    build: buildVisualPreview,
    displayName: 'Row',
    inspector: linearInspector,
  },
  {
    type: 'column',
    build: buildVisualPreview,
    displayName: 'Column',
    inspector: linearInspector,
  },
  {
    type: 'button',
    build: buildVisualPreview,
    displayName: 'Button',
    inspector: buttonInspector,
  },
  {
    type: 'list-view',
    build: buildVisualPreview,
    displayName: 'List View',
    inspector: listViewInspector,
  },
  {
    type: 'input',
    build: buildVisualPreview,
    displayName: 'Input',
    inspector: inputInspector,
  },
  {
    type: 'tile',
    build: buildVisualPreview,
    displayName: 'Tile',
    inspector: tileInspector,
  },
];

export const playgroundWidgetRegistry = createWidgetRegistry<
  (widget: PlaygroundWidget) => ReturnType<typeof buildVisualPreview>,
  PlaygroundWidget
>(definitions);

export type PlaygroundWidgetTemplateId =
  | 'text'
  | 'box'
  | 'grid'
  | 'stack'
  | 'row'
  | 'column'
  | 'button'
  | 'input'
  | 'list-view'
  | 'tile';

export interface PlaygroundWidgetTemplate {
  id: PlaygroundWidgetTemplateId;
  label: string;
  create: (context: { siblingCount: number }) => GenericWidget;
}

export const PLAYGROUND_WIDGET_TEMPLATES: readonly PlaygroundWidgetTemplate[] = [
  {
    id: 'text',
    label: 'Text',
    create: ({ siblingCount }) => ({
      type: 'text',
      text: 'New text',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
    }),
  },
  {
    id: 'box',
    label: 'Box',
    create: ({ siblingCount }) => ({
      type: 'box',
      padding: 8,
      background: '#1e293b',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      child: { type: 'text', text: 'Box content' },
    }),
  },
  {
    id: 'grid',
    label: 'Grid',
    create: () => ({
      type: 'grid',
      columns: 2,
      rows: 2,
      gap: 8,
      padding: 12,
      children: [],
    }),
  },
  {
    id: 'stack',
    label: 'Stack',
    create: ({ siblingCount }) => ({
      type: 'stack',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      children: [
        { type: 'text', text: 'Back layer', left: 0, top: 0 },
        { type: 'text', text: 'Front layer', left: 16, top: 16 },
      ],
    }),
  },
  {
    id: 'row',
    label: 'Row',
    create: ({ siblingCount }) => ({
      type: 'row',
      gap: 8,
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      children: [
        { type: 'text', text: 'Left', flex: 1 },
        { type: 'text', text: 'Right', flex: 1 },
      ],
    }),
  },
  {
    id: 'column',
    label: 'Column',
    create: ({ siblingCount }) => ({
      type: 'column',
      gap: 8,
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      children: [
        { type: 'text', text: 'Top', flex: 1 },
        { type: 'text', text: 'Bottom', flex: 1 },
      ],
    }),
  },
  {
    id: 'input',
    label: 'Input',
    create: ({ siblingCount }) => ({
      type: 'input',
      label: 'Name',
      placeholder: 'Enter a value',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
    }),
  },
  {
    id: 'button',
    label: 'Button',
    create: ({ siblingCount }) => ({
      type: 'button',
      label: 'Launch',
      variant: 'primary',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
    }),
  },
  {
    id: 'list-view',
    label: 'List View',
    create: ({ siblingCount }) => ({
      type: 'list-view',
      direction: 'vertical',
      itemExtent: 72,
      gap: 6,
      padding: 8,
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      children: [
        { type: 'text', text: 'Item 1', background: '#1e293b' },
        { type: 'text', text: 'Item 2', background: '#334155' },
      ],
    }),
  },
  {
    id: 'tile',
    label: 'Tile',
    create: ({ siblingCount }) => ({
      type: 'tile',
      label: 'App',
      col: siblingCount % 2,
      row: Math.floor(siblingCount / 2),
      layers: [{ type: 'color', color: '#0f766e' }],
    }),
  },
];

export const EMPTY_PLAYGROUND_DOCUMENT = JSON.stringify(
  {
    type: 'grid',
    columns: 2,
    rows: 2,
    gap: 8,
    padding: 12,
    background: '#0f172a',
    children: [],
  },
  null,
  2,
);

export const WELCOME_PLAYGROUND_DOCUMENT = JSON.stringify(
  {
    type: 'grid',
    columns: 2,
    rows: 2,
    gap: 8,
    padding: 12,
    background: '#0f172a',
    children: [
      {
        type: 'text',
        text: 'Welcome',
        col: 0,
        row: 0,
        color: '#e2e8f0',
        fontSize: 16,
      },
    ],
  },
  null,
  2,
);

export interface PlaygroundStarterTemplate {
  id: string;
  label: string;
  description: string;
  document: string;
}

export const PLAYGROUND_STARTER_TEMPLATES: readonly PlaygroundStarterTemplate[] = [
  {
    id: 'empty-grid',
    label: 'Empty grid',
    description: 'Start with an empty 2×2 grid canvas.',
    document: EMPTY_PLAYGROUND_DOCUMENT,
  },
  {
    id: 'welcome',
    label: 'Welcome text',
    description: 'Single welcome label in a starter grid.',
    document: WELCOME_PLAYGROUND_DOCUMENT,
  },
  {
    id: 'dashboard',
    label: 'Dashboard layout',
    description: 'Grid with text, box, and row children.',
    document: JSON.stringify(
      {
        type: 'grid',
        columns: 3,
        rows: 2,
        gap: 8,
        padding: 12,
        background: '#101218',
        children: [
          {
            type: 'text',
            text: 'Widget playground',
            col: 0,
            row: 0,
            colSpan: 2,
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 'bold',
          },
          {
            type: 'box',
            col: 2,
            row: 0,
            background: '#0f766e',
            borderRadius: 8,
            padding: 8,
            child: {
              type: 'text',
              text: 'Live preview',
              color: '#ecfeff',
              textAlign: 'center',
            },
          },
          {
            type: 'row',
            col: 0,
            row: 1,
            colSpan: 3,
            gap: 8,
            children: [
              { type: 'text', text: 'Left', flex: 1, background: '#1e293b' },
              { type: 'text', text: 'Right', flex: 1, background: '#334155' },
            ],
          },
        ],
      },
      null,
      2,
    ),
  },
];
