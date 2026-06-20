import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.json-preview' as const;
export const JSON_PREVIEW_EDITOR_ID = 'workbench-kit.samples.json-preview.preview' as const;

export function activate(context: ExtensionContext): void {
  context.editorResolvers.registerResolver({
    id: 'json-preview',
    priority: 20,
    canResolve: ({ resourceUri }) => resourceUri.endsWith('.json'),
    resolve: () => JSON_PREVIEW_EDITOR_ID,
  });
}
