import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import { useWorkbenchHostPlatform } from './WorkbenchPlatformContext';
import {
  shouldUseDarwinPlatformChrome,
  WorkbenchWindowChromeControls,
} from './WorkbenchWindowChromeControls';
import {
  resolveWorkbenchWindowChromeDataAttributes,
  type WorkbenchWindowChromeMode,
} from './workbenchPlatformChrome';

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
  return (
    <WorkbenchWindowChromeControls
      chrome="generic"
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
  chrome?: WorkbenchWindowChromeMode | undefined;
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
      closeLabel={windowControls.closeLabel}
      isMaximized={windowControls.isMaximized}
      maximizeLabel={windowControls.maximizeLabel}
      minimizeLabel={windowControls.minimizeLabel}
      restoreLabel={windowControls.restoreLabel}
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
