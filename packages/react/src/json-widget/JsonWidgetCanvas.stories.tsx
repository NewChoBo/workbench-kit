import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { formatWidgetJson, type GenericWidget } from '@workbench-kit/json-widget';

import { JsonWidgetCanvas } from './JsonWidgetCanvas.js';
import { createWidgetRendererRegistry } from './renderer/createWidgetRendererRegistry.js';
import type { WidgetRendererProps } from './renderer/contract.js';

const GRID_OF_BOXES: GenericWidget = {
  type: 'grid',
  columns: 3,
  gap: 12,
  padding: 12,
  background: '#0f172a',
  children: [
    { type: 'box', col: 0, row: 0, background: '#1d4ed8', borderRadius: 8 },
    { type: 'box', col: 1, row: 0, background: '#2563eb', borderRadius: 8 },
    { type: 'box', col: 2, row: 0, background: '#3b82f6', borderRadius: 8 },
    { type: 'box', col: 0, row: 1, background: '#7c3aed', borderRadius: 8 },
    { type: 'box', col: 1, row: 1, background: '#9333ea', borderRadius: 8 },
    { type: 'box', col: 2, row: 1, background: '#a855f7', borderRadius: 8 },
  ],
};

const NESTED_ROW_COLUMN: GenericWidget = {
  type: 'row',
  gap: 8,
  padding: 8,
  background: '#0f172a',
  children: [
    {
      type: 'column',
      flex: 1,
      gap: 8,
      children: [
        { type: 'box', flex: 1, background: '#0ea5e9', borderRadius: 6 },
        { type: 'box', flex: 2, background: '#0284c7', borderRadius: 6 },
      ],
    },
    {
      type: 'column',
      flex: 2,
      gap: 8,
      children: [
        { type: 'box', flex: 1, background: '#14b8a6', borderRadius: 6 },
        {
          type: 'row',
          flex: 1,
          gap: 8,
          children: [
            { type: 'box', flex: 1, background: '#10b981', borderRadius: 6 },
            { type: 'box', flex: 1, background: '#22c55e', borderRadius: 6 },
          ],
        },
      ],
    },
  ],
};

function sampleImageDataUri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="420" height="320" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const TEXT_AND_IMAGE: GenericWidget = {
  type: 'stack',
  background: '#020617',
  children: [
    {
      type: 'image',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      src: sampleImageDataUri(),
      fit: 'cover',
    },
    {
      type: 'box',
      left: 0,
      right: 0,
      bottom: 0,
      top: 240,
      background: 'rgba(2, 6, 23, 0.72)',
      padding: 12,
      child: {
        type: 'text',
        text: 'Real layout rendering',
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
      },
    },
  ],
};

interface ClockWidget extends GenericWidget {
  type: 'clock';
  label: string;
}

function ClockRenderer({ widget, rect, fillParent }: WidgetRendererProps) {
  const label = typeof widget.label === 'string' ? widget.label : 'Clock';
  return (
    <div
      data-widget-type="clock"
      style={{
        position: 'absolute',
        ...(fillParent
          ? { inset: 0 }
          : { left: rect.x, top: rect.y, width: rect.width, height: rect.height }),
        display: 'grid',
        placeItems: 'center',
        background: '#111827',
        color: '#f9fafb',
        borderRadius: 12,
        fontSize: 18,
        fontWeight: 700,
        boxSizing: 'border-box',
      }}
    >
      {label} · 12:00
    </div>
  );
}

const CUSTOM_TYPE_DOC: GenericWidget = {
  type: 'grid',
  columns: 2,
  gap: 12,
  padding: 12,
  background: '#0f172a',
  children: [
    { type: 'clock', col: 0, row: 0, label: 'Lobby' } as ClockWidget,
    { type: 'clock', col: 1, row: 0, label: 'Studio' } as ClockWidget,
    { type: 'box', col: 0, row: 1, background: '#1e293b', borderRadius: 8 },
    { type: 'box', col: 1, row: 1, background: '#334155', borderRadius: 8 },
  ],
};

const customRegistry = createWidgetRendererRegistry([
  { type: 'clock', build: ClockRenderer, displayName: 'Clock' },
]);

const meta = {
  title: 'JsonWidget/Canvas',
  component: JsonWidgetCanvas,
  args: {
    width: 420,
    height: 320,
  },
} satisfies Meta<typeof JsonWidgetCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GridOfBoxes: Story = {
  args: { json: formatWidgetJson(GRID_OF_BOXES) },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('json-widget-canvas')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-widget-type="box"]')).toHaveLength(6);
  },
};

export const NestedRowColumn: Story = {
  args: { json: formatWidgetJson(NESTED_ROW_COLUMN) },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-widget-type="row"]')).not.toBeNull();
    await expect(canvasElement.querySelectorAll('[data-widget-type="column"]')).toHaveLength(2);
  },
};

export const TextAndImage: Story = {
  args: { json: formatWidgetJson(TEXT_AND_IMAGE) },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Real layout rendering')).toBeVisible();
    await expect(canvasElement.querySelector('[data-widget-type="image"] img')).not.toBeNull();
  },
};

export const CustomTypeRegistration: Story = {
  args: {
    json: formatWidgetJson(CUSTOM_TYPE_DOC),
    registry: customRegistry,
  },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[data-widget-type="clock"]')).toHaveLength(2);
    await expect(canvas.getByText('Lobby · 12:00')).toBeVisible();
  },
};

export const ParseError: Story = {
  args: { json: '{' },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('json-widget-canvas-error')).toBeVisible();
  },
};
