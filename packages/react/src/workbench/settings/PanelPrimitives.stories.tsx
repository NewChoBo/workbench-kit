import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
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

const schemaControlsDocument: WorkbenchStructuredDataSchemaDocument = {
  schema: {
    properties: {
      'theme.accent': { format: 'color', title: 'Accent color', type: 'string' },
      'theme.align': { enum: ['left', 'center', 'right'], title: 'Alignment', type: 'string' },
      'theme.status': {
        enum: ['draft', 'published', 'archived', 'retired', 'deleted'],
        enumNames: ['Draft', 'Published', 'Archived', 'Retired', 'Deleted'],
        title: 'Status',
        type: 'string',
      },
      'theme.code': { pattern: '^[A-Z]{3}$', title: 'Region code', type: 'string' },
    },
    sections: [
      {
        fields: ['accent', 'align', 'status', 'code'],
        sectionKey: 'theme',
        title: 'Theme',
        type: 'form',
      },
    ],
  },
};

function SchemaPanelControlsHarness() {
  const [data, setData] = useState({
    theme: {
      accent: '#3366ff',
      align: 'left',
      code: 'KOR',
      status: 'draft',
    },
  });

  return (
    <div
      className="workbench-story-shell"
      style={{ background: 'var(--color-bg)', height: 560, minHeight: 560 }}
    >
      <WorkbenchStructuredDataSchemaPanel
        ariaLabel="Schema controls panel"
        data={data}
        schema={schemaControlsDocument}
        onDataChange={(nextData) => setData(nextData as typeof data)}
      />
    </div>
  );
}

export const SchemaPanelColorEnumValidation: Story = {
  name: 'Schema panel / Color, enum & validation',
  render: () => <SchemaPanelControlsHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Theme' })).toBeVisible();
    await expect(canvas.getByText('Accent color')).toBeVisible();

    const colorInput = canvasElement.querySelector<HTMLInputElement>('input[type="color"]');
    expect(colorInput).toBeTruthy();
    await expect(colorInput!).toHaveValue('#3366ff');

    await expect(canvas.getByRole('button', { name: 'left', pressed: true })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'center' }));
    await expect(canvas.getByRole('button', { name: 'center', pressed: true })).toBeVisible();

    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(screen.getByRole('option', { name: 'Published' }));
    await expect(canvas.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Published');

    const regionCode = canvas.getByRole('textbox', { name: 'Region code' });
    await userEvent.clear(regionCode);
    await userEvent.type(regionCode, 'abc');
    await userEvent.tab();
    await expect(canvas.getByText('Value does not match the required format.')).toBeVisible();

    await userEvent.clear(regionCode);
    await userEvent.type(regionCode, 'USA');
    await userEvent.tab();
    await expect(canvas.queryByText('Value does not match the required format.')).toBeNull();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
