import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { TextInput } from '../primitives/TextInput';
import { Toolbar } from '../primitives/Toolbar';
import { Panel, PanelBody, PanelHeader } from './Panel';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from './SideBarViewFrame';
import {
  WorkbenchActionList,
  WorkbenchActionListItem,
  WorkbenchSidebarSection,
} from './WorkbenchSidebarActions';
import {
  WorkbenchCanvasDragGhost,
  WorkbenchCanvasDragGhostContent,
  WorkbenchCanvasDragPreviewFrame,
  WorkbenchCanvasDropIndicator,
  WorkbenchCanvasFrameHandle,
  WorkbenchCanvasFrameSurface,
  WorkbenchCanvasGuideBlock,
  WorkbenchCanvasGuideLayer,
  WorkbenchCanvasGuideLine,
  WorkbenchCanvasPaneSurface,
  WorkbenchCanvasPlaceholder,
  WorkbenchCanvasResizeFrame,
  WorkbenchCanvasResizeHandle,
  WorkbenchCanvasResizePreview,
  WorkbenchCanvasSelectionMarquee,
  WorkbenchCanvasViewport,
  WorkbenchDragPreview,
  WorkbenchTemplateGlyph,
} from './WorkbenchLayout';

const meta = {
  title: 'React/Layout',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PanelFrame: Story = {
  render: () => (
    <div style={{ width: 560, padding: 24, background: 'var(--color-bg)' }}>
      <Panel>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge>ready</Badge>
              <IconButton icon="codicon-ellipsis" label="More actions" />
            </Toolbar>
          }
        >
          Preview
        </PanelHeader>
        <PanelBody style={{ padding: 16, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Panels provide a quiet frame for repeated workbench surfaces.
        </PanelBody>
      </Panel>
    </div>
  ),
};

export const SideBarFrame: Story = {
  render: () => (
    <div style={{ width: 300, height: 520, background: 'var(--color-bg)' }}>
      <SideBarViewFrame
        title="Components"
        actions={<IconButton icon="codicon-refresh" label="Refresh" />}
        headerAddon={
          <SideBarHeaderControl>
            <TextInput aria-label="Filter components" controlWidth="full" placeholder="Filter" />
          </SideBarHeaderControl>
        }
      >
        <SideBarList fill>
          <SideBarListItem active>Primitives</SideBarListItem>
          <SideBarListItem>Buttons</SideBarListItem>
          <SideBarListItem>Fields</SideBarListItem>
          <SideBarListItem>Panels</SideBarListItem>
          <SideBarListItem depth={1}>Split views</SideBarListItem>
          <SideBarListItem depth={1}>Dialogs</SideBarListItem>
          <SideBarListItem variant="stacked">
            <strong>Compact row</strong>
            <span>Secondary text remains contained.</span>
          </SideBarListItem>
        </SideBarList>
      </SideBarViewFrame>
    </div>
  ),
};

export const SidebarActionPrimitives: Story = {
  render: () => (
    <div style={{ width: 320, height: 560, background: 'var(--color-bg)' }}>
      <SideBarViewFrame
        title="Commands"
        actions={<IconButton icon="codicon-refresh" label="Refresh commands" />}
      >
        <WorkbenchSidebarSection
          title="Pinned"
          count={6}
          actions={<IconButton icon="codicon-add" label="Add pinned action" />}
        >
          <WorkbenchActionList aria-label="Pinned actions">
            <WorkbenchActionListItem
              active
              icon={<i className="codicon codicon-play" />}
              label="Run active command"
              shortcut="Ctrl Enter"
              status="idle"
            />
            <WorkbenchActionListItem
              icon={<i className="codicon codicon-sync" />}
              label="Sync workspace"
              description="Uses caller-provided execution"
              status="running"
            />
            <WorkbenchActionListItem
              selected
              icon={<i className="codicon codicon-check" />}
              label="Apply generated changes"
              status="completed"
            />
            <WorkbenchActionListItem
              icon={<i className="codicon codicon-warning" />}
              label="Review failure"
              status="failed"
            />
            <WorkbenchActionListItem
              disabled
              disabledReason="No runnable target is selected."
              icon={<i className="codicon codicon-debug-start" />}
              label="Debug target"
              status="disabled"
            />
            <WorkbenchActionListItem
              danger
              icon={<i className="codicon codicon-trash" />}
              label="Delete generated output"
              shortcut="Del"
              status="waiting"
            />
          </WorkbenchActionList>
        </WorkbenchSidebarSection>
        <WorkbenchSidebarSection defaultCollapsed title="Collapsed" count={3}>
          <WorkbenchActionList aria-label="Collapsed actions">
            <WorkbenchActionListItem
              icon={<i className="codicon codicon-terminal" />}
              label="Open task terminal"
            />
          </WorkbenchActionList>
        </WorkbenchSidebarSection>
        <WorkbenchSidebarSection title="Unavailable" badge={<Badge variant="muted">offline</Badge>}>
          <WorkbenchActionList aria-label="Unavailable actions">
            <WorkbenchActionListItem
              unavailable
              disabledReason="This action becomes available after a provider connects."
              icon={<i className="codicon codicon-plug" />}
              label="Connect provider"
            />
          </WorkbenchActionList>
        </WorkbenchSidebarSection>
        <WorkbenchSidebarSection title="Empty" count={0}>
          <WorkbenchActionList empty aria-label="Empty actions" emptyLabel="No actions available" />
        </WorkbenchSidebarSection>
      </SideBarViewFrame>
    </div>
  ),
};

export const DragPreview: Story = {
  render: () => (
    <div style={{ width: 360, height: 160, padding: 24, background: 'var(--color-bg)' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
        Fixed drag previews follow pointer coordinates while chrome stays in workbench-kit.
      </p>
      <WorkbenchDragPreview x={96} y={88}>
        Tile template
      </WorkbenchDragPreview>
    </div>
  ),
};

export const CanvasFrameHandle: Story = {
  render: () => (
    <div style={{ width: 360, height: 180, padding: 24, background: 'var(--color-bg)' }}>
      <div
        style={{
          position: 'relative',
          width: 240,
          height: 120,
          background: 'var(--vscode-editor-background, var(--color-bg))',
          border: '1px solid var(--vscode-panel-border, var(--color-border))',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}
      >
        <WorkbenchCanvasFrameHandle>Launcher frame</WorkbenchCanvasFrameHandle>
      </div>
    </div>
  ),
};

export const CanvasResizeHandles: Story = {
  render: () => (
    <div style={{ width: 360, height: 220, padding: 24, background: 'var(--color-bg)' }}>
      <div style={{ position: 'relative', width: 280, height: 160 }}>
        <WorkbenchCanvasResizeFrame x={32} y={24} width={180} height={96}>
          {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((position) => (
            <WorkbenchCanvasResizeHandle
              key={position}
              label={`Resize ${position}`}
              position={position}
            />
          ))}
        </WorkbenchCanvasResizeFrame>
        <WorkbenchCanvasResizePreview x={56} y={48} width={188} height={112} zIndex={1} />
      </div>
    </div>
  ),
};

export const CanvasViewportSelection: Story = {
  render: () => (
    <div style={{ width: 360, height: 220, padding: 24, background: 'var(--color-bg)' }}>
      <WorkbenchCanvasViewport width={280} height={160}>
        <WorkbenchCanvasSelectionMarquee x={48} y={36} width={132} height={72} />
      </WorkbenchCanvasViewport>
    </div>
  ),
};

export const CanvasDragChrome: Story = {
  render: () => (
    <div style={{ width: 420, height: 260, padding: 24, background: 'var(--color-bg)' }}>
      <WorkbenchCanvasPaneSurface style={{ width: 320, height: 180 }}>
        <WorkbenchCanvasViewport width={320} height={180}>
          <WorkbenchCanvasFrameSurface
            selected
            style={{ left: 16, top: 16, width: 280, height: 140 }}
          >
            <WorkbenchCanvasGuideBlock tone="padding" x={0} y={0} width={280} height={16} />
            <WorkbenchCanvasGuideBlock x={128} y={24} width={12} height={92} />
            <WorkbenchCanvasPlaceholder x={24} y={88} width={72} height={40}>
              Missing tile
            </WorkbenchCanvasPlaceholder>
          </WorkbenchCanvasFrameSurface>
          <WorkbenchCanvasDropIndicator x={24} y={24} width={72} height={48} />
          <WorkbenchCanvasDragPreviewFrame x={132} y={56} width={88} height={56} rotation={4}>
            <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)' }} />
          </WorkbenchCanvasDragPreviewFrame>
          <WorkbenchCanvasGuideLayer>
            <WorkbenchCanvasGuideLine
              axis="x"
              source="object"
              position={116}
              start={20}
              end={148}
            />
            <WorkbenchCanvasGuideLine axis="y" position={20} start={32} end={284} />
          </WorkbenchCanvasGuideLayer>
        </WorkbenchCanvasViewport>
      </WorkbenchCanvasPaneSurface>
      <WorkbenchCanvasDragGhost x={284} y={156} width={72} height={48}>
        <WorkbenchCanvasDragGhostContent width={72} height={48}>
          <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)' }} />
        </WorkbenchCanvasDragGhostContent>
      </WorkbenchCanvasDragGhost>
    </div>
  ),
};

export const TemplateGlyphs: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 10,
        width: 360,
        padding: 24,
        background: 'var(--color-bg)',
      }}
    >
      {(['color', 'text', 'badge', 'image', 'list', 'grid', 'flex', 'frame'] as const).map(
        (icon, index) => (
          <WorkbenchTemplateGlyph
            key={icon}
            accent={
              ['#4f46e5', '#1f2937', '#0f766e', '#0ea5e9', '#64748b', '#2563eb', '#16a34a'][
                index
              ] ?? '#a855f7'
            }
            icon={icon}
          />
        ),
      )}
    </div>
  ),
};
