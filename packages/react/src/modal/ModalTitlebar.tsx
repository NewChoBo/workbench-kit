import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { useWorkbenchHostPlatform } from '../workbench/WorkbenchPlatformContext';
import {
  shouldUseDarwinPlatformChrome,
  WorkbenchWindowChromeControls,
} from '../workbench/WorkbenchWindowChromeControls';
import {
  resolveWorkbenchWindowChromeDataAttributes,
  type WorkbenchWindowChromeMode,
} from '../workbench/workbenchPlatformChrome';

export interface ModalTitlebarProps {
  chrome?: WorkbenchWindowChromeMode | undefined;
  closeLabel?: string | undefined;
  labelledBy: string;
  maximized: boolean;
  maximizeLabel?: string | undefined;
  onClose: () => void;
  onDoubleClick: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleMaximized: () => void;
  restoreLabel?: string | undefined;
  title: ReactNode;
  titleSuffix?: ReactNode | undefined;
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
