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
  createEditorDocumentViewProviderRegistry,
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
  it('resolves code-only for JDW schema JSON files without form or preview', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '{',
        mimeType: JDW_SCHEMA_DOCUMENT_MIME,
        path: 'schemas/widget-document.v1.jdw.schema.json',
      }),
    );

    expect(resolved.formProvider).toBeUndefined();
    expect(resolved.previewProvider).toBeUndefined();
  });

  it('does not infer JDW preview or form for schema extension documents', () => {
    const resolved = resolveEditorDocumentViews(
      createDocument({
        content: '{"type":"text","args":{"text":"schema-like but not a widget"}}',
        path: 'schemas/example.jdw.schema.json',
      }),
    );

    expect(resolved.formProvider).toBeUndefined();
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

  it('resolves providers from manifest-style mime type and filename selectors', () => {
    const selectorPreviewProvider: EditorDocumentViewProvider = {
      filenamePatterns: ['*.preview.json'],
      id: 'selector.preview',
      kind: 'preview',
      label: 'Selector Preview',
      mimeTypes: ['application/json'],
      render: () => null,
    };

    expect(
      resolveEditorDocumentViews(
        createDocument({
          mimeType: 'application/json',
          path: 'reports/sample.preview.json',
        }),
        [selectorPreviewProvider],
      ).previewProvider?.id,
    ).toBe('selector.preview');
    expect(
      resolveEditorDocumentViews(
        createDocument({
          mimeType: 'text/plain',
          path: 'reports/sample.preview.json',
        }),
        [selectorPreviewProvider],
      ).previewProvider,
    ).toBeUndefined();
  });
});

describe('EditorDocumentViewProviderRegistry', () => {
  it('registers default and host-provided document view providers', () => {
    const customPreviewProvider: EditorDocumentViewProvider = {
      id: 'custom.preview',
      kind: 'preview',
      label: 'Custom Preview',
      matches: (document) => document.path.endsWith('.custom'),
      render: () => null,
    };
    const registry = createEditorDocumentViewProviderRegistry({
      providers: [customPreviewProvider],
    });

    expect(registry.getProviders().map((provider) => provider.id)).toEqual([
      JDW_PREVIEW_PROVIDER_ID,
      MARKDOWN_PREVIEW_PROVIDER_ID,
      JSON_FORM_PROVIDER_ID,
      'custom.preview',
    ]);

    registry.dispose();
  });

  it('rejects duplicate document view provider ids', () => {
    const registry = createEditorDocumentViewProviderRegistry({
      includeDefaultProviders: false,
    });
    const provider: EditorDocumentViewProvider = {
      id: 'duplicate.preview',
      kind: 'preview',
      label: 'Preview',
      matches: () => true,
      render: () => null,
    };

    registry.registerProvider(provider);

    expect(() => registry.registerProvider(provider)).toThrow(
      'Editor document view provider "duplicate.preview" is already registered.',
    );

    registry.dispose();
  });
});
