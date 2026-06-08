import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { WidgetAuthoringWorkbench } from './WidgetAuthoringWorkbench.js';

const meta = {
  title: 'JsonWidget/Playground',
  component: WidgetAuthoringWorkbench,
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
} satisfies Meta<typeof WidgetAuthoringWorkbench>;

export default meta;

type Story = StoryObj<typeof WidgetAuthoringWorkbench>;

function PlaygroundShell(props: ComponentProps<typeof WidgetAuthoringWorkbench>) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--color-bg)',
      }}
    >
      <WidgetAuthoringWorkbench
        exportFilename="playground.json"
        onDocumentChange={(value) => action('document-change')(value)}
        onModeChange={(mode) => action('mode-change')(mode)}
        onSave={() => action('save')()}
        title="Widget playground"
        {...props}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <PlaygroundShell />,
  parameters: {
    docs: {
      description: {
        story:
          'Full editor surface with tree DnD, Monaco schema validation, canvas-style preview (selection chrome, hover outline, Space+drag pan, optional 8px grid), inspector property sections, and toolbar actions for add/duplicate/delete.',
      },
    },
  },
};

export const InteractiveSmoke: Story = {
  render: () => <PlaygroundShell />,
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addPanel = within(canvas.getByTestId('widget-add-side-panel'));

    await expect(canvas.getByRole('tree', { name: 'Widget tree' })).toBeVisible();
    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Welcome');
    await expect(canvas.getByTestId('json-widget-preview-canvas')).toBeVisible();

    await userEvent.click(addPanel.getByTestId('segmented-components'));
    await userEvent.click(canvas.getByTestId('palette-text'));

    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('New text'),
    );

    await userEvent.click(canvas.getByTestId('playground-widget-$.children[1]'));
    await userEvent.click(addPanel.getByTestId('segmented-properties'));

    const titleInput = await addPanel.findByDisplayValue('New text');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Edited label', { delay: 10 });

    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Edited label'),
    );

    await userEvent.click(canvas.getByTestId('playground-widget-$.children[1]'));
    await waitFor(() => expect(canvas.getByTestId('duplicate-widget')).toBeEnabled());
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

    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(canvas.queryByTitle('Unsaved changes')).not.toBeInTheDocument());
  },
};
