import type {
  WidgetMeasureConstraints,
  WidgetMeasureResult,
  WidgetRegistryContract,
  WidgetTypeShape,
} from '@workbench-kit/contracts';
import { createWidgetRegistry, type GenericWidget } from '@workbench-kit/jdw';

import { renderBuiltinWidgetLeaf } from './builtins/renderBuiltinWidgetLeaf.js';

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

const SIZE_INSPECTOR = [
  {
    title: 'Size',
    fields: [
      { kind: 'number' as const, prop: 'width', label: 'Width', min: 0 },
      { kind: 'number' as const, prop: 'height', label: 'Height', min: 0 },
    ],
  },
];

const BOX_INSPECTOR = [
  {
    title: 'Box',
    fields: [
      { kind: 'number' as const, prop: 'width', label: 'Width', min: 0 },
      { kind: 'number' as const, prop: 'height', label: 'Height', min: 0 },
      { kind: 'number' as const, prop: 'padding', label: 'Padding', min: 0 },
      { kind: 'color' as const, prop: 'background', label: 'Background' },
    ],
  },
];

const ALIGNMENT_OPTIONS = [
  { label: 'Top left', value: 'topLeft' },
  { label: 'Top center', value: 'topCenter' },
  { label: 'Top right', value: 'topRight' },
  { label: 'Center left', value: 'centerLeft' },
  { label: 'Center', value: 'center' },
  { label: 'Center right', value: 'centerRight' },
  { label: 'Bottom left', value: 'bottomLeft' },
  { label: 'Bottom center', value: 'bottomCenter' },
  { label: 'Bottom right', value: 'bottomRight' },
] as const;

const IMAGE_FIT_OPTIONS = [
  { label: 'Contain', value: 'contain' },
  { label: 'Cover', value: 'cover' },
  { label: 'Fill', value: 'fill' },
  { label: 'Scale down', value: 'scale-down' },
] as const;

const BUTTON_VARIANT_OPTIONS = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
] as const;

