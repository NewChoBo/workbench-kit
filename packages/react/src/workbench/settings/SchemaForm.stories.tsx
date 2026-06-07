import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { WorkbenchSettingsModal } from './WorkbenchSettingsModal';
import { WorkbenchSettingsSection } from './WorkbenchSettingsSection';
import {
  WorkbenchSchemaForm,
  getWorkbenchSchemaFormErrors,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormField,
  type WorkbenchSchemaFormValues,
} from './SchemaForm';
import type { WorkbenchSettingsCategory } from './types';

const meta = {
  title: 'React/Workbench/Settings/SchemaForm',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const settingsFields: WorkbenchSchemaFormField[] = [
  {
    defaultValue: 'Workbench Kit',
    description: 'Shown in generic workspace surfaces.',
    id: 'displayName',
    label: 'Display name',
    required: true,
    type: 'text',
  },
  {
    defaultValue: 'comfortable',
    description: 'Adjusts row spacing for dense work surfaces.',
    id: 'density',
    label: 'Density',
    options: [
      { label: 'Comfortable', value: 'comfortable' },
      { label: 'Compact', value: 'compact' },
      { label: 'Expanded', value: 'expanded' },
    ],
    type: 'select',
  },
  {
    defaultValue: true,
    description: 'Require confirmation before actions with side effects.',
    id: 'confirmSideEffects',
    label: 'Confirm before side effects',
    type: 'checkbox',
  },
  {
    defaultValue: 12,
    description: 'Controls how many recent entries remain visible.',
    id: 'maxRecentItems',
    label: 'Maximum recent items',
    min: 1,
    step: 1,
    type: 'number',
    validate: (value) =>
      typeof value === 'number' && value < 1 ? 'Use a value greater than zero.' : undefined,
  },
];

const categories: WorkbenchSettingsCategory[] = [
  { id: 'general', label: 'General' },
  { id: 'readonly', label: 'Read-only' },
  { id: 'validation', label: 'Validation' },
];

function SchemaFormHarness({ initialCategoryId = 'general' }: { initialCategoryId?: string }) {
  const initialValues = useMemo(() => normalizeWorkbenchSchemaFormValues(settingsFields), []);
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId);
  const [values, setValues] = useState<WorkbenchSchemaFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<WorkbenchSchemaFormValues>(initialValues);
  const [eventLog, setEventLog] = useState('Ready');
  const errors = getWorkbenchSchemaFormErrors(settingsFields, values);
  const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

  return (
    <div className="workbench-story-shell" style={{ minHeight: 680 }}>
      <div style={{ padding: 20 }}>
        <div aria-label="Schema form event log" role="status">
          {eventLog}
        </div>
      </div>
      <WorkbenchSettingsModal
        activeCategoryId={activeCategoryId}
        categories={categories}
        footer={
          <>
            <Badge variant={dirty ? 'accent' : 'muted'}>{dirty ? 'Unsaved' : 'Saved'}</Badge>
            <span className="workbench-settings-footer__spacer" />
            <Button onClick={() => setEventLog('Settings closed')}>Close</Button>
          </>
        }
        showSearch={false}
        title="Settings"
        onActiveCategoryIdChange={setActiveCategoryId}
        onClose={() => setEventLog('Settings closed')}
        renderCategory={(category) => {
          if (category.id === 'readonly') {
            return (
              <WorkbenchSettingsSection
                id="schema-form-readonly"
                description="The same schema can render without allowing edits."
                title="Read-only Settings"
              >
                <WorkbenchSchemaForm
                  fields={settingsFields}
                  readOnly
                  values={savedValues}
                  onCancel={() => setEventLog('Read-only cancel')}
                />
              </WorkbenchSettingsSection>
            );
          }

          if (category.id === 'validation') {
            return (
              <WorkbenchSettingsSection
                id="schema-form-validation"
                description="Validation messages are computed from field metadata."
                title="Validation"
              >
                <WorkbenchSchemaForm
                  fields={settingsFields}
                  values={{ ...values, displayName: '', maxRecentItems: 0 }}
                  onCancel={() => setEventLog('Validation cancel')}
                />
              </WorkbenchSettingsSection>
            );
          }

          return (
            <WorkbenchSettingsSection
              id="schema-form-general"
              description="Values are owned by the consumer and submitted through callbacks."
              title="General"
            >
              <WorkbenchSchemaForm
                errors={errors}
                fields={settingsFields}
                values={values}
                onCancel={() => {
                  setValues(savedValues);
                  setEventLog('Cancelled schema form');
                }}
                onSubmit={(nextValues) => {
                  setSavedValues(nextValues);
                  setEventLog(`Submitted ${nextValues.displayName}`);
                }}
                onValuesChange={(nextValues) => {
                  setValues(nextValues);
                  setEventLog('Changed schema form');
                }}
              />
            </WorkbenchSettingsSection>
          );
        }}
      />
    </div>
  );
}

export const EditableSettings: Story = {
  render: () => <SchemaFormHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Schema form event log');

    const displayName = canvas.getByRole('textbox', { name: 'Display name' });
    await userEvent.clear(displayName);
    await expect(canvas.getByText('This field is required.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(displayName, 'Workbench');
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Density' }), 'compact');
    await userEvent.clear(canvas.getByRole('spinbutton', { name: 'Maximum recent items' }));
    await userEvent.type(canvas.getByRole('spinbutton', { name: 'Maximum recent items' }), '8');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Confirm before side effects' }));
    await expect(eventLog).toHaveTextContent('Changed schema form');

    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(eventLog).toHaveTextContent('Submitted Workbench');
  },
  tags: ['storybook-play-baseline'],
};

export const ReadOnlyForm: Story = {
  render: () => <SchemaFormHarness initialCategoryId="readonly" />,
};

export const ValidationMessages: Story = {
  render: () => <SchemaFormHarness initialCategoryId="validation" />,
};

export const EmptySchema: Story = {
  render: () => (
    <div className="workbench-story-shell" style={{ minHeight: 360, padding: 24 }}>
      <WorkbenchSchemaForm fields={[]} />
    </div>
  ),
};
