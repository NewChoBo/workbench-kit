import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ExtensionManagementSidebar } from './ExtensionManagementSidebar';

const pendingExtensionId = 'workbench-kit.samples.json-preview';

const meta = {
  args: {
    browseEntries: [],
    defaultTab: 'installed',
    installedEntries: [
      {
        canUninstall: true,
        category: 'editor',
        description: 'Adds a preview for JSON workspace files.',
        displayName: 'JSON Preview',
        enabled: true,
        id: pendingExtensionId,
        source: 'installed',
      },
    ],
    onToggleEnabled: () => undefined,
    onUninstall: () => undefined,
  },
  component: ExtensionManagementSidebar,
  parameters: {
    layout: 'fullscreen',
  },
  title: 'Workbench UI/Management/Extension Sidebar',
} satisfies Meta<typeof ExtensionManagementSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UninstallPending: Story = {
  args: {
    pendingUninstallEntryId: pendingExtensionId,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Reloading…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Disable' })).toBeDisabled();
  },
  tags: ['storybook-play-required'],
};
