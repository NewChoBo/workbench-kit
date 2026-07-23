import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { JdwSampleScreenExplorer } from './JdwSampleScreenExplorer.js';

const meta = {
  title: 'JDW/WidgetTree/Template Scaffold',
  component: JdwSampleScreenExplorer,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof JdwSampleScreenExplorer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CompileThenAuthor: Story = {
  name: 'Compile then author',
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('jdw-sample-screen-select')).toBeInTheDocument();
    await expect(canvas.getByTestId('widget-tree-lab')).toBeInTheDocument();
    await expect(canvas.getByTestId('widget-asset-screen-spec.text')).toBeInTheDocument();
    await expect(canvas.queryByTestId('screen-spec-editor')).not.toBeInTheDocument();
  },
};