function build(widget: WidgetTypeShape) {
  return renderBuiltinWidgetLeaf(widget as GenericWidget);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function clampMeasure(
  size: Required<WidgetMeasureResult>,
  constraints: WidgetMeasureConstraints,
): WidgetMeasureResult {
  return {
    width: Math.min(Math.max(size.width, constraints.minWidth), constraints.maxWidth),
    height: Math.min(Math.max(size.height, constraints.minHeight), constraints.maxHeight),
  };
}

function measureText(widget: WidgetTypeShape, constraints: WidgetMeasureConstraints) {
  const record = widget as GenericWidget;
  const text = readString(record.text) ?? '';
  const fontSize = readNumber(record.fontSize) ?? 14;
  const width = Math.max(fontSize * 0.6, text.length * fontSize * 0.56);
  const height = fontSize * 1.35;
  return clampMeasure({ width, height }, constraints);
}

function measureIcon(widget: WidgetTypeShape, constraints: WidgetMeasureConstraints) {
  const record = widget as GenericWidget;
  const size = readNumber(record.size) ?? 16;
  return clampMeasure({ width: size, height: size }, constraints);
}

function measureImage(widget: WidgetTypeShape, constraints: WidgetMeasureConstraints) {
  const record = widget as GenericWidget;
  return clampMeasure(
    {
      width: readNumber(record.width) ?? 120,
      height: readNumber(record.height) ?? 80,
    },
    constraints,
  );
}

function measureButton(widget: WidgetTypeShape, constraints: WidgetMeasureConstraints) {
  const record = widget as GenericWidget;
  const label = readString(record.label) ?? '';
  return clampMeasure(
    {
      width: Math.max(56, label.length * 8 + 24),
      height: 28,
    },
    constraints,
  );
}

/** workbench-jdw-react-v1 builtin widget registry for static JDW authoring. */
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
      measure: measureText,
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
      type: 'stack',
      build,
      displayName: 'Stack',
      schema: {
        type: 'object',
        properties: {
          background: { type: 'string' },
          children: { type: 'array' },
        },
      },
      inspector: [
        {
          title: 'Stack',
          fields: [{ kind: 'color', prop: 'background', label: 'Background' }],
        },
      ],
      capabilities: ['container'],
    },
    {
      type: 'container',
      build,
      displayName: 'Container',
      schema: {
        type: 'object',
        properties: {
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
          padding: { type: 'number', minimum: 0 },
          background: { type: 'string' },
        },
      },
      inspector: BOX_INSPECTOR,
    },
    {
      type: 'box',
      build,
      displayName: 'Box',
      schema: {
        type: 'object',
        properties: {
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
          padding: { type: 'number', minimum: 0 },
          background: { type: 'string' },
        },
      },
      inspector: BOX_INSPECTOR,
    },
    {
      type: 'padding',
      build,
      displayName: 'Padding',
      schema: {
        type: 'object',
        properties: {
          padding: { type: 'number', minimum: 0 },
        },
      },
      inspector: [
        {
          title: 'Padding',
          fields: [{ kind: 'number', prop: 'padding', label: 'Padding', min: 0 }],
        },
      ],
    },
    {
      type: 'align',
      build,
      displayName: 'Align',
      schema: {
        type: 'object',
        properties: {
          alignment: { type: 'string' },
        },
      },
      inspector: [
        {
          title: 'Alignment',
          fields: [
            {
              kind: 'select',
              prop: 'alignment',
              label: 'Alignment',
              options: ALIGNMENT_OPTIONS,
            },
          ],
        },
      ],
    },
    {
      type: 'center',
      build,
      displayName: 'Center',
      schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      type: 'sized_box',
      build,
      displayName: 'Sized box',
      schema: {
        type: 'object',
        properties: {
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
        },
      },
      inspector: SIZE_INSPECTOR,
    },
    {
      type: 'image',
      build,
      displayName: 'Image',
      schema: {
        type: 'object',
        required: ['src'],
        properties: {
          src: { type: 'string', minLength: 1 },
          alt: { type: 'string' },
          fit: { type: 'string' },
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
        },
      },
      measure: measureImage,
      inspector: [
        {
          title: 'Image',
          fields: [
            { kind: 'text', prop: 'src', label: 'Source' },
            { kind: 'text', prop: 'alt', label: 'Alt text' },
            { kind: 'select', prop: 'fit', label: 'Fit', options: IMAGE_FIT_OPTIONS },
          ],
        },
        ...SIZE_INSPECTOR,
      ],
    },
    {
      type: 'icon',
      build,
      displayName: 'Icon',
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string' },
          size: { type: 'number', minimum: 1 },
        },
      },
      measure: measureIcon,
      inspector: [
        {
          title: 'Icon',
          fields: [
            { kind: 'text', prop: 'name', label: 'Name' },
            { kind: 'color', prop: 'color', label: 'Color' },
            { kind: 'number', prop: 'size', label: 'Size', min: 1 },
          ],
        },
      ],
    },
    {
      type: 'button',
      build,
      displayName: 'Button',
      schema: {
        type: 'object',
        required: ['label'],
        properties: {
          label: { type: 'string', minLength: 1 },
          variant: { type: 'string' },
          color: { type: 'string' },
          background: { type: 'string' },
          disabled: { type: 'boolean' },
        },
      },
      measure: measureButton,
      inspector: [
        {
          title: 'Button',
          fields: [
            { kind: 'text', prop: 'label', label: 'Label' },
            { kind: 'select', prop: 'variant', label: 'Variant', options: BUTTON_VARIANT_OPTIONS },
            { kind: 'color', prop: 'color', label: 'Text color' },
            { kind: 'color', prop: 'background', label: 'Background' },
            { kind: 'boolean', prop: 'disabled', label: 'Disabled' },
          ],
        },
      ],
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
