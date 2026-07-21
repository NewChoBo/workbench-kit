import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.search' as const;
export const SEARCH_VIEW_ID = 'workbench-kit.builtin.search.panel' as const;
export const SEARCH_VIEW_RENDER_KIND = 'workbench-kit.builtin.search.view' as const;

export interface BuiltinSearchViewRenderData {
  readonly kind: typeof SEARCH_VIEW_RENDER_KIND;
}

export function activate(context: ExtensionContext): void {
  context.views.registerViewProvider({
    viewId: SEARCH_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinSearchViewRenderData => ({
        kind: SEARCH_VIEW_RENDER_KIND,
      }),
      title: 'Search',
    }),
  });
}
