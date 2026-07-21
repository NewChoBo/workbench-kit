import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { IconButton } from '../primitives/icon-button';
import { cx } from '../utils/cx';
import { resolveWidgetTreeLabMode, type WidgetTreeViewMode } from './widget-tree-mode.js';

export interface WidgetTreeModeControlsProps {
  readonly className?: string | undefined;
  readonly mode: WidgetTreeViewMode;
  readonly onModeChange: (mode: WidgetTreeViewMode) => void;
}

/** Ctrl/Cmd+1 → Design, Ctrl/Cmd+2 → Code. Ignores Alt/Shift chords. */
export function resolveWidgetTreeModeShortcut(
  event: Pick<
    KeyboardEvent | ReactKeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
  >,
): WidgetTreeViewMode | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
    return null;
  }

  if (event.key === '1') {
    return 'design';
  }

  if (event.key === '2') {
    return 'code';
  }

  return null;
}

export function WidgetTreeModeControls({
  className,
  mode,
  onModeChange,
}: WidgetTreeModeControlsProps) {
  const resolvedMode = resolveWidgetTreeLabMode(mode);

  return (
    <div
      aria-keyshortcuts="Control+1 Control+2 Meta+1 Meta+2"
      aria-label="Widget editor mode"
      className={cx('ui-workbench-artifact-shell__modes', 'widget-tree-mode-controls', className)}
      data-testid="widget-tree-mode-controls"
      role="toolbar"
    >
      <IconButton
        aria-pressed={resolvedMode === 'design'}
        className={cx(
          'ui-workbench-artifact-shell__mode',
          resolvedMode === 'design' && 'ui-workbench-artifact-shell__mode--active',
        )}
        icon="codicon-layout-sidebar-right"
        label="Design"
        title="Design (Ctrl+1)"
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
        title="Code (Ctrl+2)"
        onClick={() => onModeChange('code')}
      />
    </div>
  );
}
