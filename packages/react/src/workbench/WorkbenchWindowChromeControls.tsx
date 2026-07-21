import type { ReactNode } from 'react';

import { cx } from '../utils/cx';
import { useWorkbenchHostPlatform } from './WorkbenchPlatformContext';
import type { WorkbenchHostPlatform, WorkbenchWindowChromeMode } from './workbenchPlatformChrome';

export interface WorkbenchWindowChromeControlsProps {
  chrome?: WorkbenchWindowChromeMode | undefined;
  closeLabel?: string | undefined;
  isMaximized?: boolean | undefined;
  maximizeLabel?: string | undefined;
  minimizeLabel?: string | undefined;
  onClose: () => void;
  onMinimize?: (() => void) | undefined;
  onToggleMaximized?: (() => void) | undefined;
  restoreLabel?: string | undefined;
  showMaximize?: boolean | undefined;
  showMinimize?: boolean | undefined;
  surface: 'desktop-titlebar' | 'modal';
}

export function WorkbenchWindowChromeControls({
  chrome = 'platform',
  closeLabel = 'Close',
  isMaximized = false,
  maximizeLabel = 'Maximize',
  minimizeLabel = 'Minimize',
  onClose,
  onMinimize,
  onToggleMaximized,
  restoreLabel = 'Restore',
  showMaximize = true,
  showMinimize = true,
  surface,
}: WorkbenchWindowChromeControlsProps): ReactNode {
  const platform = useWorkbenchHostPlatform();

  if (chrome !== 'platform') {
    return renderGenericControls({
      closeLabel,
      isMaximized,
      maximizeLabel,
      minimizeLabel,
      onClose,
      onMinimize,
      onToggleMaximized,
      restoreLabel,
      showMaximize,
      showMinimize,
      surface,
    });
  }

  if (platform === 'darwin') {
    return renderDarwinControls({
      closeLabel,
      isMaximized,
      maximizeLabel,
      minimizeLabel,
      onClose,
      onMinimize,
      onToggleMaximized,
      restoreLabel,
      showMaximize,
      showMinimize,
      surface,
    });
  }

  return renderWindowsControls({
    closeLabel,
    isMaximized,
    maximizeLabel,
    minimizeLabel,
    onClose,
    onMinimize,
    onToggleMaximized,
    restoreLabel,
    showMaximize,
    showMinimize,
    surface,
  });
}

interface SharedControlProps {
  closeLabel: string;
  isMaximized: boolean;
  maximizeLabel: string;
  minimizeLabel: string;
  onClose: () => void;
  onMinimize?: (() => void) | undefined;
  onToggleMaximized?: (() => void) | undefined;
  restoreLabel: string;
  showMaximize: boolean;
  showMinimize: boolean;
  surface: 'desktop-titlebar' | 'modal';
}

function renderDarwinControls({
  closeLabel,
  isMaximized,
  maximizeLabel,
  minimizeLabel,
  onClose,
  onMinimize,
  onToggleMaximized,
  restoreLabel,
  showMaximize,
  showMinimize,
  surface,
}: SharedControlProps): ReactNode {
  const maximizeTitle = isMaximized ? restoreLabel : maximizeLabel;

  return (
    <div
      className={cx(
        'ui-workbench-window-chrome-controls',
        'ui-workbench-window-chrome-controls--darwin',
        surface === 'modal' && 'ui-workbench-window-chrome-controls--modal',
      )}
    >
      <button
        aria-label={closeLabel}
        className="ui-workbench-window-chrome-control ui-workbench-window-chrome-control--darwin ui-workbench-window-chrome-control--close"
        title={closeLabel}
        type="button"
        onClick={onClose}
      >
        <span aria-hidden="true" className="ui-workbench-window-chrome-control__glyph" />
      </button>
      {showMinimize && onMinimize ? (
        <button
          aria-label={minimizeLabel}
          className="ui-workbench-window-chrome-control ui-workbench-window-chrome-control--darwin ui-workbench-window-chrome-control--minimize"
          title={minimizeLabel}
          type="button"
          onClick={onMinimize}
        >
          <span aria-hidden="true" className="ui-workbench-window-chrome-control__glyph" />
        </button>
      ) : null}
      {showMaximize && onToggleMaximized ? (
        <button
          aria-label={maximizeTitle}
          className="ui-workbench-window-chrome-control ui-workbench-window-chrome-control--darwin ui-workbench-window-chrome-control--zoom"
          title={maximizeTitle}
          type="button"
          onClick={onToggleMaximized}
        >
          <span aria-hidden="true" className="ui-workbench-window-chrome-control__glyph" />
        </button>
      ) : null}
    </div>
  );
}

