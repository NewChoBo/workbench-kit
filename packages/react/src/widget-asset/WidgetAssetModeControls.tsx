import { IconButton } from '../primitives/IconButton';
import { cx } from '../utils/cx';
import type { WidgetAssetViewMode } from './widget-asset-mode.js';

export interface WidgetAssetModeControlsProps {
  readonly className?: string | undefined;
  readonly mode: WidgetAssetViewMode;
  readonly onModeChange: (mode: WidgetAssetViewMode) => void;
}

export function WidgetAssetModeControls({
  className,
  mode,
  onModeChange,
}: WidgetAssetModeControlsProps) {
  return (
    <div
      className={cx('ui-workbench-artifact-shell__modes', 'widget-asset-mode-controls', className)}
    >
      <IconButton
        aria-pressed={mode === 'design'}
        className={cx(
          'ui-workbench-artifact-shell__mode',
          mode === 'design' && 'ui-workbench-artifact-shell__mode--active',
        )}
        icon="codicon-edit"
        label="Design"
        onClick={() => onModeChange('design')}
      />
      <IconButton
        aria-pressed={mode === 'code'}
        className={cx(
          'ui-workbench-artifact-shell__mode',
          mode === 'code' && 'ui-workbench-artifact-shell__mode--active',
        )}
        icon="codicon-code"
        label="Code"
        onClick={() => onModeChange('code')}
      />
    </div>
  );
}
