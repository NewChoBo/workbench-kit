import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import '../styles.css';
import { Field } from '../primitives/field';
import { Select } from '../primitives/select';
import { TextInput } from '../primitives/text-input';
import { StoryEventLog } from '../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { WorkbenchPropertyOverrideLabel } from './WorkbenchPropertyOverrideLabel';

const meta = {
  title: 'React/Workbench/Property Override Label',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <PropertyOverrideLabelHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const OverrideStates: Story = {
  name: 'Override states',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Default')).toBeInTheDocument();
    await expect(canvas.getByText('Custom')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Reset' })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
    await expect(canvas.getByRole('status', { name: 'Override event log' })).toHaveTextContent(
      'Timezone reset',
    );
  },
  tags: ['storybook-play-required'],
};

function PropertyOverrideLabelHarness() {
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [timezoneOverridden, setTimezoneOverridden] = useState(true);
  const [locale, setLocale] = useState('en-US');
  const [status, setStatus] = useState('Ready');

  return (
    <StoryWorkbenchShellFrame variant="settings">
      <form
        aria-label="Property override label story surface"
        className="ui-story-settings-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field
          description="Overridden sparse value with Reset affordance."
          htmlFor="story-override-timezone"
          label={
            <WorkbenchPropertyOverrideLabel
              label="Timezone"
              overridden={timezoneOverridden}
              onReset={() => {
                setTimezone('UTC');
                setTimezoneOverridden(false);
                setStatus('Timezone reset');
              }}
            />
          }
        >
          <Select
            controlWidth="full"
            id="story-override-timezone"
            value={timezone}
            onValueChange={(value) => {
              setTimezone(value);
              setTimezoneOverridden(value !== 'UTC');
              setStatus(`Timezone → ${value}`);
            }}
          >
            <option value="UTC">UTC</option>
            <option value="Asia/Seoul">Asia/Seoul</option>
            <option value="America/New_York">America/New_York</option>
          </Select>
        </Field>

        <Field
          description="Still at the content default — muted badge, no Reset."
          htmlFor="story-override-locale"
          label={<WorkbenchPropertyOverrideLabel label="Locale" overridden={false} />}
        >
          <TextInput
            controlWidth="full"
            id="story-override-locale"
            value={locale}
            onValueChange={setLocale}
          />
        </Field>

        <StoryEventLog aria-label="Override event log" compact>
          {status}
        </StoryEventLog>
      </form>
    </StoryWorkbenchShellFrame>
  );
}
