import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { HelpText } from '../layout/Panel';
import { ResizablePanels } from '../primitives/WorkbenchEditor';
import {
  WorkbenchBanner,
  WorkbenchBannerIcon,
  WorkbenchBannerMessage,
} from '../layout/WorkbenchLayoutBase';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { EmptyState } from '../primitives/EmptyState';
import { ListEmptyState } from '../primitives/List';
import {
  ActivityBar as ChromeActivityBar,
  SideBar,
  WorkbenchShell as ChromeWorkbenchShell,
} from '../primitives/WorkbenchChrome';
import { ActivityBar } from './ActivityBar';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarSectionModel } from './StatusBar';

interface ShellVerificationStoryArgs {
  shellState: ShellStateId;
}

const meta = {
  title: 'React/Workbench/Verification',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
} satisfies Meta<ShellVerificationStoryArgs>;

export default meta;

type Story = StoryObj<ShellVerificationStoryArgs>;

type ShellStateId =
  | 'normal'
  | 'connecting'
  | 'reconnecting'
  | 'error'
  | 'warning'
  | 'dirty'
  | 'narrow-sidebar';

interface ShellStateConfig {
  banner?: ReactNode;
  hideSidebar?: boolean;
  id: ShellStateId;
  label: string;
  statusSections: StatusBarSectionModel[];
  summary: string;
}

const verificationActivities = [
  { id: 'explorer', label: 'Explorer', icon: 'codicon-files', active: true },
  { id: 'search', label: 'Search', icon: 'codicon-search' },
  { id: 'chatting', label: 'Chatting', icon: 'codicon-comment-discussion' },
  { id: 'aiChat', label: 'AI Chat', icon: 'codicon-sparkle' },
] as const;

function connectionStatusSections(
  connectionLabel: string,
  connectionStatus: 'idle' | 'running' | 'failed' | 'waiting',
  detailLabel: string,
): StatusBarSectionModel[] {
  return [
    {
      id: 'main',
      items: [
        { id: 'detail', icon: <span className="workbench-status-dot" />, label: detailLabel },
      ],
    },
    {
      align: 'end',
      id: 'connection',
      items: [
        {
          id: 'connection-status',
          icon: <i className="codicon codicon-plug" />,
          label: connectionLabel,
          status: connectionStatus,
        },
        {
          id: 'sidebar',
          icon: <i className="codicon codicon-layout-sidebar-left" />,
          label: 'Hide sidebar',
        },
      ],
    },
  ];
}

const shellStateConfigs: ShellStateConfig[] = [
  {
    id: 'normal',
    label: 'Normal',
    summary: 'Connected runtime, visible sidebar, no banners.',
    statusSections: connectionStatusSections('Connected', 'idle', 'Ready'),
  },
  {
    id: 'connecting',
    label: 'Connecting',
    summary: 'Initial handshake — status shows busy connecting state.',
    statusSections: connectionStatusSections('Connecting…', 'running', 'Waiting for runtime'),
  },
  {
    id: 'reconnecting',
    label: 'Reconnecting',
    summary: 'Warning banner plus reconnecting status after a dropped connection.',
    banner: (
      <WorkbenchBanner tone="warning" role="status">
        <WorkbenchBannerIcon icon="codicon-warning" />
        <WorkbenchBannerMessage>
          Connection lost. Reconnecting to ws://127.0.0.1:4123…
        </WorkbenchBannerMessage>
      </WorkbenchBanner>
    ),
    statusSections: connectionStatusSections('Reconnecting…', 'waiting', 'Retrying connection'),
  },
  {
    id: 'error',
    label: 'Error',
    summary: 'Error banner and failed connection status; editor area stays usable.',
    banner: (
      <WorkbenchBanner role="alert">
        <WorkbenchBannerIcon icon="codicon-error" />
        <WorkbenchBannerMessage>
          Runtime transport unavailable. Check the server and try again.
        </WorkbenchBannerMessage>
      </WorkbenchBanner>
    ),
    statusSections: connectionStatusSections('Connection failed', 'failed', 'Runtime error'),
  },
  {
    id: 'warning',
    label: 'Warning',
    summary: 'Non-blocking warning banner with otherwise healthy shell chrome.',
    banner: (
      <WorkbenchBanner tone="warning" role="status">
        <WorkbenchBannerIcon icon="codicon-warning" />
        <WorkbenchBannerMessage>
          External file changed on disk. Review before saving.
        </WorkbenchBannerMessage>
      </WorkbenchBanner>
    ),
    statusSections: connectionStatusSections('Connected', 'idle', 'External conflict detected'),
  },
  {
    id: 'dirty',
    label: 'Dirty / unsaved',
    summary: 'Status bar highlights unsaved edits without blocking the shell.',
    statusSections: [
      {
        id: 'main',
        items: [
          {
            id: 'dirty',
            icon: <i className="codicon codicon-circle-filled" />,
            label: 'Unsaved changes',
            status: 'waiting',
          },
        ],
      },
      {
        align: 'end',
        id: 'actions',
        items: [
          { id: 'connection', icon: <i className="codicon codicon-plug" />, label: 'Connected' },
          { id: 'line', label: 'Ln 12, Col 4' },
        ],
      },
    ],
  },
  {
    id: 'narrow-sidebar',
    label: 'Narrow / collapsed sidebar',
    summary: 'At 320px the primary sidebar is hidden to preserve editor space.',
    hideSidebar: true,
    statusSections: connectionStatusSections('Connected', 'idle', 'Sidebar collapsed'),
  },
];

