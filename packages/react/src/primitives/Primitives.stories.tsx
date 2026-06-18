import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { HelpText } from '../layout/Panel';
import { EmptyState } from './EmptyState';
import { Field } from './Field';
import { ListEmptyState } from './List';
import { StatusBar, StatusBarLabel, StatusBarSection } from './StatusBar';
import { TextInput } from './TextInput';
import { Badge } from './Badge';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';
import { NumberInput } from './NumberInput';
import { ScrollArea } from './ScrollArea';
import { Select } from './Select';
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
      <Field label="Number field" description="Numeric input with parsed value callbacks.">
        <NumberInput controlWidth="full" defaultValue={3} min={0} />
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

export const FeedbackSurfaces: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <section
      style={{
        background: 'var(--color-bg)',
        display: 'grid',
        gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div style={{ border: '1px solid var(--color-border)', height: 200 }}>
        <EmptyState icon="codicon-error">Workspace provider failed to respond.</EmptyState>
      </div>
      <div style={{ border: '1px solid var(--color-border)', height: 160 }}>
        <ListEmptyState tone="error">No commands match the current filter.</ListEmptyState>
      </div>
      <Field label="App name" description="Required field with inline validation.">
        <TextInput controlWidth="full" aria-invalid defaultValue="" placeholder="Enter app name" />
        <HelpText tone="error">App name is required.</HelpText>
      </Field>
    </section>
  ),
};

export const ScrollSurface: Story = {
  render: () => (
    <ScrollArea
      aria-label="Scrollable primitive sample"
      orientation="vertical"
      style={{
        width: 360,
        height: 180,
        padding: 16,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        lineHeight: 1.6,
      }}
    >
      {Array.from({ length: 18 }, (_, index) => (
        <p key={index} style={{ margin: '0 0 10px' }}>
          Shared scrollbar row {index + 1}
        </p>
      ))}
    </ScrollArea>
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

export const StatusSeverity: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div style={{ background: 'var(--color-bg)', display: 'grid', gap: 12, padding: 24 }}>
      <StatusBar severity="normal">
        <StatusBarLabel>Normal severity — Connected</StatusBarLabel>
      </StatusBar>
      <StatusBar severity="warning">
        <StatusBarLabel>Warning severity — Reconnecting</StatusBarLabel>
      </StatusBar>
      <StatusBar severity="error">
        <StatusBarLabel>Error severity — Connection failed</StatusBarLabel>
      </StatusBar>
    </div>
  ),
};

export const SelectListboxFit: Story = {
  render: () => (
    <section style={stackStyle}>
      <Field label="Mode" description="Short option lists should not clip inside the listbox.">
        <Select aria-label="Mode" controlWidth="full" defaultValue="compact">
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </Select>
      </Field>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('combobox', { name: 'Mode' }));

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    await expect(options).toHaveLength(2);
    await expect(within(listbox).getByRole('option', { name: 'Compact' })).toBeVisible();
    await expect(within(listbox).getByRole('option', { name: 'Comfortable' })).toBeVisible();
    expect(listbox.scrollHeight).toBeLessThanOrEqual(listbox.clientHeight + 1);
  },
  tags: ['storybook-play-baseline', 'select-listbox-fit'],
};
