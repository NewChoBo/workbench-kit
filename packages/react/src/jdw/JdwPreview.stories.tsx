import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatJsonWidgetData } from '@workbench-kit/jdw';

import { JdwPreview } from './JdwPreview.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
  body?: string;
}

const SAMPLE_WIDGET: DemoWidget = {
  type: 'demo:card',
  title: 'Workbench preview',
  body: 'Rendered through JdwPreview and a mock registry build handler.',
};

const demoRegistry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
  {
    type: 'demo:card',
    build: (widget) => {
      const body = widget.body?.trim();
      return body ? `${widget.title} — ${body}` : widget.title;
    },
    displayName: 'Demo Card',
  },
]);

const meta = {
  title: 'JDW/Preview',
  component: JdwPreview,
  args: {
    json: formatJsonWidgetData({
      type: SAMPLE_WIDGET.type,
      args: {
        title: SAMPLE_WIDGET.title,
        body: SAMPLE_WIDGET.body,
      },
    }),
    registry: demoRegistry,
  },
} satisfies Meta<typeof JdwPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

const EXPECTED_OUTPUT = `${SAMPLE_WIDGET.title} — ${SAMPLE_WIDGET.body}`;

export const RegisteredWidget: Story = {
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent(
      EXPECTED_OUTPUT,
    );
    await expect(canvas.queryByTestId('jdw-preview-error')).not.toBeInTheDocument();
  },
};

export const ParseError: Story = {
  args: {
    json: '{',
    registry: demoRegistry,
  },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('jdw-preview-error')).toBeVisible();
    await expect(canvas.queryByTestId('jdw-preview-output')).not.toBeInTheDocument();
  },
};

export const UnregisteredType: Story = {
  args: {
    json: formatJsonWidgetData({
      type: 'demo:missing',
      args: { title: 'Missing' },
    }),
    registry: demoRegistry,
  },
};
