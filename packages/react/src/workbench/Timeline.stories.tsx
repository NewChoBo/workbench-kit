import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { WorkbenchTimeline, type WorkbenchTimelineEvent } from './Timeline';

const meta = {
  component: WorkbenchTimeline,
  title: 'React/Workbench/Flows/Timeline',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof WorkbenchTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

const timelineEvents: WorkbenchTimelineEvent[] = [
  {
    content: 'Review the selected files and produce a validation summary.',
    id: 'message-user',
    kind: 'message',
    source: 'user',
    timestamp: '10:00',
  },
  {
    description: 'Preparing a validation operation for 3 selected files.',
    id: 'operation-call',
    kind: 'operation-call',
    metadata: { execution: 'remote', files: 3 },
    title: 'Validate selection',
    timestamp: '10:01',
  },
  {
    description: 'Checking required fields and generated artifacts.',
    id: 'progress',
    kind: 'progress',
    metadata: { complete: '67%' },
    status: 'running',
    title: 'Running validation checks',
    timestamp: '10:02',
  },
  {
    description: 'docs/validation-summary.md',
    id: 'file-write',
    kind: 'file-write',
    metadata: { path: 'docs/validation-summary.md', source: 'operation' },
    title: 'Write validation summary',
    timestamp: '10:03',
  },
  {
    description: 'Validation completed with non-blocking warnings.',
    id: 'operation-result',
    kind: 'operation-result',
    payload: { warnings: 2 },
    title: 'Validation result',
    timestamp: '10:04',
  },
  {
    content: 'Validation summary is ready with two warnings to review.',
    id: 'message-assistant',
    kind: 'message',
    source: 'assistant',
    timestamp: '10:05',
  },
];

const errorTimelineEvents: WorkbenchTimelineEvent[] = [
  timelineEvents[0],
  {
    description: 'The operation requires a selected workspace target.',
    id: 'operation-error',
    kind: 'error',
    metadata: { code: 'missing-target' },
    title: 'Validation failed',
    timestamp: '10:01',
  },
];

export const OrderedOperationTimeline: Story = {
  args: {
    'aria-label': 'Ordered operation timeline',
    events: timelineEvents,
  },
  tags: ['storybook-play-baseline'],
  render: (args) => (
    <div
      style={{
        background: 'var(--color-bg)',
        padding: 24,
        width: 'min(100%, 760px)',
      }}
    >
      <WorkbenchTimeline {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = canvas.getByRole('list', { name: 'Ordered operation timeline' });
    const items = within(timeline).getAllByRole('listitem');

    await expect(timeline).toBeVisible();
    await expect(items).toHaveLength(timelineEvents.length);
    await expect(items[0]).toHaveTextContent('Review the selected files');
    await expect(items[1]).toHaveTextContent('Validate selection');
    await expect(
      within(timeline).getByRole('listitem', { name: /Operation call: Validate selection/ }),
    ).toHaveAttribute('aria-busy', 'true');
    await expect(timeline).toHaveTextContent('docs/validation-summary.md');
  },
};

export const CompactTimeline: Story = {
  args: {
    'aria-label': 'Compact operation timeline',
    events: errorTimelineEvents,
    variant: 'compact',
  },
  render: (args) => (
    <div
      style={{
        background: 'var(--color-bg)',
        padding: 24,
        width: 'min(100%, 520px)',
      }}
    >
      <WorkbenchTimeline {...args} />
    </div>
  ),
};

export const CustomPayloadViews: Story = {
  args: {
    'aria-label': 'Custom payload timeline',
    events: timelineEvents,
  },
  render: (args) => (
    <div
      style={{
        background: 'var(--color-bg)',
        padding: 24,
        width: 'min(100%, 760px)',
      }}
    >
      <WorkbenchTimeline
        {...args}
        renderPayload={(event) =>
          event.kind === 'operation-result' ? (
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-muted)',
                display: 'grid',
                fontSize: 12,
                gap: 4,
                marginTop: 8,
                padding: 10,
              }}
            >
              <span>Warnings: 2</span>
              <span>Status: reviewable</span>
            </div>
          ) : null
        }
      />
    </div>
  ),
};
