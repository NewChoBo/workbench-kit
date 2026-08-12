import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '../../styles.css';
import { IntegratedShellDemo } from '../demo';
import { StoryWorkbenchShellFrame } from '../story/StoryWorkbenchShellFrame';

const meta = {
  title: 'Workbench UI/Shell',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const IntegratedShell: Story = {
  tags: ['storybook-play-baseline'],
  parameters: {
    docs: {
      description: {
        story:
          'Reference host for explorer, search, chat, editor, and settings. Primary sidebar width is controlled in pixels through `WorkbenchStandaloneShell`.',
      },
    },
  },
  render: () => (
    <StoryWorkbenchShellFrame fill variant="editor">
      <IntegratedShellDemo compactRows initialActivityId="explorer" initialTheme="dark" />
    </StoryWorkbenchShellFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByLabelText('Primary sidebar')).toBeVisible();

    const primarySplit = canvasElement.querySelector('.ui-workbench-story-shell-split');
    const separator = primarySplit?.querySelector('.ui-workbench-split-view__separator');
    expect(primarySplit).toHaveAttribute('data-primary-size-unit', 'pixels');
    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute('aria-valuenow', '260');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog');
    await expect(settingsDialog).toBeVisible();

    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Workbench' }));
    const widthInput = within(settingsDialog).getByLabelText('Primary sidebar width');
    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, '320');

    await waitFor(() => {
      expect(separator).toHaveAttribute('aria-valuenow', '320');
    });
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Cancel' }));
  },
};
