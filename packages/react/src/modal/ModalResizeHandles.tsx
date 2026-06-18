import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ModalResizeEdge } from './modalTypes';

export interface ModalResizeHandlesProps {
  onResizeStart: (edge: ModalResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => void;
}

const RESIZE_HANDLES: Array<{ edge: ModalResizeEdge; className: string }> = [
  { edge: 'n', className: 'ui-modal__resize-handle--n' },
  { edge: 's', className: 'ui-modal__resize-handle--s' },
  { edge: 'e', className: 'ui-modal__resize-handle--e' },
  { edge: 'w', className: 'ui-modal__resize-handle--w' },
  { edge: 'ne', className: 'ui-modal__resize-handle--ne' },
  { edge: 'nw', className: 'ui-modal__resize-handle--nw' },
  { edge: 'se', className: 'ui-modal__resize-handle--se' },
  { edge: 'sw', className: 'ui-modal__resize-handle--sw' },
];

export function ModalResizeHandles({ onResizeStart }: ModalResizeHandlesProps) {
  return (
    <>
      {RESIZE_HANDLES.map(({ edge, className }) => (
        <div
          key={edge}
          aria-hidden="true"
          className={`ui-modal__resize-handle ${className}`}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onResizeStart(edge, event);
          }}
        />
      ))}
    </>
  );
}
