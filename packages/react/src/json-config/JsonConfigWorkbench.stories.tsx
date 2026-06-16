import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatJsonWidgetData } from '@workbench-kit/jdw';

import { JsonConfigWorkbench, type JsonConfigWorkbenchProps } from './JsonConfigWorkbench.js';
import { type WorkbenchStructuredDataSchemaDocument } from '../workbench/settings/StructuredDataForm';

const meta = {
  title: 'JDW/Config/Workbench',
  component: JsonConfigWorkbench,
  parameters: {
    fullHeightShell: '640px',
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

const widgetJson = formatJsonWidgetData({
  type: 'demo:card',
  args: {
    title: 'Launch tile',
    body: 'Preview from JsonConfigWorkbench widget mode.',
  },
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
    <div style={{ background: 'var(--color-bg)', height: '100%' }}>
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

    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Launch tile');
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent(
      'Preview from JsonConfigWorkbench widget mode.',
    );

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
