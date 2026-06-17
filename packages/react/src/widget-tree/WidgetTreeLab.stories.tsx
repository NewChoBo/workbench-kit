import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { WidgetTreeWorkbench } from './WidgetTreeWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';
import { waitForWidgetTreeSourcePane } from './widget-tree-play-helpers.js';

function WidgetTreeLabHarness({
  initialValue = WIDGET_TREE_WELCOME_DOCUMENT,
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <WidgetTreeWorkbench
      assetCatalog={WIDGET_TREE_DEMO_ASSET_CATALOG}
      registry={WIDGET_TREE_DEMO_REGISTRY}
      value={value}
      onChange={setValue}
    />
  );
}

const meta = {
  title: 'JDW/WidgetTree/Lab',
  parameters: {
    fullHeightShell: '720px',
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Widget lab with Monaco JSON schema validation, outline/properties side panel, row/column/grid layout widgets, and live preview.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Live: Story = {
  render: () => <WidgetTreeLabHarness />,
};

export const InteractionSmoke: Story = {
  render: () => <WidgetTreeLabHarness />,
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const clickOutlineNode = async (pathKey: string) => {
      const node = canvas.getByTestId(`widget-tree-node-${pathKey}`);
      await userEvent.click(within(node).getByRole('button'));
    };

    await expect(canvas.getByTestId('widget-tree-workbench')).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-lab-data-pane')).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-lab-render-pane')).toBeVisible();
    await waitForWidgetTreeSourcePane(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Design' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByTestId('widget-tree-side-panel')).toBeVisible();
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Widget Tree');

    await clickOutlineNode('$');

    await userEvent.click(canvas.getByRole('button', { name: 'Assets' }));
    await expect(canvas.getByTestId('widget-tree-asset-palette')).toBeVisible();
    await userEvent.click(canvas.getByTestId('widget-asset-content.body'));

    await userEvent.click(canvas.getByRole('button', { name: 'Outline' }));
    await clickOutlineNode('$.children[0]');

    await userEvent.click(canvas.getByRole('button', { name: 'Props' }));
    await expect(canvas.getByTestId('widget-tree-inspector-panel')).toBeVisible();
    await waitFor(() => expect(canvas.getByDisplayValue('Widget Tree')).toBeVisible());

    const contentInput = canvas.getByDisplayValue('Widget Tree');
    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, 'Hello');

    await waitFor(() =>
      expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Hello'),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Outline' }));
    await expect(canvas.getByTestId('widget-tree-node-$.children[0]')).toHaveTextContent(/Hello/);
  },
};
