import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../primitives/Button';
import { WorkbenchConfirmationFlow, type WorkbenchConfirmationAction } from './ConfirmationFlow';

const meta = {
  title: 'React/Workbench/ConfirmationFlow',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const confirmationActions: Record<string, WorkbenchConfirmationAction> = {
  asyncExport: {
    confirmLabel: 'Start export',
    detail: <code>external target</code>,
    id: 'async-export',
    message: 'Start this external side-effect action?',
    pendingLabel: 'Exporting...',
    sideEffect: 'external-write',
    title: 'Run External Action',
  },
  deleteArtifact: {
    confirmLabel: 'Delete',
    danger: true,
    detail: <code>artifacts/summary.md</code>,
    id: 'delete-artifact',
    message: 'Delete this generated artifact?',
    sideEffect: 'workspace-write',
    title: 'Delete Artifact',
  },
  disabledAction: {
    confirmLabel: 'Apply',
    disabled: true,
    disabledReason: 'Confirmation is unavailable until the current operation finishes.',
    id: 'disabled-action',
    message: 'Apply this unavailable action?',
    title: 'Unavailable Action',
  },
  saveDraft: {
    confirmLabel: 'Save',
    detail: <code>draft.md</code>,
    id: 'save-draft',
    message: 'Save this draft before closing?',
    sideEffect: 'workspace-write',
    title: 'Save Draft',
  },
};

function ConfirmationFlowHarness() {
  const [activeActionId, setActiveActionId] = useState<string | null>('saveDraft');
  const [eventLog, setEventLog] = useState('Ready');
  const activeAction = activeActionId ? confirmationActions[activeActionId] : null;

  return (
    <div className="ui-workbench-confirmation-story">
      <div className="ui-workbench-confirmation-story__toolbar">
        <Button onClick={() => setActiveActionId('saveDraft')}>Open default confirm</Button>
        <Button variant="danger" onClick={() => setActiveActionId('deleteArtifact')}>
          Open danger confirm
        </Button>
        <Button onClick={() => setActiveActionId('asyncExport')}>Open async confirm</Button>
        <Button onClick={() => setActiveActionId('disabledAction')}>Open disabled confirm</Button>
      </div>
      <div aria-label="Confirmation flow event log" role="status">
        {eventLog}
      </div>
      <WorkbenchConfirmationFlow
        action={activeAction}
        onCancel={(action) => {
          setEventLog(`Cancelled ${action.id}`);
          setActiveActionId(null);
        }}
        onClose={(action) => {
          setEventLog(`Closed ${action.id}`);
          setActiveActionId(null);
        }}
        onConfirm={async (action) => {
          setEventLog(`Confirming ${action.id}`);
          if (action.id === 'async-export') {
            await new Promise((resolve) => window.setTimeout(resolve, 80));
          }
          setEventLog(`Confirmed ${action.id}`);
          setActiveActionId(null);
        }}
      />
    </div>
  );
}

export const FlowStates: Story = {
  render: () => <ConfirmationFlowHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Confirmation flow event log');

    await expect(canvas.getByRole('dialog', { name: /Save Draft/ })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(eventLog).toHaveTextContent('Confirmed save-draft');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Open danger confirm' }));
    await expect(canvas.getByRole('dialog', { name: /Delete Artifact/ })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(eventLog).toHaveTextContent('Cancelled delete-artifact');

    await userEvent.click(canvas.getByRole('button', { name: 'Open async confirm' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Start export' }));
    await expect(canvas.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    await expect(eventLog).toHaveTextContent('Confirming async-export');
    await waitFor(() => expect(eventLog).toHaveTextContent('Confirmed async-export'));

    await userEvent.click(canvas.getByRole('button', { name: 'Open disabled confirm' }));
    await expect(canvas.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await expect(
      canvas.getByText('Confirmation is unavailable until the current operation finishes.'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Close confirmation' }));
    await expect(eventLog).toHaveTextContent('Closed disabled-action');
  },
  tags: ['storybook-play-baseline'],
};

export const DefaultConfirm: Story = {
  render: () => <ConfirmationFlowHarness />,
};

export const DangerConfirm: Story = {
  render: () => (
    <div className="ui-workbench-confirmation-story">
      <WorkbenchConfirmationFlow
        action={confirmationActions.deleteArtifact}
        onCancel={() => undefined}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const AsyncPending: Story = {
  render: () => (
    <div className="ui-workbench-confirmation-story">
      <WorkbenchConfirmationFlow
        action={confirmationActions.asyncExport}
        pending
        onCancel={() => undefined}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};

export const DisabledConfirm: Story = {
  render: () => (
    <div className="ui-workbench-confirmation-story">
      <WorkbenchConfirmationFlow
        action={confirmationActions.disabledAction}
        onCancel={() => undefined}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  ),
};
