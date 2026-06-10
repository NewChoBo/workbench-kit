import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { formatWidgetAssetManifest } from '@workbench-kit/json-widget';

import { WidgetAssetWorkbench } from './WidgetAssetWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';

const initialValue = formatWidgetAssetManifest({
  id: 'content.heading',
  label: 'Heading',
  description: 'Large title text',
  category: 'content',
  kind: 'leaf',
  icon: 'codicon-symbol-text',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Heading',
    fontSize: 24,
  } as never,
});

function WidgetAssetHarness() {
  const [value, setValue] = useState(initialValue);

  return (
    <WidgetAssetWorkbench
      path="src/widgets/assets/heading/manifest.json"
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
