import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import {
  WorkbenchStructuredDataForm,
  normalizeWorkbenchStructuredDataFormData,
  type WorkbenchStructuredDataFormSection,
  type WorkbenchStructuredDataRecord,
} from './StructuredDataForm';

const meta = {
  title: 'React/Workbench/StructuredDataForm',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sections: WorkbenchStructuredDataFormSection[] = [
  {
    description: 'Generic nested values are read and written through path metadata.',
    fields: [
      {
        defaultValue: 'Workbench Kit',
        description: 'Shown in shared workspace chrome.',
        id: 'profileName',
        label: 'Profile name',
        path: ['profile', 'name'],
        required: true,
        type: 'text',
      },
      {
        defaultValue: 'comfortable',
        description: 'Controls spacing for repeated workbench rows.',
        id: 'density',
        label: 'Density',
        options: [
          { label: 'Comfortable', value: 'comfortable' },
          { label: 'Compact', value: 'compact' },
          { label: 'Expanded', value: 'expanded' },
        ],
        path: ['preferences', 'density'],
        type: 'select',
      },
      {
        defaultValue: true,
        description: 'Require confirmation before generic side-effect actions.',
        id: 'confirmSideEffects',
        label: 'Confirm side effects',
        path: ['permissions', 'confirmSideEffects'],
        type: 'checkbox',
      },
      {
        defaultValue: 12,
        description: 'Controls how many recent entries remain visible.',
        id: 'maxRecentItems',
        label: 'Maximum recent items',
        min: 1,
        path: ['preferences', 'maxRecentItems'],
        step: 1,
        type: 'number',
        validate: (value) =>
          typeof value === 'number' && value < 1 ? 'Use a positive number.' : undefined,
      },
    ],
    id: 'profile',
    title: 'Profile',
  },
  {
    description: 'Tables are display-only in the kit; consumers own row mutation.',
    id: 'resources',
    tables: [
      {
        columns: [
          { id: 'label', label: 'Resource', path: ['label'] },
          { id: 'kind', label: 'Kind', path: ['kind'] },
          { id: 'status', label: 'Status', path: ['status'] },
          { align: 'end', id: 'count', label: 'Count', path: ['count'] },
        ],
        description: 'Generic resource rows rendered from row metadata.',
        id: 'resourceSummary',
        label: 'Resource summary',
        rows: [
          {
            data: { count: 4, kind: 'workspace', label: 'Open files', status: 'Ready' },
            id: 'files',
          },
          {
            data: { count: 2, kind: 'runtime', label: 'Pending events', status: 'Waiting' },
            id: 'events',
          },
          {
            data: { count: 1, kind: 'settings', label: 'Changed values', status: 'Dirty' },
            id: 'settings',
          },
        ],
      },
    ],
    title: 'Resources',
  },
];

function StructuredDataFormHarness({
  readOnly = false,
  useInvalidValues = false,
}: {
  readOnly?: boolean;
  useInvalidValues?: boolean;
}) {
  const initialData = useMemo(
    () =>
      normalizeWorkbenchStructuredDataFormData(sections, {
        permissions: { confirmSideEffects: true },
        preferences: { density: 'comfortable', maxRecentItems: 12 },
        profile: { name: useInvalidValues ? '' : 'Workbench Kit' },
      }),
    [useInvalidValues],
  );
  const [data, setData] = useState<WorkbenchStructuredDataRecord>(initialData);
  const [savedData, setSavedData] = useState<WorkbenchStructuredDataRecord>(initialData);
  const [eventLog, setEventLog] = useState(readOnly ? 'Read-only data' : 'Ready');
  const dirty = JSON.stringify(data) !== JSON.stringify(savedData);

  return (
    <div
      className="workbench-story-shell"
      style={{
        minHeight: 680,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
        <Badge variant={dirty ? 'accent' : 'muted'}>{dirty ? 'Unsaved' : 'Saved'}</Badge>
        <div aria-label="Structured data form event log" role="status">
          {eventLog}
        </div>
      </div>
      <WorkbenchStructuredDataForm
        ariaLabel="Structured data sections"
        data={data}
        readOnly={readOnly}
        sections={sections}
        onCancel={() => {
          setData(savedData);
          setEventLog('Cancelled structured data');
        }}
        onDataChange={(nextData) => {
          setData(nextData);
          setEventLog('Changed structured data');
        }}
        onSubmit={(nextData) => {
          setSavedData(nextData);
          setEventLog('Submitted structured data');
        }}
      />
    </div>
  );
}

export const SectionedData: Story = {
  render: () => <StructuredDataFormHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Structured data form event log');
    const profileName = canvas.getByRole('textbox', { name: 'Profile name' });

    await userEvent.clear(profileName);
    await expect(canvas.getByText('This field is required.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(profileName, 'Workbench Runtime');
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Density' }), 'compact');
    await expect(eventLog).toHaveTextContent('Changed structured data');

    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(eventLog).toHaveTextContent('Submitted structured data');
  },
  tags: ['storybook-play-baseline'],
};

export const ReadOnlyData: Story = {
  render: () => <StructuredDataFormHarness readOnly />,
};

export const ValidationState: Story = {
  render: () => <StructuredDataFormHarness useInvalidValues />,
};

export const EmptyStructuredData: Story = {
  render: () => (
    <div className="workbench-story-shell" style={{ minHeight: 360, padding: 24 }}>
      <WorkbenchStructuredDataForm ariaLabel="Structured data sections" sections={[]} />
    </div>
  ),
};
