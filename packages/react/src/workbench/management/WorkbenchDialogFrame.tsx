import type { FormEventHandler, ReactNode } from 'react';
import { Modal, type ModalBodyLayout, type ModalBodyPadding } from '../../modal/Modal';
import type { WorkbenchWindowChromeMode } from '../workbenchPlatformChrome';

export type WorkbenchDialogBodyLayout = 'column-fill' | 'default' | 'padded-fill';
export type WorkbenchDialogFrameSize =
  | 'asset-library'
  | 'auto'
  | 'metadata-editor'
  | 'source-manager'
  | 'wide';

export interface WorkbenchDialogFrameProps {
  ariaLabel: string;
  bodyLayout?: WorkbenchDialogBodyLayout;
  chrome?: WorkbenchWindowChromeMode;
  children: ReactNode;
  closeLabel: string;
  dataAttributes?: Record<string, string>;
  defaultMaximized?: boolean;
  frameSize?: WorkbenchDialogFrameSize;
  maximizeLabel?: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  restoreLabel?: string;
  surfaceDataAttributes?: Record<string, string>;
  title: ReactNode;
}

export function WorkbenchDialogFrame({
  ariaLabel,
  bodyLayout = 'default',
  chrome = 'platform',
  children,
  closeLabel,
  dataAttributes,
  defaultMaximized = false,
  frameSize = 'auto',
  maximizeLabel,
  onClose,
  onSubmit,
  restoreLabel,
  surfaceDataAttributes,
  title,
}: WorkbenchDialogFrameProps) {
  const size = resolveWorkbenchDialogSize(frameSize);
  const layout = resolveWorkbenchDialogBodyLayout(bodyLayout);

  return (
    <div aria-label={ariaLabel} {...(dataAttributes ?? {})}>
      <Modal
        bodyClassName={layout.bodyClassName}
        bodyLayout={layout.bodyLayout}
        bodyPadding={layout.bodyPadding}
        bodyScroll={layout.bodyScroll}
        chrome={chrome}
        className="workbench-dialog-frame"
        closeLabel={closeLabel}
        defaultHeight={size.defaultHeight}
        defaultMaximized={defaultMaximized}
        defaultWidth={size.defaultWidth}
        maximizeLabel={maximizeLabel}
        minHeight={size.minHeight}
        minWidth={size.minWidth}
        onClose={onClose}
        onSubmit={onSubmit}
        restoreLabel={restoreLabel}
        title={title}
      >
        <div
          className="flex h-full min-h-0 flex-col"
          data-workbench-dialog-surface="true"
          {...(surfaceDataAttributes ?? {})}
        >
          {children}
        </div>
      </Modal>
    </div>
  );
}

function resolveWorkbenchDialogSize(frameSize: WorkbenchDialogFrameSize): {
  defaultHeight: number;
  defaultWidth: number;
  minHeight: number;
  minWidth: number;
} {
  switch (frameSize) {
    case 'asset-library':
      return {
        defaultHeight: 760,
        defaultWidth: 1120,
        minHeight: 420,
        minWidth: 720,
      };
    case 'source-manager':
    case 'wide':
      return {
        defaultHeight: 760,
        defaultWidth: 1080,
        minHeight: 420,
        minWidth: 720,
      };
    case 'metadata-editor':
      return {
        defaultHeight: 760,
        defaultWidth: 680,
        minHeight: 420,
        minWidth: 480,
      };
    case 'auto':
      return {
        defaultHeight: 520,
        defaultWidth: 720,
        minHeight: 320,
        minWidth: 420,
      };
  }
}

function resolveWorkbenchDialogBodyLayout(bodyLayout: WorkbenchDialogBodyLayout): {
  bodyClassName?: string;
  bodyLayout: ModalBodyLayout;
  bodyPadding: ModalBodyPadding;
  bodyScroll: 'auto' | 'hidden';
} {
  switch (bodyLayout) {
    case 'column-fill':
      return {
        bodyClassName: 'min-h-0 flex-1',
        bodyLayout: 'stack',
        bodyPadding: 'none',
        bodyScroll: 'hidden',
      };
    case 'padded-fill':
      return {
        bodyClassName: 'min-h-0 flex-1',
        bodyLayout: 'stack',
        bodyPadding: 'md',
        bodyScroll: 'hidden',
      };
    case 'default':
      return {
        bodyLayout: 'block',
        bodyPadding: 'none',
        bodyScroll: 'hidden',
      };
  }
}
