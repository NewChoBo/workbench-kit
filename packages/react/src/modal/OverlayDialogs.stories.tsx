import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../primitives/button';
import { ContextMenu, type ContextMenuItem } from '../overlay/ContextMenu';
import { useContextMenuState } from '../overlay/useContextMenuState';
import { StoryEventLog } from '../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Atomic UI/Overlays/Dialog Actions',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Fixed overlay mechanics for confirmation and context actions. Hosts keep decision copy and final side effects.',
      },
    },
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
    await expect(menu).toHaveAttribute('data-has-icons', 'false');
    await expect(menu).toHaveAttribute('data-has-shortcuts', 'true');
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

export const ContextMenuColumnLayouts: Story = {
  name: 'Context menu column layouts',
  render: () => <ContextMenuColumnLayoutHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Open label-only menu' }));
    const labelOnly = await within(document.body).findByRole('menu', { name: 'Label only' });
    await expect(labelOnly).toHaveAttribute('data-has-icons', 'false');
    await expect(labelOnly).toHaveAttribute('data-has-shortcuts', 'false');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(canvas.getByRole('button', { name: 'Open icon menu' }));
    const withIcons = await within(document.body).findByRole('menu', { name: 'With icons' });
    await expect(withIcons).toHaveAttribute('data-has-icons', 'true');
    await expect(withIcons).toHaveAttribute('data-has-shortcuts', 'false');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(canvas.getByRole('button', { name: 'Open icon and shortcut menu' }));
    const withBoth = await within(document.body).findByRole('menu', {
      name: 'With icons and shortcuts',
    });
    await expect(withBoth).toHaveAttribute('data-has-icons', 'true');
    await expect(withBoth).toHaveAttribute('data-has-shortcuts', 'true');
  },
  tags: ['storybook-play-required'],
};

export const ContextMenuPointerState: Story = {
  name: 'Context menu pointer state',
  render: () => <ContextMenuPointerStateHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = canvas.getByRole('button', { name: 'Library item' });

    fireEvent.contextMenu(target, { clientX: 160, clientY: 180 });
    const menu = await within(document.body).findByRole('menu', { name: 'Library item menu' });
    await expect(menu).toHaveAttribute('data-has-icons', 'false');
    await expect(menu).toHaveAttribute('data-has-shortcuts', 'false');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Open' }));
    await waitFor(() =>
      expect(within(document.body).queryByRole('menu', { name: 'Library item menu' })).toBeNull(),
    );
    await expect(canvas.getByRole('status', { name: 'Pointer menu event log' })).toHaveTextContent(
      'Opened library-item',
    );

    fireEvent.contextMenu(target, { clientX: 160, clientY: 180 });
    const escapeMenu = await within(document.body).findByRole('menu', {
      name: 'Library item menu',
    });
    await waitFor(() =>
      expect(within(escapeMenu).getByRole('menuitem', { name: 'Open' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(within(document.body).queryByRole('menu', { name: 'Library item menu' })).toBeNull(),
    );
    await expect(target).toHaveFocus();
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

function ContextMenuColumnLayoutHarness() {
  const [activeMenu, setActiveMenu] = useState<'label' | 'icons' | 'both' | null>(null);

  const labelOnlyItems: ContextMenuItem[] = [
    { id: 'open', label: 'Open content', onSelect: () => undefined },
    { id: 'duplicate', label: 'Duplicate content', onSelect: () => undefined },
  ];

  const iconItems: ContextMenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      icon: 'codicon-folder-opened',
      onSelect: () => undefined,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'codicon-trash',
      onSelect: () => undefined,
    },
  ];

  const bothItems: ContextMenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      icon: 'codicon-folder-opened',
      shortcut: 'Enter',
      onSelect: () => undefined,
    },
    {
      id: 'inspect',
      label: 'Inspect a very long label that should ellipsis inside the menu',
      icon: 'codicon-info',
      shortcut: 'Ctrl+I',
      onSelect: () => undefined,
    },
  ];

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div className="ui-story-overlay-anchor" aria-label="Context menu layout surface">
        <Button onClick={() => setActiveMenu('label')}>Open label-only menu</Button>
        <Button onClick={() => setActiveMenu('icons')}>Open icon menu</Button>
        <Button onClick={() => setActiveMenu('both')}>Open icon and shortcut menu</Button>
      </div>

      {activeMenu === 'label' ? (
        <ContextMenu
          ariaLabel="Label only"
          items={labelOnlyItems}
          x={140}
          y={160}
          onClose={() => setActiveMenu(null)}
        />
      ) : null}
      {activeMenu === 'icons' ? (
        <ContextMenu
          ariaLabel="With icons"
          items={iconItems}
          x={140}
          y={160}
          onClose={() => setActiveMenu(null)}
        />
      ) : null}
      {activeMenu === 'both' ? (
        <ContextMenu
          ariaLabel="With icons and shortcuts"
          items={bothItems}
          x={140}
          y={160}
          onClose={() => setActiveMenu(null)}
        />
      ) : null}
    </StoryWorkbenchShellFrame>
  );
}

function ContextMenuPointerStateHarness() {
  const menu = useContextMenuState<'library-item'>();
  const [returnFocusTarget, setReturnFocusTarget] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState('Ready');

  const items: ContextMenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      onSelect: () => setStatus(`Opened ${menu.state?.target ?? 'unknown'}`),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onSelect: () => setStatus(`Duplicated ${menu.state?.target ?? 'unknown'}`),
    },
  ];

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div className="ui-story-overlay-anchor" aria-label="Pointer state story surface">
        <Button
          type="button"
          onContextMenu={(event) => {
            setReturnFocusTarget(event.currentTarget);
            menu.open(event, 'library-item');
          }}
        >
          Library item
        </Button>
      </div>
      <StoryEventLog aria-label="Pointer menu event log" compact>
        {status}
      </StoryEventLog>
      {menu.state ? (
        <ContextMenu
          ariaLabel="Library item menu"
          items={items}
          returnFocusTarget={returnFocusTarget}
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
        />
      ) : null}
    </StoryWorkbenchShellFrame>
  );
}
