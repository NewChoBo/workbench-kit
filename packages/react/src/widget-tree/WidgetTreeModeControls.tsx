import { IconButton } from '../primitives/IconButton';
import { cx } from '../utils/cx';
import { resolveWidgetTreeLabMode, type WidgetTreeViewMode } from './widget-tree-mode.js';

export interface WidgetTreeModeControlsProps {
  readonly className?: string | undefined;
  readonly mode: WidgetTreeViewMode;
  readonly onModeChange: (mode: WidgetTreeViewMode) => void;
}

export function WidgetTreeModeControls({
  className,
  mode,
  onModeChange,
}: WidgetTreeModeControlsProps) {
  const resolvedMode = resolveWidgetTreeLabMode(mode);

  return (
    <div
      className={cx('ui-workbench-artifact-shell__modes', 'widget-tree-mode-controls', className)}
    >
      <IconButton
        aria-pressed={resolvedMode === 'design'}
        className={cx(
          'ui-workbench-artifact-shell__mode',
          resolvedMode === 'design' && 'ui-workbench-artifact-shell__mode--active',
        )}
        icon="codicon-layout-sidebar-right"
        label="Design"
        onClick={() => onModeChange('design')}
      />
      <IconButton
        aria-pressed={resolvedMode === 'code'}
        className={cx(
          'ui-workbench-artifact-shell__mode',
          resolvedMode === 'code' && 'ui-workbench-artifact-shell__mode--active',
        )}
        icon="codicon-code"
        label="Code"
        onClick={() => onModeChange('code')}
      />
    </div>
  );
}
