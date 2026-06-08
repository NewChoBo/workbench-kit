import { createContext, useContext, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import type { WidgetRendererComponent } from './contract.js';

/**
 * Registry of consumer-supplied widget renderers, keyed by `widget.type`.
 * Builtin layout/leaf renderers are resolved as a fallback, so the registry
 * only needs to hold domain-specific extensions (e.g. a `tile` or `clock`).
 */
export type WidgetRendererRegistry = WidgetRegistryContract<WidgetRendererComponent>;

/**
 * Adapter that maps a raw asset reference (e.g. an image `src`) to a loadable
 * URL. The kit never performs IO itself; the host injects resolution policy.
 */
export type WidgetAssetResolver = (src: string) => string;

const identityAssetResolver: WidgetAssetResolver = (src) => src;

const WidgetRendererRegistryContext = createContext<WidgetRendererRegistry | undefined>(undefined);
const WidgetAssetResolverContext = createContext<WidgetAssetResolver>(identityAssetResolver);

export interface WidgetRendererProviderProps {
  readonly registry?: WidgetRendererRegistry | undefined;
  readonly resolveAssetSrc?: WidgetAssetResolver | undefined;
  readonly children: ReactNode;
}

/**
 * Supplies the renderer registry and asset resolver to a `WidgetRenderer` tree.
 * Both are optional: with no registry, only builtin renderers are used; with no
 * resolver, asset references are passed through unchanged.
 */
export function WidgetRendererProvider({
  registry,
  resolveAssetSrc,
  children,
}: WidgetRendererProviderProps) {
  const assetResolver = resolveAssetSrc ?? identityAssetResolver;
  return (
    <WidgetRendererRegistryContext.Provider value={registry}>
      <WidgetAssetResolverContext.Provider value={assetResolver}>
        {children}
      </WidgetAssetResolverContext.Provider>
    </WidgetRendererRegistryContext.Provider>
  );
}

export function useWidgetRendererRegistry(): WidgetRendererRegistry | undefined {
  return useContext(WidgetRendererRegistryContext);
}

export function useWidgetAssetResolver(): WidgetAssetResolver {
  return useContext(WidgetAssetResolverContext);
}