function renderWindowsControls({
  closeLabel,
  isMaximized,
  maximizeLabel,
  minimizeLabel,
  onClose,
  onMinimize,
  onToggleMaximized,
  restoreLabel,
  showMaximize,
  showMinimize,
  surface,
}: SharedControlProps): ReactNode {
  const maximizeTitle = isMaximized ? restoreLabel : maximizeLabel;
  const controlClassName =
    surface === 'modal'
      ? 'ui-modal__control ui-workbench-window-chrome-control--win32'
      : 'ui-workbench-desktop-titlebar__control ui-workbench-window-chrome-control--win32';
  const closeClassName =
    surface === 'modal'
      ? cx(controlClassName, 'ui-modal__close')
      : cx(controlClassName, 'ui-workbench-desktop-titlebar__control--close');
  const containerClassName =
    surface === 'modal'
      ? 'ui-modal__controls ui-workbench-window-chrome-controls ui-workbench-window-chrome-controls--win32'
      : 'ui-workbench-desktop-titlebar__controls ui-workbench-window-chrome-controls ui-workbench-window-chrome-controls--win32';

  return (
    <div className={containerClassName}>
      {showMinimize && onMinimize ? (
        <button
          aria-label={minimizeLabel}
          className={controlClassName}
          title={minimizeLabel}
          type="button"
          onClick={onMinimize}
        >
          <i aria-hidden="true" className="codicon codicon-chrome-minimize" />
        </button>
      ) : null}
      {showMaximize && onToggleMaximized ? (
        <button
          aria-label={maximizeTitle}
          className={controlClassName}
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
      ) : null}
      <button
        aria-label={closeLabel}
        className={closeClassName}
        title={closeLabel}
        type="button"
        onClick={onClose}
      >
        <i
          aria-hidden="true"
          className={cx('codicon', surface === 'modal' ? 'codicon-close' : 'codicon-chrome-close')}
        />
      </button>
    </div>
  );
}

function renderGenericControls({
  closeLabel,
  isMaximized,
  maximizeLabel,
  onClose,
  onToggleMaximized,
  restoreLabel,
  showMaximize,
  surface,
}: SharedControlProps): ReactNode {
  const maximizeTitle = isMaximized ? restoreLabel : maximizeLabel;
  const controlClassName =
    surface === 'modal' ? 'ui-modal__control' : 'ui-workbench-desktop-titlebar__control';
  const closeClassName =
    surface === 'modal'
      ? cx(controlClassName, 'ui-modal__close')
      : cx(controlClassName, 'ui-workbench-desktop-titlebar__control--close');
  const containerClassName =
    surface === 'modal' ? 'ui-modal__controls' : 'ui-workbench-desktop-titlebar__controls';

  return (
    <div className={containerClassName}>
      {showMaximize && onToggleMaximized ? (
        <button
          aria-label={maximizeTitle}
          className={controlClassName}
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
      ) : null}
      <button
        aria-label={closeLabel}
        className={closeClassName}
        title={closeLabel}
        type="button"
        onClick={onClose}
      >
        <i
          aria-hidden="true"
          className={cx('codicon', surface === 'modal' ? 'codicon-close' : 'codicon-chrome-close')}
        />
      </button>
    </div>
  );
}

export function shouldUseDarwinPlatformChrome(
  chrome: WorkbenchWindowChromeMode,
  platform: WorkbenchHostPlatform,
): boolean {
  return chrome === 'platform' && platform === 'darwin';
}
