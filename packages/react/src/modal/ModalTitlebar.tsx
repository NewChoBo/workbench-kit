import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { useWorkbenchHostPlatform } from '../workbench/chrome/WorkbenchPlatformContext';
import {
  shouldUseDarwinPlatformChrome,
  WorkbenchWindowChromeControls,
} from '../workbench/shell/WorkbenchWindowChromeControls';
import {
  resolveWorkbenchWindowChromeDataAttributes,
  type WorkbenchWindowChromeMode,
} from '../workbench/chrome/workbenchPlatformChrome';

export interface ModalTitlebarProps {
  chrome?: WorkbenchWindowChromeMode;
  closeLabel?: string;
  labelledBy: string;
  maximized: boolean;
  maximizeLabel?: string;
  onClose: () => void;
  onDoubleClick: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleMaximized: () => void;
  restoreLabel?: string;
  title: ReactNode;
  titleSuffix?: ReactNode;
}

export function ModalTitlebar({
  chrome = 'platform',
  closeLabel = 'Close modal',
  labelledBy,
  maximized,
  maximizeLabel = 'Maximize modal',
  onClose,
  onDoubleClick,
  onPointerDown,
  onToggleMaximized,
  restoreLabel = 'Restore modal',
  title,
  titleSuffix,
}: ModalTitlebarProps) {
  const platform = useWorkbenchHostPlatform();
  const useDarwinChrome = shouldUseDarwinPlatformChrome(chrome, platform);
  const chromeAttributes = resolveWorkbenchWindowChromeDataAttributes(chrome);

  return (
    <div className="ui-modal__titlebar" {...(chromeAttributes ?? {})}>
      {useDarwinChrome ? (
        <WorkbenchWindowChromeControls
          chrome={chrome}
          closeLabel={closeLabel}
          isMaximized={maximized}
          maximizeLabel={maximizeLabel}
          restoreLabel={restoreLabel}
          showMinimize={false}
          surface="modal"
          onClose={onClose}
          onToggleMaximized={onToggleMaximized}
        />
      ) : null}
      <div
        className="ui-modal__titlebar-drag"
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
      >
        <span id={labelledBy} className="ui-modal__title">
          {title}
          {titleSuffix}
        </span>
      </div>
      {!useDarwinChrome ? (
        <WorkbenchWindowChromeControls
          chrome={chrome}
          closeLabel={closeLabel}
          isMaximized={maximized}
          maximizeLabel={maximizeLabel}
          restoreLabel={restoreLabel}
          showMinimize={false}
          surface="modal"
          onClose={onClose}
          onToggleMaximized={onToggleMaximized}
        />
      ) : null}
    </div>
  );
}
