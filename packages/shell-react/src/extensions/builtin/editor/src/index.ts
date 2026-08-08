import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import { MissingResourceEditorHost } from './missing-resource-editor-host.js';
import { isWorkspaceFileResourceUri } from './resource-uri.js';
import { TextEditorHost } from './text-editor-host.js';

export const EXTENSION_ID = 'workbench-kit.builtin.editor' as const;
export const TEXT_EDITOR_ID = 'workbench-kit.builtin.editor.text' as const;
export const TEXT_EDITOR_HOST_FACTORY_ID = 'workbench-kit.builtin.editor.textHost' as const;
export const MARKDOWN_PREVIEW_PROVIDER_ID =
  'workbench-kit.builtin.editor.markdown-preview' as const;
export const MARKDOWN_PREVIEW_RENDER_KIND =
  'workbench-kit.builtin.editor.markdown-preview' as const;

export interface BuiltinEditorMarkdownPreviewRenderData {
  readonly kind: typeof MARKDOWN_PREVIEW_RENDER_KIND;
}

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

function isMarkdownDocument(path: string, mimeType: string | undefined): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
  const normalizedMime = mimeType?.toLowerCase();
  return (
    normalizedPath.endsWith('.md') ||
    normalizedPath.endsWith('.mdx') ||
    normalizedMime === 'text/markdown'
  );
}

export function activate(context: ExtensionContext): void {
  context.editorDocumentViews.registerProvider({
    id: MARKDOWN_PREVIEW_PROVIDER_ID,
    kind: 'preview',
    label: 'Preview',
    priority: 5,
    filenamePatterns: ['*.md', '*.mdx'],
    mimeTypes: ['text/markdown'],
    matches: (document) => isMarkdownDocument(document.path, document.mimeType),
    render: (): BuiltinEditorMarkdownPreviewRenderData => ({
      kind: MARKDOWN_PREVIEW_RENDER_KIND,
    }),
  });

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
    create: ({ resource, resourceMissing, resourceUri }) => {
      if (resourceMissing) {
        return new MissingResourceEditorHost({ resourceUri });
      }

      const initialContent = readWorkspaceFileContent(resource);
      const mimeType = readWorkspaceFileMimeType(resource);
      return new TextEditorHost({ initialContent, mimeType, resourceUri });
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
