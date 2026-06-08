import type { ReactNode } from 'react';

import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { Toolbar } from '../primitives/Toolbar';

export type PreviewCanvasTool = 'select' | 'hand';

export interface PreviewZoomToolbarProps {
  activeTool?: PreviewCanvasTool | undefined;
  canZoomIn: boolean;
  canZoomOut: boolean;
  extraControls?: ReactNode | undefined;
  issueCount?: number | undefined;
  issueMessage?: string | null | undefined;
  scaleLabel: string;
  showGrid?: boolean | undefined;
  title?: string | undefined;
  onToolChange?: ((tool: PreviewCanvasTool) => void) | undefined;
  onToggleGrid?: (() => void) | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
}

export function PreviewZoomToolbar({
  activeTool = 'select',
  canZoomIn,
  canZoomOut,
  extraControls,
  issueCount = 0,
  issueMessage = null,
  scaleLabel,
  showGrid = false,
  title = 'Preview',
  onToolChange,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
}: PreviewZoomToolbarProps) {
  return (
    <div className="ui-preview-zoom-toolbar" data-testid="preview-zoom-toolbar">
      <Toolbar className="ui-preview-zoom-toolbar__controls">
        <span className="ui-preview-zoom-toolbar__title">{title}</span>
        {onToolChange ? (
          <>
            <IconButton
              aria-pressed={activeTool === 'select'}
              compact
              data-testid="preview-tool-select"
              icon="codicon-inspect"
              label="Select tool (V)"
              onClick={() => onToolChange('select')}
            />
            <IconButton
              aria-pressed={activeTool === 'hand'}
              compact
              data-testid="preview-tool-hand"
              icon="codicon-move"
              label="Hand tool (H)"
              onClick={() => onToolChange('hand')}
            />
          </>
        ) : null}
        {extraControls}
        <Badge variant="muted">{scaleLabel}</Badge>
        {issueCount > 0 && issueMessage ? (
          <span className="ui-preview-zoom-toolbar__issue" data-testid="preview-validation-issue">
            {issueMessage}
          </span>
        ) : null}
        <span className="ui-preview-zoom-toolbar__spacer" />
        {onToggleGrid ? (
          <IconButton
            aria-pressed={showGrid}
            compact
            data-testid="preview-toggle-grid"
            icon="codicon-grid"
            label={showGrid ? 'Hide snap grid' : 'Show snap grid'}
            onClick={onToggleGrid}
          />
        ) : null}
        <IconButton
          compact
          data-testid="preview-zoom-out"
          disabled={!canZoomOut}
          icon="codicon-remove"
          label="Zoom out"
          onClick={onZoomOut}
        />
        <IconButton
          compact
          data-testid="preview-zoom-fit"
          icon="codicon-screen-full"
          label="Fit to view"
          onClick={onZoomToFit}
        />
        <IconButton
          compact
          data-testid="preview-zoom-in"
          disabled={!canZoomIn}
          icon="codicon-add"
          label="Zoom in"
          onClick={onZoomIn}
        />
      </Toolbar>
    </div>
  );
}
