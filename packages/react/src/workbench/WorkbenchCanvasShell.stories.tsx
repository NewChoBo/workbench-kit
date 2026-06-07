import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkbenchCanvasShell } from './WorkbenchCanvasShell';

const meta = {
  title: 'React/Workbench/Shell/CanvasShell',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <WorkbenchCanvasShell />,
};

