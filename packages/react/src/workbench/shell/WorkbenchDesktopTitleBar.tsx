import '../chrome/workbench-desktop-titlebar.css';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { useWorkbenchHostPlatform } from '../chrome/WorkbenchPlatformContext';
import {
  shouldUseDarwinPlatformChrome,
  WorkbenchWindowChromeControls,
} from './WorkbenchWindowChromeControls';
import {
  resolveWorkbenchWindowChromeDataAttributes,
  type WorkbenchWindowChromeMode,
} from '../chrome/workbenchPlatformChrome';

export interface WorkbenchDesktopWindowControlsProps {
  /** Defaults to `platform` so standalone controls match `WorkbenchDesktopTitleBar`. */
  chrome?: WorkbenchWindowChromeMode | undefined;
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
 * Pass host IPC callbacks only — kit owns platform chrome markup and placement.
 * Marked `-webkit-app-region: no-drag` in CSS so clicks reach the buttons instead
 * of starting a window drag from the surrounding titlebar.
 */
export function WorkbenchDesktopWindowControls({
  chrome = 'platform',
  closeLabel = 'Close window',
  isMaximized,
  maximizeLabel = 'Maximize window',
  minimizeLabel = 'Minimize window',
  onClose,
  onMinimize,
  onToggleMaximized,
  restoreLabel = 'Restore window',
}: WorkbenchDesktopWindowControlsProps) {
  return (
    <WorkbenchWindowChromeControls
      chrome={chrome}
      closeLabel={closeLabel}
      isMaximized={isMaximized}
      maximizeLabel={maximizeLabel}
      minimizeLabel={minimizeLabel}
      restoreLabel={restoreLabel}
      surface="desktop-titlebar"
      onClose={onClose}
      onMinimize={onMinimize}
      onToggleMaximized={onToggleMaximized}
    />
  );
}

export interface WorkbenchDesktopTitleBarProps {
  /** Optional center area, e.g. a command-menu trigger. Omit to leave it empty. */
  centerSlot?: ReactNode | undefined;
  /**
   * `platform` (default): darwin traffic lights / win32 caption buttons via host platform context.
   * `generic`: maximize + close only (modal-like), no OS-specific placement.
   */
  chrome?: WorkbenchWindowChromeMode | undefined;
  className?: string | undefined;
  leading?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  /**
   * Host-supplied window actions (Electron IPC callbacks). Omit on platforms that keep a native frame.
   * Kit owns chrome markup; the host owns minimize / maximize / close side effects only.
   */
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
  chrome = 'platform',
  className,
  leading,
  trailing,
  windowControls,
}: WorkbenchDesktopTitleBarProps) {
  const platform = useWorkbenchHostPlatform();
  const useDarwinChrome = shouldUseDarwinPlatformChrome(chrome, platform);
  const chromeAttributes = resolveWorkbenchWindowChromeDataAttributes(chrome);

  const controls = windowControls ? (
    <WorkbenchWindowChromeControls
      chrome={chrome}
      closeLabel={windowControls.closeLabel ?? 'Close window'}
      isMaximized={windowControls.isMaximized}
      maximizeLabel={windowControls.maximizeLabel ?? 'Maximize window'}
      minimizeLabel={windowControls.minimizeLabel ?? 'Minimize window'}
      restoreLabel={windowControls.restoreLabel ?? 'Restore window'}
      surface="desktop-titlebar"
      onClose={windowControls.onClose}
      onMinimize={windowControls.onMinimize}
      onToggleMaximized={windowControls.onToggleMaximized}
    />
  ) : null;

  return (
    <div className={cx('ui-workbench-desktop-titlebar', className)} {...(chromeAttributes ?? {})}>
      <div className="ui-workbench-desktop-titlebar__leading">
        {useDarwinChrome ? controls : null}
        {leading}
      </div>
      {centerSlot ? (
        <div className="ui-workbench-desktop-titlebar__center">{centerSlot}</div>
      ) : null}
      <div className="ui-workbench-desktop-titlebar__trailing">
        {trailing}
        {!useDarwinChrome ? controls : null}
      </div>
    </div>
  );
}
