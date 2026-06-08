import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatWidgetJson } from '@workbench-kit/json-widget';

import { JsonWidgetPreview } from './JsonWidgetPreview.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
  body?: string;
}

const SAMPLE_WIDGET: DemoWidget = {
  type: 'demo:card',
  title: 'Workbench preview',
  body: 'Rendered through JsonWidgetPreview and a mock registry build handler.',
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
  title: 'JsonWidget/Preview',
  component: JsonWidgetPreview,
  args: {
    json: formatWidgetJson(SAMPLE_WIDGET),
    registry: demoRegistry,
  },
} satisfies Meta<typeof JsonWidgetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

const EXPECTED_OUTPUT = `${SAMPLE_WIDGET.title} — ${SAMPLE_WIDGET.body}`;

export const RegisteredWidget: Story = {
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent(
      EXPECTED_OUTPUT,
    );
    await expect(canvas.queryByTestId('json-widget-preview-error')).not.toBeInTheDocument();
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

    await expect(canvas.getByTestId('json-widget-preview-error')).toBeVisible();
    await expect(canvas.queryByTestId('json-widget-preview-output')).not.toBeInTheDocument();
  },
};

export const UnregisteredType: Story = {
  args: {
    json: formatWidgetJson({ type: 'demo:missing', title: 'Missing' }),
    registry: demoRegistry,
  },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent(
      'Unknown widget type "demo:missing". Register it in WidgetRegistry to render.',
    );
    await expect(canvas.queryByTestId('json-widget-preview-error')).not.toBeInTheDocument();
  },
};
