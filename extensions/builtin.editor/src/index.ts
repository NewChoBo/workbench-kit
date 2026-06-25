import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import { MissingResourceEditorHost } from './missing-resource-editor-host.js';
import { isWorkspaceFileResourceUri } from './resource-uri.js';
import { TextEditorHost } from './text-editor-host.js';

export const EXTENSION_ID = 'workbench-kit.builtin.editor' as const;
export const TEXT_EDITOR_ID = 'workbench-kit.builtin.editor.text' as const;
export const TEXT_EDITOR_HOST_FACTORY_ID = 'workbench-kit.builtin.editor.textHost' as const;

export {
  MISSING_RESOURCE_EDITOR_HOST_RENDER_KIND,
  MissingResourceEditorHost,
  isMissingResourceEditorHostRenderData,
  type MissingResourceEditorHostRenderData,
} from './missing-resource-editor-host.js';
export {
  TEXT_EDITOR_HOST_RENDER_KIND,
  TextEditorHost,
  isTextEditorHostRenderData,
  type TextEditorHostRenderData,
} from './text-editor-host.js';

export function activate(context: ExtensionContext): void {
  context.editorResolvers.registerResolver({
    id: 'workspace-file',
    priority: 10,
    canResolve: ({ resourceUri }) => isWorkspaceFileResourceUri(resourceUri),
    resolve: () => TEXT_EDITOR_ID,
  });

  context.editorHostFactories.registerFactory({
    id: TEXT_EDITOR_HOST_FACTORY_ID,
    priority: 10,
    canCreate: ({ editorId }) => editorId === TEXT_EDITOR_ID,
    create: ({ resource, resourceMissing, resourceUri, tabId }) => {
      if (!resourceUri) {
        throw new Error('Text editor host requires a resource URI.');
      }

      if (resourceMissing) {
        return new MissingResourceEditorHost({ resourceUri, tabId });
      }

      const initialContent = readWorkspaceFileContent(resource);
      const mimeType = readWorkspaceFileMimeType(resource);
      return new TextEditorHost({ initialContent, mimeType, resourceUri, tabId });
    },
  });
}

function readWorkspaceFileContent(resource: unknown): string | undefined {
  if (typeof resource !== 'object' || resource === null) {
    return undefined;
  }

  const content = (resource as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

function readWorkspaceFileMimeType(resource: unknown): string | undefined {
  if (typeof resource !== 'object' || resource === null) {
    return undefined;
  }

  const mimeType = (resource as { mimeType?: unknown }).mimeType;
  return typeof mimeType === 'string' ? mimeType : undefined;
}
