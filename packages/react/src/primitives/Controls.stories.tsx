import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog } from '../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { Button, Checkbox, Field, IconButton, NumberInput, Select, TextArea, TextInput } from '.';

const meta = {
  title: 'React/Primitives/Controls',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <ControlsHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormControls: Story = {
  name: 'Form controls',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const projectInput = canvas.getByLabelText('Project name');
    await userEvent.clear(projectInput);
    await userEvent.type(projectInput, 'Workbench Kit');
    await expect(projectInput).toHaveValue('Workbench Kit');

    const retryInput = canvas.getByLabelText('Retry count');
    await userEvent.click(retryInput);
    await userEvent.keyboard('{Control>}a{/Control}5');
    await expect(retryInput).toHaveValue(5);

    const syncCheckbox = canvas.getByLabelText('Enable sync');
    await userEvent.click(syncCheckbox);
    await expect(syncCheckbox).toBeChecked();

    const scopeSelect = canvas.getByRole('combobox', { name: 'Review scope' });
    await userEvent.click(scopeSelect);
    await userEvent.click(await within(document.body).findByRole('option', { name: 'Critical' }));
    await expect(scopeSelect).toHaveTextContent('Critical');

    await userEvent.click(canvas.getByRole('button', { name: 'Reload controls' }));
    await expect(canvas.getByRole('status', { name: 'Control event log' })).toHaveTextContent(
      'Reload requested',
    );
  },
  tags: ['storybook-play-required'],
};

function ControlsHarness() {
  const [projectName, setProjectName] = useState('Sample workspace');
  const [retryCount, setRetryCount] = useState(2);
  const [reviewScope, setReviewScope] = useState('changed');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [notes, setNotes] = useState('Use Storybook for stable UI regression checks.');
  const [status, setStatus] = useState('Ready');

  return (
    <StoryWorkbenchShellFrame variant="settings">
      <form
        aria-label="Control story surface"
        className="ui-story-settings-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field
          description="A controlled text input used by shell forms."
          htmlFor="story-project-name"
          label="Project name"
        >
          <TextInput
            controlWidth="full"
            id="story-project-name"
            value={projectName}
            onValueChange={setProjectName}
          />
        </Field>

        <Field htmlFor="story-retry-count" label="Retry count">
          <NumberInput
            controlWidth="full"
            id="story-retry-count"
            min={0}
            value={retryCount}
            onValueChange={setRetryCount}
          />
        </Field>

        <Field label="Review scope">
          <Select
            aria-label="Review scope"
            controlWidth="full"
            value={reviewScope}
            onValueChange={setReviewScope}
          >
            <option value="changed">Changed files</option>
            <option value="workspace">Workspace</option>
            <option value="critical">Critical</option>
          </Select>
        </Field>

        <Checkbox checked={syncEnabled} label="Enable sync" onCheckedChange={setSyncEnabled} />

        <Field htmlFor="story-notes" label="Notes">
          <TextArea
            controlWidth="full"
            id="story-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
        </Field>

        <div className="ui-story-settings-form__actions">
          <Button icon="codicon-check" variant="primary" onClick={() => setStatus('Saved')}>
            Save
          </Button>
          <Button variant="danger" onClick={() => setStatus('Discarded')}>
            Discard
          </Button>
          <IconButton
            icon="codicon-refresh"
            label="Reload controls"
            onClick={() => setStatus('Reload requested')}
          />
        </div>

        <StoryEventLog aria-label="Control event log" compact>
          {status}
        </StoryEventLog>
      </form>
    </StoryWorkbenchShellFrame>
  );
}
