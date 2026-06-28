import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface WorkbenchDesktopWindowControlsProps {
  closeLabel?: string | undefined;
  isMaximized: boolean;
  maximizeLabel?: string | undefined;
  minimizeLabel?: string | undefined;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximized: () => void;
  restoreLabel?: string | undefined;
}

/**
 * Minimize/maximize/close buttons for a frameless Electron (or similar) window.
 * Marked `-webkit-app-region: no-drag` in CSS so clicks reach the buttons instead
 * of starting a window drag from the surrounding titlebar.
 */
export function WorkbenchDesktopWindowControls({
  closeLabel = 'Close window',
  isMaximized,
  maximizeLabel = 'Maximize window',
  minimizeLabel = 'Minimize window',
  onClose,
  onMinimize,
  onToggleMaximized,
  restoreLabel = 'Restore window',
}: WorkbenchDesktopWindowControlsProps) {
  const maximizeTitle = isMaximized ? restoreLabel : maximizeLabel;

  return (
    <div className="ui-workbench-desktop-titlebar__controls">
      <button
        aria-label={minimizeLabel}
        className="ui-workbench-desktop-titlebar__control"
        title={minimizeLabel}
        type="button"
        onClick={onMinimize}
      >
        <i aria-hidden="true" className="codicon codicon-chrome-minimize" />
      </button>
      <button
        aria-label={maximizeTitle}
        className="ui-workbench-desktop-titlebar__control"
        title={maximizeTitle}
        type="button"
        onClick={onToggleMaximized}
      >
        <i
          aria-hidden="true"
          className={cx(
            'codicon',
            isMaximized ? 'codicon-chrome-restore' : 'codicon-chrome-maximize',
          )}
        />
      </button>
      <button
        aria-label={closeLabel}
        className="ui-workbench-desktop-titlebar__control ui-workbench-desktop-titlebar__control--close"
        title={closeLabel}
        type="button"
        onClick={onClose}
      >
        <i aria-hidden="true" className="codicon codicon-chrome-close" />
      </button>
    </div>
  );
}

export interface WorkbenchDesktopTitleBarProps {
  /** Optional center area, e.g. a command-menu trigger. Omit to leave it empty. */
  centerSlot?: ReactNode | undefined;
  className?: string | undefined;
  leading?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  /** Omit entirely (rather than passing `false`) on platforms with native window chrome. */
  windowControls?: WorkbenchDesktopWindowControlsProps | undefined;
}

/**
 * Drop-in content for `WorkbenchShellProps.titleBar` when the host window has no native
 * frame (`BrowserWindow({ frame: false })`). The whole bar is `-webkit-app-region: drag`
 * by default; `leading`/`centerSlot`/`trailing` are `no-drag` so their own controls stay
 * clickable.
 */
export function WorkbenchDesktopTitleBar({
  centerSlot,
  className,
  leading,
  trailing,
  windowControls,
}: WorkbenchDesktopTitleBarProps) {
  return (
    <div className={cx('ui-workbench-desktop-titlebar', className)}>
      <div className="ui-workbench-desktop-titlebar__leading">{leading}</div>
      {centerSlot ? (
        <div className="ui-workbench-desktop-titlebar__center">{centerSlot}</div>
      ) : null}
      <div className="ui-workbench-desktop-titlebar__trailing">
        {trailing}
        {windowControls ? <WorkbenchDesktopWindowControls {...windowControls} /> : null}
      </div>
    </div>
  );
}
