import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Modal } from '../modal/Modal';
import { Button } from '../primitives/Button';
import { WorkbenchDesktopTitleBar } from './WorkbenchDesktopTitleBar';
import { WorkbenchThemeProvider } from './WorkbenchThemeProvider';
import type { WorkbenchHostPlatform } from './workbenchPlatformChrome';
import { StoryWorkbenchShellFrame } from './story/StoryWorkbenchShellFrame';

const meta = {
  title: 'React/Workbench/Platform Chrome',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function PlatformChromePreview({
  initialOpen = true,
  platform,
}: {
  initialOpen?: boolean;
  platform: WorkbenchHostPlatform;
}): ReactNode {
  const [modalOpen, setModalOpen] = useState(initialOpen);

  return (
    <WorkbenchThemeProvider className="ui-workbench-host-root" platform={platform} theme="dark">
      <StoryWorkbenchShellFrame variant="editor">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkbenchDesktopTitleBar
            leading={<span>Workbench Sample</span>}
            windowControls={{
              isMaximized: false,
              onClose: () => undefined,
              onMinimize: () => undefined,
              onToggleMaximized: () => undefined,
            }}
          />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-sm text-muted">
              Platform chrome preview for <strong>{platform}</strong>.
            </p>
            <Button onClick={() => setModalOpen(true)}>Open platform modal</Button>
          </div>
        </div>
        {modalOpen ? (
          <Modal
            defaultHeight={320}
            defaultWidth={520}
            title="Platform modal"
            onClose={() => setModalOpen(false)}
          >
            <p style={{ margin: 0, padding: '20px' }}>
              Dialog frame uses platform-aware titlebar chrome.
            </p>
          </Modal>
        ) : null}
      </StoryWorkbenchShellFrame>
    </WorkbenchThemeProvider>
  );
}

export const MacPlatformChrome: Story = {
  name: 'macOS platform chrome',
  render: () => <PlatformChromePreview platform="darwin" />,
};

export const WindowsPlatformChrome: Story = {
  name: 'Windows platform chrome',
  render: () => <PlatformChromePreview platform="win32" />,
};