function getShellStateConfig(id: ShellStateId): ShellStateConfig {
  const config = shellStateConfigs.find((entry) => entry.id === id);
  if (!config) throw new Error(`Unknown shell state: ${id}`);
  return config;
}

function VerificationChromeShell({
  height = '100%',
  hideSidebar = false,
  state,
  width = '100%',
}: {
  height?: number | string;
  hideSidebar?: boolean;
  state: ShellStateConfig;
  width?: number | string;
}) {
  const shellStyle: CSSProperties = { height, width, minHeight: 0 };

  return (
    <ChromeWorkbenchShell
      style={shellStyle}
      activityBar={
        <ChromeActivityBar
          items={verificationActivities.map((item) => ({
            ...item,
            active: item.id === 'explorer',
          }))}
        />
      }
      center={
        <div className="ui-workbench-editor-frame" style={{ display: 'grid', height: '100%' }}>
          {state.banner}
          <div
            className="ui-workbench-editor-body"
            style={{
              alignItems: 'center',
              color: 'var(--color-text-muted)',
              display: 'grid',
              fontSize: 13,
              justifyItems: 'center',
              padding: 16,
            }}
          >
            Editor surface
          </div>
        </div>
      }
      left={
        hideSidebar ? undefined : (
          <SideBar aria-label="Primary sidebar">
            <SideBarViewFrame title="Explorer">
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 12 }}>
                src/App.tsx
              </div>
            </SideBarViewFrame>
          </SideBar>
        )
      }
      right={
        <SideBar aria-label="Secondary sidebar" side="right">
          <SideBarViewFrame title="Outline">
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 12 }}>
              No symbols
            </div>
          </SideBarViewFrame>
        </SideBar>
      }
      statusBar={<StatusBar compact sections={state.statusSections} />}
    />
  );
}

function StateCard({
  children,
  label,
  summary,
  width,
}: {
  children: ReactNode;
  label: string;
  summary: string;
  width: number;
}) {
  return (
    <figure
      style={{
        display: 'grid',
        gap: 8,
        margin: 0,
        minWidth: width,
        width,
      }}
    >
      <figcaption style={{ display: 'grid', gap: 4 }}>
        <strong style={{ color: 'var(--color-text)', fontSize: 13 }}>{label}</strong>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.5 }}>
          {summary}
        </span>
      </figcaption>
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          height: 420,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </figure>
  );
}

const viewportMatrixWidths = [320, 768, 1024, 1440] as const;

const splitPaneSurfaceStyle: CSSProperties = {
  alignItems: 'center',
  color: 'var(--color-text-muted)',
  display: 'grid',
  fontSize: 13,
  height: '100%',
  justifyItems: 'center',
  minHeight: 0,
  padding: 16,
};

function SplitResizeDemo({ compact = false }: { compact?: boolean }) {
  return (
    <ResizablePanels
      defaultFirstSize={compact ? 160 : 220}
      minFirstSize={120}
      minSecondSize={compact ? 140 : 180}
      style={{ height: '100%', minHeight: 0 }}
      first={
        <SideBarViewFrame title="Explorer">
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 12 }}>
            src/App.tsx
            <br />
            src/components/Button.tsx
          </div>
        </SideBarViewFrame>
      }
      second={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <SplitView
            defaultPrimarySizePercent={compact ? 55 : 62}
            primary={<div style={splitPaneSurfaceStyle}>Editor pane</div>}
            secondary={<div style={splitPaneSurfaceStyle}>Preview pane</div>}
          />
        </div>
      }
    />
  );
}

