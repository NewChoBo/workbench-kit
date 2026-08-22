import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  formatJsonWidgetData,
  type JsonWidgetListenSchedule,
  type JsonWidgetListenSchedulerBatch,
} from '@workbench-kit/jdw';
import { Button } from '@workbench-kit/react';
import { JdwPreview } from '@workbench-kit/react/jdw';

import './host.css';

const LISTEN_PREVIEW_JSON = formatJsonWidgetData({
  type: 'column',
  listen: ['theme'],
  args: {
    children: [
      {
        type: 'text',
        listen: ['title'],
        args: { text: '${title}' },
      },
    ],
  },
});

const schedulePreviewMicrotask: JsonWidgetListenSchedule = (flush) => {
  let active = true;
  queueMicrotask(() => {
    if (active) {
      flush();
    }
  });
  return () => {
    active = false;
  };
};

const meta = {
  title: 'JDW/Preview/Listen scheduler',
  parameters: {
    storybookGrid: { enabled: false },
  },
  render: () => <ListenSchedulerHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CoalescedInvalidationDelivery: Story = {
  name: 'Coalesced invalidation delivery',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('First title');
    await userEvent.click(canvas.getByRole('button', { name: 'Apply value burst' }));
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Second title');
    await waitFor(() =>
      expect(canvas.getByRole('status')).toHaveTextContent(
        'Batch 1: title, theme.color (2 invalidations)',
      ),
    );
  },
  tags: ['storybook-play-required', 'storybook-play-jdw-listen-scheduler'],
};

function ListenSchedulerHarness() {
  const [title, setTitle] = useState('First title');
  const [changedPaths, setChangedPaths] = useState<readonly string[]>([]);
  const [batches, setBatches] = useState<readonly JsonWidgetListenSchedulerBatch[]>([]);
  const latestBatch = batches[batches.length - 1];

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 480, padding: 24 }}>
      <Button
        onClick={() => {
          setTitle('Second title');
          setChangedPaths(['title', 'theme.color', 'title']);
        }}
      >
        Apply value burst
      </Button>
      <JdwPreview
        changedValuePaths={changedPaths}
        invalidationSchedule={schedulePreviewMicrotask}
        json={LISTEN_PREVIEW_JSON}
        onInvalidationBatch={(batch) => setBatches((current) => [...current, batch])}
        values={{ title }}
      />
      <output role="status">
        {batches.length === 0
          ? 'No scheduled batch yet'
          : `Batch ${batches.length}: ${latestBatch?.changedPaths.join(', ')} (${latestBatch?.invalidations.length} invalidations)`}
      </output>
    </div>
  );
}
