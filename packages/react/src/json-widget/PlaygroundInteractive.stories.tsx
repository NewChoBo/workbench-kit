import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createPlaygroundWidgetJsonSchema } from '@workbench-kit/json-widget';

import type { WidgetPath } from '@workbench-kit/json-widget';

import { Button } from '../primitives/Button';
import { ButtonGroup } from '../primitives/WorkbenchEditor';
import { JsonWidgetEditor, type JsonWidgetEditorProps } from './JsonWidgetEditor.js';
import {
  PLAYGROUND_STARTER_TEMPLATES,
  PLAYGROUND_WIDGET_TEMPLATES,
  WELCOME_PLAYGROUND_DOCUMENT,
  playgroundWidgetRegistry,
  type PlaygroundStarterTemplate,
  type PlaygroundWidgetTemplate,
} from './demo-playground-registry.js';
import { deletePlaygroundWidget, duplicatePlaygroundWidget } from './playground-ops.js';
import { insertPlaygroundWidget } from './playground-insert.js';

const playgroundJsonSchema = createPlaygroundWidgetJsonSchema(playgroundWidgetRegistry.definitions());

const meta = {
  title: 'JsonWidget/Playground',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        component:
          'Interactive sandbox for widget JSON authoring — add widgets, drag-and-drop in the tree, edit in Monaco and the inspector, and preview structure visually.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

function PlaygroundToolbar({
  canDelete,
  canDuplicate,
  onAdd,
  onDelete,
  onDuplicate,
  onLoadTemplate,
}: {
  canDelete: boolean;
  canDuplicate: boolean;
  onAdd: (template: PlaygroundWidgetTemplate) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLoadTemplate: (template: PlaygroundStarterTemplate) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <ButtonGroup ariaLabel="Starter templates">
        {PLAYGROUND_STARTER_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            compact
            data-testid={`starter-template-${template.id}`}
            title={template.description}
            onClick={() => onLoadTemplate(template)}
          >
            {template.label}
          </Button>
        ))}
      </ButtonGroup>
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
      <ButtonGroup ariaLabel="Selection actions">
        <Button
          compact
          data-testid="duplicate-widget"
          disabled={!canDuplicate}
          onClick={onDuplicate}
        >
          Duplicate
        </Button>
        <Button
          compact
          data-testid="delete-widget"
          disabled={!canDelete}
          variant="danger"
          onClick={onDelete}
        >
          Delete
        </Button>
      </ButtonGroup>
    </div>
  );
}

function InteractivePlaygroundHarness({
  initialValue = WELCOME_PLAYGROUND_DOCUMENT,
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

  const handleDeleteWidget = useCallback(() => {
    const next = deletePlaygroundWidget(value, selectedPath);
    if (next) {
      setValue(next);
      setSelectedPath(null);
      action('delete-widget')({ path: selectedPath, document: next });
    }
  }, [selectedPath, value]);

  const handleDuplicateWidget = useCallback(() => {
    const next = duplicatePlaygroundWidget(value, selectedPath);
    if (next) {
      setValue(next);
      action('duplicate-widget')({ path: selectedPath, document: next });
    }
  }, [selectedPath, value]);

  const handleLoadTemplate = useCallback((template: PlaygroundStarterTemplate) => {
    setValue(template.document);
    setBaseline(template.document);
    setSelectedPath(null);
    action('load-template')({ id: template.id });
  }, []);

  const canDelete = selectedPath !== null && selectedPath.length > 0;
  const canDuplicate = canDelete;

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
        headerActions={
          <PlaygroundToolbar
            canDelete={canDelete}
            canDuplicate={canDuplicate}
            onAdd={handleAddWidget}
            onDelete={handleDeleteWidget}
            onDuplicate={handleDuplicateWidget}
            onLoadTemplate={handleLoadTemplate}
          />
        }
        interactivePreview
        jsonSchema={playgroundJsonSchema}
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
          'Full editor surface with tree DnD, Monaco schema validation, visual preview canvas with click-to-select, inspector property sections, and toolbar actions for add/duplicate/delete.',
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
    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Welcome');
    await expect(canvas.getByTestId('json-widget-preview-canvas')).toBeVisible();

    await userEvent.click(canvas.getByTestId('add-widget-text'));

    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('New text'),
    );

    await userEvent.click(canvas.getByTestId('playground-widget-$.children[1]'));

    const titleInput = await waitFor(() => canvas.getByDisplayValue('New text'));
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Edited label');

    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Edited label'),
    );

    await userEvent.click(canvas.getByTestId('duplicate-widget'));
    await waitFor(() =>
      expect(
        canvas.getByTestId('json-widget-preview-output').textContent?.match(/Edited label/g),
      )?.toHaveLength(2),
    );

    await userEvent.click(canvas.getByTestId('delete-widget'));
    await waitFor(() =>
      expect(
        canvas.getByTestId('json-widget-preview-output').textContent?.match(/Edited label/g),
      )?.toHaveLength(1),
    );
  },
};
