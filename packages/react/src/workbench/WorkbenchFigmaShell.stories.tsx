import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkbenchFigmaShell } from './WorkbenchFigmaShell';

const meta = {
  title: 'React/Workbench/Shell/FigmaShell',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <WorkbenchFigmaShell />,
};

