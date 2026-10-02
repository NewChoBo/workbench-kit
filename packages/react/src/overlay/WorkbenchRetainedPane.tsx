import {
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  WorkbenchOverlaysProvider,
  useWorkbenchOverlaysContainer,
} from '../workbench/chrome/workbenchOverlaysContext';
import { WorkbenchPresentationScopeContext } from './presentationScope';

/** Opt-in pane ownership shared by framed and standalone splits. */
export function WorkbenchRetainedPane({
  active,
  enabled,
  children,
  fallbackBounds,
}: {
  active: boolean;
  enabled: boolean;
  children: ReactNode;
  fallbackBounds: RefObject<HTMLElement | null>;
}) {
  const inheritedContainer = useWorkbenchOverlaysContainer();
  const parent = useContext(WorkbenchPresentationScopeContext);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const scopeActive = active && parent?.active !== false;
  const bounds = parent?.bounds ?? fallbackBounds;
  const scope = useMemo(
    () => ({ active: scopeActive, bounds, container }),
    [scopeActive, bounds, container],
  );
  const [standaloneTarget, setStandaloneTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!enabled || parent || typeof document === 'undefined') return;
    setStandaloneTarget(
      fallbackBounds.current?.closest<HTMLElement>(
        '[data-theme-preset], [data-theme], .ui-workbench-host-root',
      ) ?? document.body,
    );
  }, [enabled, fallbackBounds, parent]);
  const target = enabled ? (parent ? parent.container : standaloneTarget) : null;
  return (
    <WorkbenchPresentationScopeContext.Provider value={enabled ? scope : parent}>
      <WorkbenchOverlaysProvider container={enabled ? container : inheritedContainer}>
        {children}
        {target
          ? createPortal(
              <div
                ref={setContainer}
                className="ide-workbench-overlays ui-workbench-pane-overlays"
                data-workbench-presentation-pane=""
                hidden={!scopeActive}
                inert={!scopeActive}
              />,
              target,
            )
          : null}
      </WorkbenchOverlaysProvider>
    </WorkbenchPresentationScopeContext.Provider>
  );
}
