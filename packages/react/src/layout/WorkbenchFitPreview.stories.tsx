import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import '../styles.css';
import { WorkbenchFitPreview } from './WorkbenchFitPreview';

const meta = {
  title: 'Workbench UI/Layout/Fit Preview',
  component: WorkbenchFitPreview,
  parameters: { storybookGrid: { enabled: false }, fitPreviewSize: { width: 180, height: 88 } },
  args: {
    contentWidth: 608,
    contentHeight: 368,
    label: 'Fit overview of saved content',
    fallback: 'Overview unavailable',
    children: (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: 'var(--color-surface)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 24,
            width: 240,
            height: 160,
            background: 'var(--color-primary, #4685cf)',
          }}
        >
          First panel
        </div>
        <button style={{ position: 'absolute', left: 288, top: 24, width: 320, height: 220 }}>
          Inert action
        </button>
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 208,
            width: 240,
            height: 160,
            background: 'var(--color-success, #398b71)',
          }}
        >
          Third panel
        </div>
      </div>
    ),
  },
  decorators: [
    (Story, context) => (
      <div style={context.parameters.fitPreviewSize as { width: number; height: number }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkbenchFitPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = {
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const summary = within(canvasElement).getByRole('img');
    await waitFor(() => expect(summary).toHaveAttribute('data-fit-state', 'ready'));
    await expect(summary.querySelector('[inert]')).not.toBeNull();
  },
};
export const Small: Story = {
  parameters: { fitPreviewSize: { width: 72, height: 52 } },
};
export const HugeExtentFallback: Story = { args: { contentWidth: 1e20 } };
