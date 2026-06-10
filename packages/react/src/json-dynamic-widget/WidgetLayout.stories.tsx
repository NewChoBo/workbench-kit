import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  jdwNodeToGenericWidget,
  layoutWidget,
  parseJsonWidgetData,
} from '@workbench-kit/json-widget';

import {
  JDW_FIXTURE_GRID_CELLS,
  JDW_FIXTURE_ROW_FLEX,
} from './fixtures/jdw-fixtures.js';

interface LayoutFixturePreviewProps {
  readonly json: string;
}

function LayoutFixturePreview({ json }: LayoutFixturePreviewProps) {
  const parsed = parseJsonWidgetData(json);
  if (parsed.parseError !== null || parsed.value === null) {
    return <div role="alert">{parsed.parseError}</div>;
  }

  const tree = layoutWidget(jdwNodeToGenericWidget(parsed.value), {
    minWidth: 0,
    maxWidth: 320,
    minHeight: 0,
    maxHeight: 240,
  });

  return (
    <div data-testid="widget-layout-fixture" style={{ position: 'relative', width: 320, height: 240 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px dashed rgba(255,255,255,0.2)',
        }}
      />
      {tree.children.map((child, index) => (
        <div
          key={index}
          data-layout-child
          style={{
            position: 'absolute',
            left: child.rect.x,
            top: child.rect.y,
            width: child.rect.width,
            height: child.rect.height,
            border: '1px solid rgba(74,168,255,0.8)',
            boxSizing: 'border-box',
            fontSize: 11,
            padding: 4,
            overflow: 'hidden',
          }}
        >
          {String(child.widget.text ?? child.widget.type)}
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'JsonDynamicWidget/Layout',
  component: LayoutFixturePreview,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LayoutFixturePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RowFlexRects: Story = {
  args: { json: JDW_FIXTURE_ROW_FLEX },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-layout-fixture')).toBeVisible();
    await expect(canvas.getAllByText('Left').length).toBeGreaterThan(0);
  },
};

export const GridCellRects: Story = {
  args: { json: JDW_FIXTURE_GRID_CELLS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-layout-fixture')).toBeVisible();
    await expect(canvas.getByText('Wide')).toBeVisible();
  },
};
