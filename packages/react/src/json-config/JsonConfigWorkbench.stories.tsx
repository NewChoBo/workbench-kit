import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import {
  createWidgetRegistry,
  formatWidgetJson,
  type GenericWidget,
} from '@workbench-kit/json-widget';

import { JsonConfigWorkbench, type JsonConfigWorkbenchProps } from './JsonConfigWorkbench.js';
import { createWidgetRendererRegistry } from '../json-widget/renderer/createWidgetRendererRegistry.js';
import type { WidgetRendererProps } from '../json-widget/renderer/contract.js';
import { type WorkbenchStructuredDataSchemaDocument } from '../workbench/settings/StructuredDataForm';

const meta = {
  title: 'JsonConfig/Workbench',
  component: JsonConfigWorkbench,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const settingsSchema: WorkbenchStructuredDataSchemaDocument = {
  activePattern: 'AppSettings',
  schema: {
    properties: {
      'general.appName': { title: 'App name', type: 'string' },
      'general.autoSave': { title: 'Auto save', type: 'boolean' },
      'appearance.theme': {
        title: 'Theme',
        type: 'string',
        enum: ['system', 'light', 'dark'],
      },
    },
    sections: [
      {
        fields: ['appName', 'autoSave'],
        sectionKey: 'general',
        title: 'General',
        type: 'form',
      },
      {
        fields: ['theme'],
        sectionKey: 'appearance',
        title: 'Appearance',
        type: 'form',
      },
    ],
  },
};

const settingsJson = JSON.stringify(
  {
    general: {
      appName: 'Content Hub',
      autoSave: true,
    },
    appearance: {
      theme: 'dark',
    },
  },
  null,
  2,
);

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
  body?: string;
}

const widgetJson = formatWidgetJson({
  type: 'demo:card',
  title: 'Launch tile',
  body: 'Preview from JsonConfigWorkbench widget mode.',
});

const demoRegistry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
  {
    type: 'demo:card',
    build: (widget) => {
      const body = widget.body?.trim();
      return body ? `${widget.title} — ${body}` : widget.title;
    },
    displayName: 'Demo Card',
  },
]);

function ConfigHarness({
  initialValue,
  ...props
}: Partial<JsonConfigWorkbenchProps> & { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [baseline, setBaseline] = useState(initialValue);

  return (
    <div style={{ padding: 24, height: 640, background: 'var(--color-bg)' }}>
      <JsonConfigWorkbench
        baselineValue={baseline}
        path="settings.json"
        title="App settings"
        value={value}
        onChange={setValue}
        onDiscard={() => setValue(baseline)}
        onSave={() => setBaseline(value)}
        {...props}
      />
    </div>
  );
}

export const SchemaSettings: Story = {
  render: () => (
    <ConfigHarness
      initialValue={settingsJson}
      defaultMode="split"
      previewKind="schema"
      schema={settingsSchema}
    />
  ),
};

export const WidgetPreview: Story = {
  render: () => (
    <ConfigHarness
      initialValue={widgetJson}
      defaultMode="split"
      path="widget.json"
      previewKind="widget"
      title="Widget config"
      widgetRegistry={demoRegistry}
    />
  ),
};

export const WidgetInteraction: Story = {
  render: () => (
    <ConfigHarness
      initialValue={widgetJson}
      defaultMode="split"
      path="widget.json"
      previewKind="widget"
      title="Widget config"
      widgetRegistry={demoRegistry}
    />
  ),
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Launch tile — Preview from JsonConfigWorkbench widget mode.'),
    ).toBeVisible();

    await expect(canvas.getByRole('button', { name: 'Split' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    await expect(canvas.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Code' }));
    await expect(canvas.getByRole('button', { name: 'Code' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

const layoutWidgetJson = formatWidgetJson({
  type: 'grid',
  columns: 2,
  gap: 12,
  padding: 12,
  background: '#0f172a',
  children: [
    { type: 'tile', col: 0, row: 0, label: 'Library' } as GenericWidget,
    { type: 'box', col: 1, row: 0, background: '#1d4ed8', borderRadius: 8 },
    { type: 'text', col: 0, row: 1, text: 'Edit JSON to update render', color: '#e2e8f0' },
    { type: 'box', col: 1, row: 1, background: '#7c3aed', borderRadius: 8 },
  ],
});

function TileRenderer({ widget, rect, fillParent }: WidgetRendererProps) {
  const label = typeof widget.label === 'string' ? widget.label : 'Tile';
  return (
    <div
      data-widget-type="tile"
      style={{
        position: 'absolute',
        ...(fillParent
          ? { inset: 0 }
          : { left: rect.x, top: rect.y, width: rect.width, height: rect.height }),
        display: 'grid',
        placeItems: 'center',
        background: '#0ea5e9',
        color: '#f8fafc',
        borderRadius: 12,
        fontWeight: 700,
        boxSizing: 'border-box',
      }}
    >
      {label}
    </div>
  );
}

const widgetRendererRegistry = createWidgetRendererRegistry([
  { type: 'tile', build: TileRenderer, displayName: 'Tile' },
]);

export const WidgetCanvasPreview: Story = {
  render: () => (
    <ConfigHarness
      initialValue={layoutWidgetJson}
      defaultMode="split"
      path="layout.json"
      previewKind="widget"
      title="Layout config (real render)"
      useWidgetCanvas
      widgetRendererRegistry={widgetRendererRegistry}
    />
  ),
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('json-widget-canvas')).toBeVisible();
    await expect(canvasElement.querySelector('[data-widget-type="tile"]')).not.toBeNull();
    await expect(canvas.getByText('Library')).toBeVisible();
  },
};

export const AutoPreview: Story = {
  render: () => (
    <ConfigHarness
      initialValue={widgetJson}
      defaultMode="preview"
      path="widget.json"
      previewKind="auto"
      title="Auto-detected widget"
      widgetRegistry={demoRegistry}
    />
  ),
};

export const Interaction: Story = {
  render: () => (
    <ConfigHarness
      initialValue={settingsJson}
      defaultMode="split"
      previewKind="schema"
      schema={settingsSchema}
    />
  ),
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const appNameInput = canvas.getByRole('textbox', { name: 'App name' });
    await expect(appNameInput).toHaveValue('Content Hub');

    await userEvent.clear(appNameInput);
    await userEvent.type(appNameInput, 'Updated Hub');
    await expect(appNameInput).toHaveValue('Updated Hub');

    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Discard' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }));
    await expect(appNameInput).toHaveValue('Content Hub');
  },
};
