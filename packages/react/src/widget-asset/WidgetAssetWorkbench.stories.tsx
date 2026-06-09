import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { formatWidgetAssetJson } from '@workbench-kit/json-widget';

import { WidgetAssetWorkbench } from './WidgetAssetWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';

const initialValue = formatWidgetAssetJson({
  id: 'content.heading',
  label: 'Heading',
  description: 'Large title text',
  category: 'content',
  icon: 'codicon-symbol-text',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Heading',
    fontSize: 24,
  },
});

function WidgetAssetHarness() {
  const [value, setValue] = useState(initialValue);

  return (
    <WidgetAssetWorkbench
      path="src/widgets/assets/heading.asset.json"
      registry={WIDGET_TREE_DEMO_REGISTRY}
      value={value}
      onChange={setValue}
    />
  );
}

const meta = {
  title: 'JsonWidget/WidgetAsset/Editor',
  parameters: {
    fullHeightShell: '720px',
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Live: Story = {
  render: () => <WidgetAssetHarness />,
};
