import type { Meta, StoryObj } from '@storybook/react-vite';

import { WidgetInspectorPanel } from '../json-widget/WidgetEditorPanels.js';
import { playgroundWidgetRegistry } from '../json-widget/playground/demo-registry.js';
import { ComponentPalettePanel } from './ComponentPalettePanel.js';
import { WidgetEditorSidePanel } from './WidgetEditorSidePanel.js';

const meta = {
  title: 'JsonWidget/Authoring/WidgetEditorSidePanel',
  component: WidgetEditorSidePanel,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof WidgetEditorSidePanel>;

export default meta;

type Story = StoryObj<typeof WidgetEditorSidePanel>;

export const TabbedPanels: Story = {
  render: () => (
    <div style={{ width: 320, minHeight: 420, border: '1px solid var(--color-border)' }}>
      <WidgetEditorSidePanel
        tabs={[
          {
            id: 'inspector',
            label: 'Inspector',
            content: (
              <WidgetInspectorPanel
                path={[]}
                widget={{ type: 'text', text: 'Hello' }}
                widgetRegistry={playgroundWidgetRegistry}
              />
            ),
          },
          {
            id: 'components',
            label: 'Components',
            content: <ComponentPalettePanel onInsert={() => undefined} />,
          },
          {
            id: 'assets',
            label: 'Assets',
            content: <p style={{ padding: 12 }}>Asset library is provided by the authoring app.</p>,
          },
        ]}
      />
    </div>
  ),
};
