import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../../primitives/Badge';
import { Field } from '../../primitives/Field';
import { TextInput } from '../../primitives/TextInput';
import {
  WorkbenchNavigationPanel,
  WorkbenchSectionedPanel,
  WorkbenchStructuredDataSchemaPanel,
  type WorkbenchStructuredDataSchemaDocument,
} from './index';
import { WorkbenchSettingsSection } from './WorkbenchSettingsSection';

const meta = {
  title: 'React/Workbench/Settings/Panel Primitives',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NavigationPanel: Story = {
  render: () => (
    <div style={{ height: 420, background: 'var(--color-bg)' }}>
      <WorkbenchNavigationPanel
        nav={
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>Appearance</li>
            <li>Workbench</li>
            <li>Workspace</li>
          </ul>
        }
        content={
          <WorkbenchSettingsSection
            id="settings-panel-preview"
            title="Navigation panel"
            description="Two-column settings layout with optional navigation rail."
          >
            <Field label="Display name">
              <TextInput controlWidth="full" defaultValue="Workbench Kit" />
            </Field>
          </WorkbenchSettingsSection>
        }
      />
    </div>
  ),
};

export const SectionedPanel: Story = {
  render: () => (
    <div style={{ height: 520, background: 'var(--color-bg)' }}>
      <WorkbenchSectionedPanel
        ariaLabel="Settings sections"
        items={[
          {
            anchorId: 'general',
            title: 'General',
            render: () => (
              <WorkbenchSettingsSection id="general" title="General">
                <Field label="Profile name">
                  <TextInput controlWidth="full" defaultValue="Preview profile" />
                </Field>
              </WorkbenchSettingsSection>
            ),
          },
          {
            anchorId: 'workspace',
            count: 2,
            title: 'Workspace',
            render: () => (
              <WorkbenchSettingsSection id="workspace" title="Workspace">
                <Field label="Default folder">
                  <TextInput controlWidth="full" defaultValue="src" />
                </Field>
              </WorkbenchSettingsSection>
            ),
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('link', { name: /Workspace/ }));
    await expect(canvas.getByRole('heading', { name: 'Workspace' })).toBeVisible();
  },
};

const schemaDocument: WorkbenchStructuredDataSchemaDocument = {
  schema: {
    properties: {
      'profile.name': { title: 'Name', type: 'string' },
    },
    sections: [{ fields: ['name'], sectionKey: 'profile', title: 'Profile', type: 'form' }],
  },
};

export const StructuredDataSchemaPanel: Story = {
  render: () => {
    const [data, setData] = useState({ profile: { name: 'Workbench Kit' } });

    return (
      <div style={{ height: 520, background: 'var(--color-bg)' }}>
        <WorkbenchStructuredDataSchemaPanel
          ariaLabel="Schema panel"
          data={data}
          headerActions={<Badge>Preview</Badge>}
          schema={schemaDocument}
          onDataChange={(nextData) => setData(nextData as typeof data)}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Name')).toHaveValue('Workbench Kit');
  },
};
