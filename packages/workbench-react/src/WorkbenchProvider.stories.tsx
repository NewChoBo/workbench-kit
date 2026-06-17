import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkbenchProvider, WorkbenchShell } from './index.js';

const meta = {
  title: 'Workbench React/Shell',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProviderShell: Story = {
  name: 'Provider Shell',
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        story:
          'Primary shell path composed through @workbench-kit/workbench-react using workbench-core registries and bundled extension manifests.',
      },
    },
  },
  render: () => (
    <WorkbenchProvider
      extensionsConfig={{
        enabled: ['workbench-kit.builtin.explorer', 'workbench-kit.builtin.editor'],
        recommendations: [],
      }}
      initialLayout={{
        sideBar: {
          activeViewContainer: 'explorer',
          visible: true,
        },
      }}
    >
      <WorkbenchShell rootClassName="ide-root" theme="dark" />
    </WorkbenchProvider>
  ),
};
