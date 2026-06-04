import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { EmptyState } from './EmptyState';
import { Field } from './Field';
import { IconButton } from './IconButton';
import { Select } from './Select';
import { StatusBar, StatusBarLabel, StatusBarSection } from './StatusBar';
import { TextInput } from './TextInput';
import { Toolbar } from './Toolbar';

const meta = {
  title: 'React/Primitives',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const stackStyle = {
  display: 'grid',
  gap: 18,
  minWidth: 420,
  padding: 24,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
} as const;

export const Controls: Story = {
  render: () => (
    <section style={stackStyle}>
      <Toolbar>
        <Button>Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <IconButton icon="codicon-refresh" label="Refresh" />
      </Toolbar>
      <Toolbar>
        <Badge>ready</Badge>
        <Badge variant="muted">muted</Badge>
        <Badge variant="danger">danger</Badge>
      </Toolbar>
      <Field label="Text field" description="Full-width input inside a field wrapper.">
        <TextInput controlWidth="full" placeholder="Enter a label" />
      </Field>
      <Field label="Mode" description="Native select styled by the shared package.">
        <Select controlWidth="full" defaultValue="compact">
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </Select>
      </Field>
      <Field inline label="Boolean setting">
        <Checkbox label="Use dense rows" defaultChecked />
      </Field>
    </section>
  ),
};

export const EmptySurface: Story = {
  render: () => (
    <div style={{ width: 360, height: 220, padding: 24, background: 'var(--color-bg)' }}>
      <EmptyState icon="codicon-beaker">Reusable empty surfaces stay centered.</EmptyState>
    </div>
  ),
};

export const StatusFooter: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div
      style={{ display: 'grid', alignContent: 'end', height: 120, background: 'var(--color-bg)' }}
    >
      <StatusBar>
        <StatusBarLabel>2 frames - Selected: Main frame</StatusBarLabel>
        <StatusBarSection align="end" title="ws://127.0.0.1:4123">
          Connected
        </StatusBarSection>
      </StatusBar>
    </div>
  ),
};
