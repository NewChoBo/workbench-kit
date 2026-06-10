import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { JdwPreview } from '../jdw/JdwPreview.js';
import {
  JDW_FIXTURE_COLUMN_TEXT,
  JDW_FIXTURE_GRID_CELLS,
  JDW_FIXTURE_ROW_FLEX,
} from './fixtures/jdw-fixtures.js';

const meta = {
  title: 'JDW/Fixtures',
  component: JdwPreview,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof JdwPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ColumnText: Story = {
  args: {
    json: JDW_FIXTURE_COLUMN_TEXT,
  },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Hello JDW');
  },
};

export const RowFlex: Story = {
  args: {
    json: JDW_FIXTURE_ROW_FLEX,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Left');
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('flex 2');
  },
};

export const GridCells: Story = {
  args: {
    json: JDW_FIXTURE_GRID_CELLS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Wide');
  },
};
