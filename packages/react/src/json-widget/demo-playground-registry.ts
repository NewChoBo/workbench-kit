import { createWidgetRegistry, type GenericWidget } from '@workbench-kit/json-widget';

export type PlaygroundWidget = GenericWidget;

function describeWidget(widget: GenericWidget, depth = 0): string {
  const indent = '  '.repeat(depth);
  const props: string[] = [];

  if (widget.type === 'text' && typeof widget.text === 'string') {
    props.push(`text="${widget.text}"`);
  }
  if (widget.type === 'box') {
    if (widget.padding !== undefined) props.push(`padding=${widget.padding}`);
    if (widget.background !== undefined) props.push(`bg=${widget.background}`);
  }
  if (widget.type === 'grid') {
    if (widget.columns !== undefined) props.push(`cols=${widget.columns}`);
    if (widget.rows !== undefined) props.push(`rows=${widget.rows}`);
    if (widget.gap !== undefined) props.push(`gap=${widget.gap}`);
  }
  if (widget.type === 'stack' || widget.type === 'row' || widget.type === 'column') {
    if (widget.gap !== undefined) props.push(`gap=${widget.gap}`);
  }

  const placement =
    widget.col !== undefined && widget.row !== undefined
      ? ` @(${widget.col},${widget.row})`
      : '';

  let line = `${indent}[${widget.type}${placement}]`;
  if (props.length > 0) line += ` ${props.join(' ')}`;

  const childLines: string[] = [];
  if (widget.child && typeof widget.child === 'object' && 'type' in widget.child) {
    childLines.push(describeWidget(widget.child as GenericWidget, depth + 1));
  }
  if (Array.isArray(widget.children)) {
    for (const child of widget.children) {
      if (child && typeof child === 'object' && 'type' in child) {
        childLines.push(describeWidget(child as GenericWidget, depth + 1));
      }
    }
  }

  return childLines.length > 0 ? [line, ...childLines].join('\n') : line;
}

function buildDescribe(widget: GenericWidget): string {
  return describeWidget(widget);
}

const textInspector = [
  {
    title: 'Text',
    fields: [{ kind: 'text' as const, prop: 'text', label: 'Text' }],
  },
];

const boxInspector = [
  {
    title: 'Box',
    fields: [
      { kind: 'number' as const, prop: 'padding', label: 'Padding' },
      { kind: 'text' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const gridInspector = [
  {
    title: 'Grid',
    fields: [
      { kind: 'number' as const, prop: 'columns', label: 'Columns' },
      { kind: 'number' as const, prop: 'rows', label: 'Rows' },
      { kind: 'number' as const, prop: 'gap', label: 'Gap' },
    ],
  },
];

const stackInspector = [
  {
    title: 'Stack',
    fields: [{ kind: 'number' as const, prop: 'gap', label: 'Gap' }],
  },
];

const linearInspector = [
  {
    title: 'Layout',
    fields: [{ kind: 'number' as const, prop: 'gap', label: 'Gap' }],
  },
];

const definitions = [
  {
    type: 'text',
    build: buildDescribe,
    displayName: 'Text',
    inspector: textInspector,
  },
  {
    type: 'box',
    build: buildDescribe,
    displayName: 'Box',
    inspector: boxInspector,
  },
  {
    type: 'grid',
    build: buildDescribe,
    displayName: 'Grid',
    inspector: gridInspector,
  },
  {
    type: 'stack',
    build: buildDescribe,
    displayName: 'Stack',
    inspector: stackInspector,
  },
  {
    type: 'row',
    build: buildDescribe,
    displayName: 'Row',
    inspector: linearInspector,
  },
  {
    type: 'column',
    build: buildDescribe,
    displayName: 'Column',
    inspector: linearInspector,
  },
];

export const playgroundWidgetRegistry = createWidgetRegistry<
  (widget: PlaygroundWidget) => string,
  PlaygroundWidget
>(definitions);

export type PlaygroundWidgetTemplateId = 'text' | 'box' | 'grid' | 'stack' | 'row' | 'column';

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
];

export const EMPTY_PLAYGROUND_DOCUMENT = JSON.stringify(
  {
    type: 'grid',
    columns: 2,
    rows: 2,
    gap: 8,
    padding: 12,
    children: [
      {
        type: 'text',
        text: 'Welcome',
        col: 0,
        row: 0,
      },
    ],
  },
  null,
  2,
);
