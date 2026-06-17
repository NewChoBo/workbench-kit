import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContextMenu } from '../overlay/ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'React/Overlays',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmationDialog: Story = {
  render: () => (
    <div style={{ minHeight: 360, background: 'var(--color-bg)' }}>
      <ConfirmDialog
        title="Confirm Action"
        message="This dialog is rendered by the shared React package."
        detail={<code>@workbench-kit/react</code>}
        confirmLabel="Looks good"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const ConfirmationDialogDisabled: Story = {
  render: () => (
    <div style={{ minHeight: 360, background: 'var(--color-bg)' }}>
      <ConfirmDialog
        title="Unavailable Action"
        message="The confirm action stays disabled until the host clears the blocking state."
        confirmDisabled
        confirmLabel="Apply"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const ConfirmationDialogPending: Story = {
  render: () => (
    <div style={{ minHeight: 360, background: 'var(--color-bg)' }}>
      <ConfirmDialog
        title="Saving Changes"
        message="The host can keep the dialog open while an async side effect runs."
        confirmPending
        confirmLabel="Save"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const ConfirmationDialogDanger: Story = {
  render: () => (
    <div style={{ minHeight: 360, background: 'var(--color-bg)' }}>
      <ConfirmDialog
        title="Delete Artifact"
        message="Delete this generated artifact?"
        detail={<code>artifacts/summary.md</code>}
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const Menu: Story = {
  render: () => (
    <div style={{ minHeight: 320, background: 'var(--color-bg)' }}>
      <ContextMenu
        x={32}
        y={32}
        onClose={() => undefined}
        items={[
          {
            id: 'open',
            label: 'Open',
            icon: 'codicon-folder-opened',
            shortcut: 'Enter',
            onSelect: () => undefined,
          },
          {
            id: 'rename',
            label: 'Rename',
            icon: 'codicon-edit',
            shortcut: 'F2',
            onSelect: () => undefined,
          },
          { type: 'separator' },
          {
            id: 'delete',
            label: 'Delete',
            icon: 'codicon-trash',
            danger: true,
            onSelect: () => undefined,
          },
        ]}
      />
    </div>
  ),
};