export const ViewportMatrix: Story = {
  name: 'Shell / Viewport Matrix',
  parameters: {
    docs: {
      description: {
        story:
          'Compare shell layout at 320, 768, 1024, and 1440 px widths side-by-side. Scroll horizontally on smaller Storybook viewports. Also use the toolbar viewport presets prefixed with **Verify ·** for single-size checks.',
      },
    },
  },
  render: () => (
    <div
      style={{
        background: 'var(--color-bg)',
        minHeight: '100vh',
        overflow: 'auto',
        padding: 24,
      }}
    >
      <header style={{ marginBottom: 20, maxWidth: 960 }}>
        <h2 style={{ color: 'var(--color-text)', fontSize: 18, margin: '0 0 8px' }}>
          Shell viewport matrix
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Each panel uses the resizable chrome shell at a fixed width. Check sidebar clamping, right
          panel auto-hide, separator visibility, and status bar truncation.
        </p>
      </header>
      <div
        style={{
          display: 'flex',
          gap: 20,
          overflowX: 'auto',
          paddingBottom: 12,
        }}
      >
        {viewportMatrixWidths.map((width) => (
          <StateCard
            key={width}
            label={`${width}px`}
            summary={
              width <= 320
                ? 'Mobile — sidebar should collapse; center pane remains usable.'
                : width <= 768
                  ? 'Tablet — left sidebar clamps; right panel may hide.'
                  : 'Desktop — all regions visible with resize handles.'
            }
            width={width}
          >
            <VerificationChromeShell
              height="100%"
              state={getShellStateConfig('normal')}
              width={width}
            />
          </StateCard>
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Shell viewport matrix' })).toBeVisible();
    await expect(canvas.getByText('320px')).toBeVisible();
    await expect(canvas.getByText('1440px')).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const ShellStatesGallery: Story = {
  name: 'Shell / States Gallery',
  parameters: {
    docs: {
      description: {
        story:
          'All major shell feedback states in one view: connection lifecycle, banners, dirty status, and narrow-sidebar collapse.',
      },
    },
  },
  render: () => (
    <div
      style={{
        background: 'var(--color-bg)',
        display: 'grid',
        gap: 24,
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <header style={{ maxWidth: 960 }}>
        <h2 style={{ color: 'var(--color-text)', fontSize: 18, margin: '0 0 8px' }}>
          Shell states gallery
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Verify banner tone, status severity, and sidebar visibility for each operational state.
        </p>
      </header>
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        {shellStateConfigs.map((state) => (
          <StateCard key={state.id} label={state.label} summary={state.summary} width={360}>
            <VerificationChromeShell
              height="100%"
              hideSidebar={state.hideSidebar}
              state={state}
              width="100%"
            />
          </StateCard>
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Shell states gallery' })).toBeVisible();
    await expect(canvas.getByText('Connecting')).toBeVisible();
    await expect(canvas.getByText('Connection failed')).toBeVisible();
    await expect(canvas.getByText('Unsaved changes')).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const InteractiveShellState: Story = {
  name: 'Shell / Interactive State',
  args: {
    shellState: 'normal' satisfies ShellStateId,
  },
  argTypes: {
    shellState: {
      control: 'select',
      description: 'Operational shell state rendered in full-height chrome.',
      options: shellStateConfigs.map((entry) => entry.id),
    },
  },
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Use Controls to switch between connection lifecycle, banner, dirty, and collapsed-sidebar states without leaving the story.',
      },
    },
  },
  render: (args) => {
    const { shellState } = args;
    const state = getShellStateConfig(shellState);
    return (
      <VerificationChromeShell
        height="100%"
        hideSidebar={state.hideSidebar}
        state={state}
        width="100%"
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const { shellState } = args;
    const state = getShellStateConfig(shellState);
    const primaryStatusLabel = state.statusSections[0]?.items[0]?.label;

    await expect(canvas.getByText('Editor surface')).toBeVisible();
    if (typeof primaryStatusLabel === 'string') {
      await expect(canvas.getByLabelText('Status bar')).toHaveTextContent(primaryStatusLabel);
    }
  },
  tags: ['storybook-play-baseline'],
};

export const InteractiveResizeShell: Story = {
  name: 'Shell / Interactive Resize',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Full-height chrome shell for manual resize testing. Drag vertical separators or use arrow keys while focused. Narrow the viewport to confirm right sidebar auto-hide.',
      },
    },
  },
  render: () => (
    <VerificationChromeShell height="100%" state={getShellStateConfig('normal')} width="100%" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Editor surface')).toBeVisible();
    await expect(canvas.getAllByRole('separator').length).toBeGreaterThan(0);
  },
  tags: ['storybook-play-baseline'],
};

export const SplitResizeVerification: Story = {
  name: 'Layout / Split & Resize',
  parameters: {
    fullHeightShell: '100vh',
    docs: {
      description: {
        story:
          'Full-height ResizablePanels with nested SplitView. Drag separators or use arrow keys while focused. Switch to **Verify · Mobile 320×568** to confirm panes remain usable at narrow widths.',
      },
    },
  },
  render: () => <SplitResizeDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Editor pane')).toBeVisible();
    await expect(canvas.getByText('Preview pane')).toBeVisible();
    await expect(canvas.getAllByRole('separator').length).toBeGreaterThanOrEqual(2);
  },
  tags: ['storybook-play-baseline'],
};

export const SplitResizeNarrowViewport: Story = {
  name: 'Layout / Split & Resize (320px)',
  parameters: {
    fullHeightShell: '100vh',
    viewport: {
      defaultViewport: 'verify-mobile-320',
    },
    docs: {
      description: {
        story:
          'Same split/resize layout locked to the 320px verification viewport. Sidebar and nested panes should clamp without horizontal overflow.',
      },
    },
  },
  render: () => (
    <div style={{ height: '100%', minHeight: 0, width: 320 }}>
      <SplitResizeDemo compact />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Editor pane')).toBeVisible();
    await expect(canvas.getByText(/src\/App\.tsx/)).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
};

export const WorkbenchKitShellRail: Story = {
  name: 'Shell / Activity + Status',
  parameters: {
    docs: {
      description: {
        story:
          'Package-level ActivityBar and StatusBar used by WorkbenchShell / WorkbenchStandaloneShell.',
      },
    },
  },
  render: () => (
    <div
      className="ide-root"
      style={{
        background: 'var(--color-bg)',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: 'min(100vh, 560px)',
      }}
    >
      <div className="ide-body" style={{ display: 'flex', minHeight: 0 }}>
        <ActivityBar
          items={verificationActivities.map((item) => ({
            id: item.id,
            label: item.label,
            icon: <i className={`codicon ${item.icon}`} />,
            active: item.id === 'explorer',
          }))}
          secondaryItems={[
            {
              id: 'settings',
              label: 'Settings',
              icon: <i className="codicon codicon-settings-gear" />,
            },
          ]}
        />
        <main
          className="workbench-editor-area"
          style={{
            alignItems: 'center',
            color: 'var(--color-text-muted)',
            display: 'grid',
            flex: 1,
            fontSize: 13,
            justifyItems: 'center',
          }}
        >
          WorkbenchShell / WorkbenchStandaloneShell body
        </main>
      </div>
      <StatusBar
        compact
        sections={connectionStatusSections('Connected', 'idle', 'Integrated shell status model')}
      />
    </div>
  ),
};

export const ErrorWarningSurfaces: Story = {
  name: 'Feedback / Error & Warning Gallery',
  parameters: {
    docs: {
      description: {
        story:
          'Primitive and layout surfaces for errors and warnings. Cross-check with SchemaForm ValidationMessages, ChatPanel ErrorTransportFlow, and Timeline CompactTimeline.',
      },
    },
  },
  render: () => (
    <div
      style={{
        background: 'var(--color-bg)',
        display: 'grid',
        gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: 14, margin: 0 }}>WorkbenchBanner</h3>
        <WorkbenchBanner role="alert">
          <WorkbenchBannerIcon icon="codicon-error" />
          <WorkbenchBannerMessage>Connection failed — runtime unreachable.</WorkbenchBannerMessage>
        </WorkbenchBanner>
        <WorkbenchBanner tone="warning" role="status">
          <WorkbenchBannerIcon icon="codicon-warning" />
          <WorkbenchBannerMessage>External conflict — file changed on disk.</WorkbenchBannerMessage>
        </WorkbenchBanner>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: 14, margin: 0 }}>EmptyState</h3>
        <div style={{ border: '1px solid var(--color-border)', height: 180 }}>
          <EmptyState icon="codicon-error">Could not load workspace catalog.</EmptyState>
        </div>
        <div style={{ border: '1px solid var(--color-border)', height: 140 }}>
          <ListEmptyState tone="error">
            Search returned no matches for the current query.
          </ListEmptyState>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: 14, margin: 0 }}>Form validation</h3>
        <HelpText tone="error">App name is required.</HelpText>
        <HelpText tone="error">Port must be between 1024 and 65535.</HelpText>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: 14, margin: 0 }}>StatusBar severity</h3>
        <StatusBar
          compact
          sections={[
            {
              id: 'severity',
              items: [
                { id: 'idle', label: 'Idle', status: 'idle' },
                { id: 'running', label: 'Running', status: 'running' },
                { id: 'failed', label: 'Failed', status: 'failed' },
                { id: 'waiting', label: 'Waiting', status: 'waiting' },
                { id: 'unavailable', label: 'Unavailable', status: 'unavailable' },
              ],
            },
          ]}
        />
      </section>
    </div>
  ),
};
