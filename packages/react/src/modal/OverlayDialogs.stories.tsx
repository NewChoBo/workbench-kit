import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../primitives/Button';
import { ContextMenu, type ContextMenuItem } from '../overlay/ContextMenu';
import { StoryEventLog } from '../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'React/Overlay/Dialog Actions',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <OverlayDialogHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmationAndContextMenu: Story = {
  name: 'Confirmation and context menu',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Open confirmation' }));
    const dialog = await within(document.body).findByRole('dialog', {
      name: 'Delete selected file?',
    });
    await expect(dialog).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        within(document.body).queryByRole('dialog', { name: 'Delete selected file?' }),
      ).toBeNull(),
    );
    await expect(canvas.getByRole('status', { name: 'Overlay event log' })).toHaveTextContent(
      'Cancelled delete',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Open confirmation' }));
    const confirmDialog = await within(document.body).findByRole('dialog', {
      name: 'Delete selected file?',
    });
    await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete file' }));
    await expect(canvas.getByRole('status', { name: 'Overlay event log' })).toHaveTextContent(
      'Confirmed delete',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Open component menu' }));
    const menu = await within(document.body).findByRole('menu', { name: 'Component actions' });
    await expect(within(menu).getByRole('menuitem', { name: /Install/ })).toBeDisabled();
    await userEvent.click(within(menu).getByRole('menuitem', { name: /Inspect/ }));
    await waitFor(() =>
      expect(within(document.body).queryByRole('menu', { name: 'Component actions' })).toBeNull(),
    );
    await expect(canvas.getByRole('status', { name: 'Overlay event log' })).toHaveTextContent(
      'Selected inspect',
    );
  },
  tags: ['storybook-play-required'],
};

function OverlayDialogHarness() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState('Ready');

  const menuItems: ContextMenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      shortcut: 'Enter',
      onSelect: () => setStatus('Selected open'),
    },
    {
      id: 'install',
      label: 'Install',
      disabled: true,
      onSelect: () => setStatus('Selected install'),
    },
    { id: 'separator', type: 'separator' },
    {
      id: 'inspect',
      label: 'Inspect',
      shortcut: 'Ctrl+Shift+I',
      onSelect: () => setStatus('Selected inspect'),
    },
  ];

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div className="ui-story-overlay-anchor" aria-label="Overlay story surface">
        <Button onClick={() => setConfirmOpen(true)}>Open confirmation</Button>
        <Button onClick={() => setMenuOpen(true)}>Open component menu</Button>
      </div>

      <div aria-label="Overlay reference surface" role="region" />

      <StoryEventLog aria-label="Overlay event log" compact>
        {status}
      </StoryEventLog>

      {confirmOpen ? (
        <ConfirmDialog
          confirmLabel="Delete file"
          message="This action removes the selected file from the workspace."
          title="Delete selected file?"
          variant="danger"
          onCancel={() => {
            setStatus('Cancelled delete');
            setConfirmOpen(false);
          }}
          onConfirm={() => {
            setStatus('Confirmed delete');
            setConfirmOpen(false);
          }}
        />
      ) : null}

      {menuOpen ? (
        <ContextMenu
          ariaLabel="Component actions"
          items={menuItems}
          x={160}
          y={180}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </StoryWorkbenchShellFrame>
  );
}
