import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatWidgetJson } from '@workbench-kit/json-widget';

import { JsonWidgetEditor, type JsonWidgetEditorProps } from './JsonWidgetEditor.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
  body?: string;
}

const widgetDocument = formatWidgetJson({
  type: 'demo:card',
  title: 'Launch tile',
  body: 'Edit JSON or use the inspector to update preview output.',
} satisfies DemoWidget);

const demoRegistry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
  {
    type: 'demo:card',
    build: (widget) => {
      const body = widget.body?.trim();
      return body ? `${widget.title} — ${body}` : widget.title;
    },
    displayName: 'Demo Card',
    inspector: [
      {
        title: 'Card',
        fields: [
          { kind: 'text', prop: 'title', label: 'Title' },
          { kind: 'text', prop: 'body', label: 'Body', placeholder: 'Optional body copy' },
        ],
      },
    ],
  },
]);

const meta = {
  title: 'JsonWidget/Editor',
  component: JsonWidgetEditor,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

function EditorHarness({
  initialValue,
  ...props
}: Partial<JsonWidgetEditorProps> & { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [baseline, setBaseline] = useState(initialValue);

  return (
    <div style={{ padding: 24, height: 720, background: 'var(--color-bg)' }}>
      <JsonWidgetEditor
        baselineValue={baseline}
        path="widget.json"
        title="Widget editor"
        value={value}
        widgetRegistry={demoRegistry}
        onChange={setValue}
        onDiscard={() => setValue(baseline)}
        onSave={() => setBaseline(value)}
        {...props}
      />
    </div>
  );
}

export const SplitEditor: Story = {
  render: () => <EditorHarness initialValue={widgetDocument} defaultMode="split" />,
};

export const EditorInteraction: Story = {
  render: () => <EditorHarness initialValue={widgetDocument} defaultMode="split" />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('tree', { name: 'Widget tree' })).toBeVisible();
    await expect(
      canvas.getByText('Launch tile — Edit JSON or use the inspector to update preview output.'),
    ).toBeVisible();

    const titleInput = await waitFor(() => canvas.getByDisplayValue('Launch tile'));
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated tile');

    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Updated tile'),
    );
  },
};
