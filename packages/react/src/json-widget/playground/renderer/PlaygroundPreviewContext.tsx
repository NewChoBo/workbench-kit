import { createContext, useContext, type ReactNode } from 'react';
import type { GenericWidget, WidgetPatch } from '@workbench-kit/json-widget';

export interface PlaygroundPreviewContextValue {
  root: GenericWidget;
  onPatch?: ((patch: WidgetPatch) => void) | undefined;
  resolveAssetSrc?: ((src: string) => string) | undefined;
  showSnapGrid?: boolean | undefined;
  snapGridSize?: number | undefined;
  selectionEnabled?: boolean | undefined;
  viewportScale?: number | undefined;
}

const PlaygroundPreviewContext = createContext<PlaygroundPreviewContextValue | null>(null);

export function PlaygroundPreviewProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: PlaygroundPreviewContextValue;
}) {
  return (
    <PlaygroundPreviewContext.Provider value={value}>{children}</PlaygroundPreviewContext.Provider>
  );
}

export function usePlaygroundPreviewContext(): PlaygroundPreviewContextValue | null {
  return useContext(PlaygroundPreviewContext);
}
