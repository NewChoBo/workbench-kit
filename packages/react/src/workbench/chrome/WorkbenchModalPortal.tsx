import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { WORKBENCH_OVERLAYS_CLASS } from '../../modal/modalContainer';
import { useWorkbenchOverlaysContainer } from './workbenchOverlaysContext';

export interface WorkbenchModalPortalProps {
  readonly children: ReactNode;
}

type WorkbenchModalPlacement = 'pending' | 'in-place' | 'portal';

const THEME_HOST_SELECTOR =
  '[data-shell-preset], [data-theme-preset], [data-theme-preference], [data-theme], [data-workbench-platform], .ui-workbench-host-root';

interface StandaloneThemeSnapshot {
  readonly shellPreset: string | undefined;
  readonly style: CSSProperties;
  readonly theme: string | undefined;
  readonly themePreference: string | undefined;
  readonly themePreset: string | undefined;
  readonly workbenchPlatform: string | undefined;
}

function readStandaloneTheme(host: HTMLElement | null): StandaloneThemeSnapshot | null {
  if (host === null) {
    return null;
  }

  const themeHosts: HTMLElement[] = [];
  for (let element = host.parentElement; element !== null; element = element.parentElement) {
    if (element.matches(THEME_HOST_SELECTOR)) {
      themeHosts.unshift(element);
    }
  }

  const customProperties: Record<string, string> = {};
  for (const themeHost of themeHosts) {
    for (let index = 0; index < themeHost.style.length; index += 1) {
      const property = themeHost.style.item(index);
      if (property.startsWith('--')) {
        customProperties[property] = themeHost.style.getPropertyValue(property);
      }
    }
    const themeHostStyle = themeHost.ownerDocument.defaultView?.getComputedStyle(themeHost);
    for (let index = 0; index < (themeHostStyle?.length ?? 0); index += 1) {
      const property = themeHostStyle!.item(index);
      if (property.startsWith('--')) {
        customProperties[property] = themeHostStyle!.getPropertyValue(property);
      }
    }
  }

  const computedStyle = host.ownerDocument.defaultView?.getComputedStyle(host);
  for (let index = 0; index < (computedStyle?.length ?? 0); index += 1) {
    const property = computedStyle!.item(index);
    if (property.startsWith('--')) {
      customProperties[property] = computedStyle!.getPropertyValue(property);
    }
  }

  let shellPreset: string | undefined;
  let theme: string | undefined;
  let themePreference: string | undefined;
  let themePreset: string | undefined;
  let workbenchPlatform: string | undefined;
  for (const themeHost of themeHosts) {
    shellPreset = themeHost.dataset.shellPreset ?? shellPreset;
    theme = themeHost.dataset.theme ?? theme;
    themePreference = themeHost.dataset.themePreference ?? themePreference;
    themePreset = themeHost.dataset.themePreset ?? themePreset;
    workbenchPlatform = themeHost.dataset.workbenchPlatform ?? workbenchPlatform;
  }

  if (themeHosts.length === 0 && Object.keys(customProperties).length === 0) {
    return null;
  }

  return {
    shellPreset,
    style: { display: 'contents', ...customProperties } as CSSProperties,
    theme,
    themePreference,
    themePreset,
    workbenchPlatform,
  };
}

/**
 * Portals modal chrome into `.ide-workbench-overlays` when the dialog is rendered
 * outside that surface (e.g. via a host state hook). When already mounted inside
 * overlays, children render in place so containment sizing stays correct.
 */
export function WorkbenchModalPortal({ children }: WorkbenchModalPortalProps): ReactNode {
  const overlaysContainer = useWorkbenchOverlaysContainer();
  const hostRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<WorkbenchModalPlacement>('pending');
  const portalContainer =
    overlaysContainer === undefined && typeof document !== 'undefined'
      ? document.body
      : overlaysContainer;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null || portalContainer === null || portalContainer === undefined) {
      setPlacement('pending');
      return;
    }

    const insideOverlays = host.closest(`.${WORKBENCH_OVERLAYS_CLASS}`) !== null;
    setPlacement(insideOverlays ? 'in-place' : 'portal');
  }, [portalContainer]);

  if (placement === 'portal') {
    const standaloneTheme =
      portalContainer === document.body ? readStandaloneTheme(hostRef.current) : null;
    const portalChildren = standaloneTheme ? (
      <div
        data-shell-preset={standaloneTheme.shellPreset}
        data-theme={standaloneTheme.theme}
        data-theme-preference={standaloneTheme.themePreference}
        data-theme-preset={standaloneTheme.themePreset}
        data-workbench-modal-portal-theme="true"
        data-workbench-platform={standaloneTheme.workbenchPlatform}
        style={standaloneTheme.style}
      >
        {children}
      </div>
    ) : (
      children
    );
    return (
      <>
        <span ref={hostRef} aria-hidden className="workbench-modal-portal-host" hidden />
        {createPortal(portalChildren, portalContainer!)}
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
