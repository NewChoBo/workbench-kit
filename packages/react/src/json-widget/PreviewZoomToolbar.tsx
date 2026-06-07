import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { Toolbar } from '../primitives/Toolbar';

export interface PreviewZoomToolbarProps {
  canZoomIn: boolean;
  canZoomOut: boolean;
  issueCount?: number | undefined;
  issueMessage?: string | null | undefined;
  scaleLabel: string;
  title?: string | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
}

export function PreviewZoomToolbar({
  canZoomIn,
  canZoomOut,
  issueCount = 0,
  issueMessage = null,
  scaleLabel,
  title = 'Preview',
  onZoomIn,
  onZoomOut,
  onZoomToFit,
}: PreviewZoomToolbarProps) {
  return (
    <div className="ui-preview-zoom-toolbar" data-testid="preview-zoom-toolbar">
      <Toolbar className="ui-preview-zoom-toolbar__controls">
        <span className="ui-preview-zoom-toolbar__title">{title}</span>
        <Badge variant="muted">{scaleLabel}</Badge>
        {issueCount > 0 && issueMessage ? (
          <span className="ui-preview-zoom-toolbar__issue" data-testid="preview-validation-issue">
            {issueMessage}
          </span>
        ) : null}
        <span className="ui-preview-zoom-toolbar__spacer" />
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
