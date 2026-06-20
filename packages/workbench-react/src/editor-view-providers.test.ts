import { describe, expect, it } from 'vitest';
import {
  JDW_SCHEMA_DOCUMENT_MIME,
  JDW_WIDGET_DOCUMENT_MIME,
} from '@workbench-kit/react/jdw/document';

import {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  JDW_PREVIEW_PROVIDER_ID,
  JSON_FORM_PROVIDER_ID,
  MARKDOWN_PREVIEW_PROVIDER_ID,
  resolveEditorDocumentViews,
  type EditorDocumentContext,
  type EditorDocumentViewProvider,
} from './editor-view-providers.js';

function createDocument(overrides: Partial<EditorDocumentContext> = {}): EditorDocumentContext {
  const path = overrides.path ?? 'package.json';

  return {
    content: '{}',
    path,
    resourceUri: `workspace://file/${path}`,
    ...overrides,
  };
}

describe('resolveEditorDocumentViews', () => {
  it('resolves generic JSON form without a preview for schema JSON files', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '{',
        mimeType: JDW_SCHEMA_DOCUMENT_MIME,
        path: 'schemas/widget-document.v1.jdw.schema.json',
      }),
    );

    expect(resolved.formProvider?.id).toBe(JSON_FORM_PROVIDER_ID);
    expect(resolved.previewProvider).toBeUndefined();
  });

  it('does not infer JDW preview for schema extension documents', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '{"type":"text","args":{"text":"schema-like but not a widget"}}',
        path: 'schemas/example.jdw.schema.json',
      }),
    );

    expect(resolved.formProvider?.id).toBe(JSON_FORM_PROVIDER_ID);
    expect(resolved.previewProvider).toBeUndefined();
  });

  it('resolves JDW preview from .jdw.json extension even before content parses', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '{',
        mimeType: JDW_WIDGET_DOCUMENT_MIME,
        path: 'jdw/home.jdw.json',
      }),
    );

    expect(resolved.formProvider?.id).toBe(JSON_FORM_PROVIDER_ID);
    expect(resolved.previewProvider?.id).toBe(JDW_PREVIEW_PROVIDER_ID);
  });

  it('resolves Markdown preview without JSON form mode', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '# Notes\n\n```mermaid\ngraph TD\n  A[Start] --> B[Preview]\n```',
        mimeType: 'text/markdown',
        path: 'docs/notes.md',
      }),
    );

    expect(resolved.formProvider).toBeUndefined();
    expect(resolved.previewProvider?.id).toBe(MARKDOWN_PREVIEW_PROVIDER_ID);
  });

  it('allows higher-priority extension providers to override default form and preview providers', () => {
    const customFormProvider: EditorDocumentViewProvider = {
      id: 'custom.form',
      kind: 'form',
      label: 'Custom Form',
      priority: 100,
      matches: (document) => document.path.endsWith('.custom.json'),
      render: () => null,
    };
    const customPreviewProvider: EditorDocumentViewProvider = {
      id: 'custom.preview',
      kind: 'preview',
      label: 'Custom Preview',
      priority: 100,
      matches: (document) => document.path.endsWith('.custom.json'),
      render: () => null,
    };

    const resolved = resolveEditorDocumentViews(
      createDocument({ path: 'models/home.custom.json' }),
      [customFormProvider, customPreviewProvider, ...DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS],
    );

    expect(resolved.formProvider?.id).toBe('custom.form');
    expect(resolved.previewProvider?.id).toBe('custom.preview');
  });
});
