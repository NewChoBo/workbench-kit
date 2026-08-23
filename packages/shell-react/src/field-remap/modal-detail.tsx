import type { JSX, ReactNode } from 'react';
import { Modal } from '@workbench-kit/react/modal';
import { WorkbenchModalPortal } from '@workbench-kit/react/workbench/modal-portal';

export interface FieldRemapModalDetailProps {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly title: string;
}

export function FieldRemapModalDetail({
  children,
  closeLabel,
  onClose,
  title,
}: FieldRemapModalDetailProps): JSX.Element {
  return (
    <WorkbenchModalPortal>
      <Modal
        bodyClassName="workbench-field-remap-detail-modal__body"
        bodyPadding="none"
        bodyScroll="auto"
        className="workbench-field-remap-detail-modal"
        closeLabel={closeLabel}
        closeOnEscape={false}
        title={title}
        onClose={onClose}
      >
        {children}
      </Modal>
    </WorkbenchModalPortal>
  );
}
