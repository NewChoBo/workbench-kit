import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { useWorkbenchNotice, WorkbenchNoticeProvider } from '../../workbench/management';
import { StoryWorkbenchShellFrame } from '../../workbench/story/StoryWorkbenchShellFrame';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Field } from '../field';
import { IconButton } from '../icon-button';
import { NumberInput } from '../number-input';
import { Select } from '../select';
import { TextArea } from '../text-area';
import { TextInput } from '../text-input';

const meta = {
  title: 'Atomic UI/Controls/Form Controls',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Foundational input and action primitives for dense settings and form surfaces. Reuse these controls before introducing host-specific markup.',
      },
    },
    storybookGrid: { enabled: false },
  },
  render: () => (
    <WorkbenchNoticeProvider>
      <ControlsForm />
    </WorkbenchNoticeProvider>
  ),
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
    await expect(canvas.getByRole('status')).toHaveTextContent('Reload requested');
  },
  tags: ['storybook-play-required'],
};

function ControlsForm() {
  const notice = useWorkbenchNotice();
  const showNotice = (message: string, tone: 'info' | 'success' | 'warning') =>
    notice.showNotice({ durationMs: 0, message, tone });
  const [projectName, setProjectName] = useState('Sample workspace');
  const [retryCount, setRetryCount] = useState(2);
  const [reviewScope, setReviewScope] = useState('changed');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [notes, setNotes] = useState('Use Storybook for stable UI regression checks.');

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
          <Button
            icon="codicon-check"
            variant="primary"
            onClick={() => showNotice('Saved', 'success')}
          >
            Save
          </Button>
          <Button variant="danger" onClick={() => showNotice('Discarded', 'warning')}>
            Discard
          </Button>
          <IconButton
            icon="codicon-refresh"
            label="Reload controls"
            onClick={() => showNotice('Reload requested', 'info')}
          />
        </div>
      </form>
    </StoryWorkbenchShellFrame>
  );
}
