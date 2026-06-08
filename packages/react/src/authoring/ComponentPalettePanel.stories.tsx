import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { PLAYGROUND_WIDGET_TEMPLATES } from '../json-widget/playground/demo-registry.js';
import { ComponentPalettePanel } from './ComponentPalettePanel.js';

const meta = {
  title: 'JsonWidget/Authoring/ComponentPalettePanel',
  component: ComponentPalettePanel,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ComponentPalettePanel>;

export default meta;

type Story = StoryObj<typeof ComponentPalettePanel>;

export const Default: Story = {
  render: () => {
    const [lastInsert, setLastInsert] = useState<string | null>(null);
    return (
      <div style={{ maxWidth: 280 }}>
        <ComponentPalettePanel
          onInsert={(template) => setLastInsert(template.label)}
          templates={PLAYGROUND_WIDGET_TEMPLATES.slice(0, 8)}
        />
        {lastInsert ? <p style={{ marginTop: 12 }}>Last insert: {lastInsert}</p> : null}
      </div>
    );
  },
};
