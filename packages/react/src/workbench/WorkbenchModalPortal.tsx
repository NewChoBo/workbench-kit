import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { WORKBENCH_OVERLAYS_CLASS } from '../modal/modalContainer';
import { useWorkbenchOverlaysContainer } from './workbenchOverlaysContext';

export interface WorkbenchModalPortalProps {
  readonly children: ReactNode;
}

type WorkbenchModalPlacement = 'pending' | 'in-place' | 'portal';

/**
 * Portals modal chrome into `.ide-workbench-overlays` when the dialog is rendered
 * outside that surface (e.g. via a host state hook). When already mounted inside
 * overlays, children render in place so containment sizing stays correct.
 */
export function WorkbenchModalPortal({ children }: WorkbenchModalPortalProps): ReactNode {
  const overlaysContainer = useWorkbenchOverlaysContainer();
  const hostRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<WorkbenchModalPlacement>('pending');

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null || overlaysContainer === null) {
      setPlacement('pending');
      return;
    }

    const insideOverlays = host.closest(`.${WORKBENCH_OVERLAYS_CLASS}`) !== null;
    setPlacement(insideOverlays ? 'in-place' : 'portal');
  }, [overlaysContainer]);

  if (placement === 'portal') {
    return (
      <>
        <span ref={hostRef} aria-hidden className="workbench-modal-portal-host" hidden />
        {createPortal(children, overlaysContainer!)}
      </>
    );
  }

  if (placement === 'in-place') {
    return (
      <span ref={hostRef} className="workbench-modal-portal-host">
        {children}
      </span>
    );
  }

  return <span ref={hostRef} aria-hidden className="workbench-modal-portal-host" hidden />;
}
