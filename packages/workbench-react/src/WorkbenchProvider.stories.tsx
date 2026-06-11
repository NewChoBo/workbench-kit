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
        enabled: ['workbench-kit.builtin.explorer', 'workbench-kit.builtin.settings'],
        recommendations: [],
      }}
      initialLayout={{
        sideBar: {
          activeViewContainer: 'explorer',
          visible: true,
        },
      }}
    >
      <WorkbenchShell
        editorArea={
          <main
            style={{
              display: 'grid',
              height: '100%',
              minHeight: 0,
              placeItems: 'center',
            }}
          >
            <section>
              <h1 style={{ fontSize: 18, margin: 0 }}>Workbench React Shell</h1>
              <p style={{ margin: '8px 0 0' }}>Editor area hosted by workbench-react.</p>
            </section>
          </main>
        }
        rootClassName="ide-root"
        theme="dark"
      />
    </WorkbenchProvider>
  ),
};
