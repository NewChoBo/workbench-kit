import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { waitForWidgetTreeSourcePane } from './widget-tree-play-helpers.js';
import { WidgetTreeWorkspaceShell } from './WidgetTreeWorkspaceShell.js';

const meta = {
  title: 'JDW/WidgetTree/Workbench',
  parameters: {
    fullHeightShell: '100vh',
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Minimal Workbench Kit shell for JDW widget authoring: Explorer sidebar + editor tabs. Widget documents open in the data/render panel layout.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const WorkspaceShell: Story = {
  name: 'Workspace Shell',
  render: () => <WidgetTreeWorkspaceShell />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('jdw-workspace-shell')).toBeVisible();
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-workbench')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Design' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByTestId('widget-tree-lab-data-pane')).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-lab-render-pane')).toBeVisible();
    await waitForWidgetTreeSourcePane(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Widget Tree');
    await expect(canvas.getByRole('tab', { name: 'home.widget.json' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

export const WorkspaceShellInteraction: Story = {
  name: 'Workspace Shell / Interaction',
  render: () => <WidgetTreeWorkspaceShell />,
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const clickOutlineNode = async (pathKey: string) => {
      const node = canvas.getByTestId(`widget-tree-node-${pathKey}`);
      await userEvent.click(within(node).getByRole('button'));
    };

    await expect(canvas.getByTestId('jdw-workspace-shell')).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-lab-data-pane')).toBeVisible();
    await expect(canvas.getByTestId('widget-tree-lab-render-pane')).toBeVisible();
    await waitForWidgetTreeSourcePane(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Widget Tree');

    await clickOutlineNode('$');
    await userEvent.click(canvas.getByRole('button', { name: 'Assets' }));
    await userEvent.click(canvas.getByTestId('widget-asset-content.body'));
    await userEvent.click(canvas.getByRole('button', { name: 'Outline' }));
    await clickOutlineNode('$.children[0]');
    await userEvent.click(canvas.getByRole('button', { name: 'Props' }));

    const contentInput = canvas.getByDisplayValue('Widget Tree');
    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, 'Hello');

    await waitFor(() =>
      expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Hello'),
    );
  },
};
