import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { WidgetPath } from '@workbench-kit/json-widget';

import { Button } from '../primitives/Button';
import { ButtonGroup } from '../primitives/WorkbenchEditor';
import { JsonWidgetEditor, type JsonWidgetEditorProps } from './JsonWidgetEditor.js';
import {
  EMPTY_PLAYGROUND_DOCUMENT,
  PLAYGROUND_WIDGET_TEMPLATES,
  playgroundWidgetRegistry,
  type PlaygroundWidgetTemplate,
} from './demo-playground-registry.js';
import { insertPlaygroundWidget } from './playground-insert.js';

const meta = {
  title: 'JsonWidget/Playground',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        component:
          'Interactive sandbox for widget JSON authoring — add widgets, drag-and-drop in the tree, edit in Monaco and the inspector, and preview structure.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

function AddWidgetToolbar({
  onAdd,
}: {
  onAdd: (template: PlaygroundWidgetTemplate) => void;
}) {
  return (
    <ButtonGroup ariaLabel="Add widget">
      {PLAYGROUND_WIDGET_TEMPLATES.map((template) => (
        <Button
          key={template.id}
          compact
          data-testid={`add-widget-${template.id}`}
          onClick={() => onAdd(template)}
        >
          + {template.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function InteractivePlaygroundHarness({
  initialValue = EMPTY_PLAYGROUND_DOCUMENT,
  ...props
}: Partial<JsonWidgetEditorProps> & { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const [baseline, setBaseline] = useState(initialValue);
  const [selectedPath, setSelectedPath] = useState<WidgetPath | null>(null);

  const handleChange = useCallback((next: string) => {
    setValue(next);
    action('document-change')(next);
  }, []);

  const handleAddWidget = useCallback(
    (template: PlaygroundWidgetTemplate) => {
      const next = insertPlaygroundWidget(value, template, selectedPath);
      if (next) {
        setValue(next);
        action('add-widget')({ type: template.id, document: next });
      }
    },
    [selectedPath, value],
  );

  return (
    <div
      style={{
        boxSizing: 'border-box',
        height: '100%',
        padding: 16,
        background: 'var(--color-bg)',
      }}
    >
      <JsonWidgetEditor
        baselineValue={baseline}
        defaultMode="split"
        headerActions={<AddWidgetToolbar onAdd={handleAddWidget} />}
        path="playground.json"
        title="Widget playground"
        value={value}
        widgetRegistry={playgroundWidgetRegistry}
        onChange={handleChange}
        onDiscard={() => {
          setValue(baseline);
          action('discard')();
        }}
        onModeChange={(mode) => action('mode-change')(mode)}
        onSave={() => {
          setBaseline(value);
          action('save')(value);
        }}
        onSelectionChange={setSelectedPath}
        {...props}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractivePlaygroundHarness />,
  parameters: {
    docs: {
      description: {
        story:
          'Full editor surface with tree DnD, Monaco, inspector, and structural preview. Use toolbar buttons to insert demo widget types into the selected container or as a sibling.',
      },
    },
  },
};

export const InteractiveSmoke: Story = {
  render: () => <InteractivePlaygroundHarness />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('tree', { name: 'Widget tree' })).toBeVisible();
    await expect(canvas.getByText('Welcome')).toBeVisible();
    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('[grid]');

    await userEvent.click(canvas.getByTestId('add-widget-text'));

    await waitFor(() => expect(canvas.getByText('New text')).toBeVisible());
    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('New text'),
    );

    const titleInput = await waitFor(() => canvas.getByDisplayValue('New text'));
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Edited label');

    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Edited label'),
    );
  },
};
