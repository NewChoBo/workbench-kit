import type { CSSProperties, ReactNode } from 'react';
import {
  JDW_SCHEMA_DOCUMENT_MIME,
  JDW_WIDGET_DOCUMENT_MIME,
  isJdwDocumentPath,
  isJdwSchemaDocument,
} from '@workbench-kit/react/jdw/document';
import { parseJsonWidgetData } from '@workbench-kit/react/jdw/parse';
import { JdwPreview } from '@workbench-kit/react/jdw/preview';
import { ScrollArea, Select, TextInput } from '@workbench-kit/react/primitives';
import { WorkbenchMarkdownPreview } from '@workbench-kit/react/workbench/markdown-preview';
import {
  createEditorDocumentViewProviderRegistry as createCoreEditorDocumentViewProviderRegistry,
  EditorDocumentViewProviderRegistry,
  type CreateEditorDocumentViewProviderRegistryOptions as CoreCreateEditorDocumentViewProviderRegistryOptions,
} from '@workbench-kit/workbench-core';
import type {
  EditorDocumentContext,
  EditorDocumentViewKind,
  EditorDocumentViewProvider,
  EditorDocumentViewRenderContext,
} from '@workbench-kit/workbench-core';

type JsonPath = readonly (string | number)[];

export type {
  EditorDocumentContext,
  EditorDocumentViewKind,
  EditorDocumentViewProvider,
  EditorDocumentViewRenderContext,
};
export { EditorDocumentViewProviderRegistry };

export interface ResolvedEditorDocumentViews {
  readonly formProvider: EditorDocumentViewProvider | undefined;
  readonly previewProvider: EditorDocumentViewProvider | undefined;
}

export const JSON_FORM_PROVIDER_ID = 'workbench-kit.editor.form.json' as const;
export const JDW_PREVIEW_PROVIDER_ID = 'workbench-kit.editor.preview.jdw' as const;
export const MARKDOWN_PREVIEW_PROVIDER_ID = 'workbench-kit.editor.preview.markdown' as const;

const JSON_FORM_PROVIDER: EditorDocumentViewProvider = {
  id: JSON_FORM_PROVIDER_ID,
  kind: 'form',
  label: 'Form',
  priority: 0,
  matches: (document) =>
    !isJdwSchemaDocument(document) &&
    (isJsonLikeDocument(document) || parseJsonObject(document.content) !== null),
  render: ({ document, onContentChange }) => (
    <JsonObjectFormView content={document.content} onContentChange={onContentChange} />
  ),
};

const JDW_PREVIEW_PROVIDER: EditorDocumentViewProvider = {
  id: JDW_PREVIEW_PROVIDER_ID,
  kind: 'preview',
  label: 'Preview',
  priority: 10,
  matches: (document) =>
    !isJdwSchemaDocument(document) &&
    (isJdwDocument(document) || isJdwWidgetJson(document.content)),
  render: ({ document }) => (
    <JdwPreview className="workbench-editor-area__jdw-preview" json={document.content} />
  ),
};

const MARKDOWN_PREVIEW_PROVIDER: EditorDocumentViewProvider = {
  id: MARKDOWN_PREVIEW_PROVIDER_ID,
  kind: 'preview',
  label: 'Preview',
  priority: 5,
  matches: isMarkdownDocument,
  render: ({ document }) => <WorkbenchMarkdownPreview source={document.content} />,
};

export const DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS: readonly EditorDocumentViewProvider[] = [
  JDW_PREVIEW_PROVIDER,
  MARKDOWN_PREVIEW_PROVIDER,
  JSON_FORM_PROVIDER,
];

export interface CreateEditorDocumentViewProviderRegistryOptions extends CoreCreateEditorDocumentViewProviderRegistryOptions {
  readonly includeDefaultProviders?: boolean | undefined;
}

export function createEditorDocumentViewProviderRegistry(
  options: CreateEditorDocumentViewProviderRegistryOptions = {},
): EditorDocumentViewProviderRegistry {
  const providers = [
    ...(options.includeDefaultProviders === false ? [] : DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS),
    ...(options.providers ?? []),
  ];
  return createCoreEditorDocumentViewProviderRegistry({ providers });
}

export function resolveEditorDocumentViews(
  document: EditorDocumentContext,
  providers: readonly EditorDocumentViewProvider[] = DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
): ResolvedEditorDocumentViews {
  return {
    formProvider: resolveEditorDocumentViewProvider(document, 'form', providers),
    previewProvider: resolveEditorDocumentViewProvider(document, 'preview', providers),
  };
}

export function resolveEditorDocumentViewProvider(
  document: EditorDocumentContext,
  kind: EditorDocumentViewKind,
  providers: readonly EditorDocumentViewProvider[] = DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
): EditorDocumentViewProvider | undefined {
  return providers
    .filter(
      (provider) => provider.kind === kind && matchesEditorDocumentViewProvider(provider, document),
    )
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0];
}

export function matchesEditorDocumentViewProvider(
  provider: EditorDocumentViewProvider,
  document: EditorDocumentContext,
): boolean {
  if (provider.matches) {
    return provider.matches(document);
  }

  const mimeType = document.mimeType?.toLowerCase();
  const path = normalizePath(document.path);
  const hasMimeTypes = Boolean(provider.mimeTypes?.length);
  const hasFilenamePatterns = Boolean(provider.filenamePatterns?.length);

  if (!hasMimeTypes && !hasFilenamePatterns) {
    return false;
  }

  const mimeMatches =
    !hasMimeTypes ||
    Boolean(provider.mimeTypes?.some((candidate) => candidate.toLowerCase() === mimeType));
  const pathMatches =
    !hasFilenamePatterns ||
    Boolean(provider.filenamePatterns?.some((pattern) => matchesFilenamePattern(pattern, path)));

  return mimeMatches && pathMatches;
}

function matchesFilenamePattern(pattern: string, path: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  const segments = path.split('/');
  const target = normalizedPattern.includes('/') ? path : (segments[segments.length - 1] ?? path);
  const regex = new RegExp(`^${globToRegExpSource(normalizedPattern)}$`, 'i');
  return regex.test(target);
}

function globToRegExpSource(pattern: string): string {
  let source = '';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const nextChar = pattern[index + 1];

    if (char === '*' && nextChar === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegExp(char ?? '');
  }

  return source;
}

function normalizePath(path: string): string {
  return path.split('\\').join('/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function JsonObjectFormView({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange: (content: string) => void;
}) {
  const parsed = parseJsonObject(content);

  const handleFieldChange = (path: JsonPath, nextValue: string) => {
    if (!parsed) {
      return;
    }

    const previousValue = getJsonPathValue(parsed, path);
    const nextRecord = updateJsonPathValue(
      parsed,
      path,
      coerceFormFieldValue(previousValue, nextValue),
    );
    onContentChange(JSON.stringify(nextRecord, null, 2));
  };

  if (!parsed) {
    return (
      <ScrollArea className="workbench-editor-area__form-placeholder" orientation="vertical">
        <p>Form view is unavailable while the document is not valid JSON.</p>
        <p>Switch to Source to fix parse errors.</p>
      </ScrollArea>
    );
  }

  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    return (
      <ScrollArea className="workbench-editor-area__form-placeholder" orientation="vertical">
        <p>Form view</p>
        <p>This JSON object has no top-level fields yet.</p>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea
      as="form"
      className="workbench-editor-area__form"
      orientation="vertical"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="workbench-editor-area__form-grid">
        {entries.map(([key, value]) => (
          <JsonValueFormField
            key={key}
            depth={0}
            label={key}
            path={[key]}
            value={value}
            onFieldChange={handleFieldChange}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function JsonValueFormField({
  depth = 0,
  label,
  path,
  value,
  onFieldChange,
}: {
  depth?: number;
  label: string;
  path: JsonPath;
  value: unknown;
  onFieldChange: (path: JsonPath, value: string) => void;
}) {
  if (Array.isArray(value)) {
    return (
      <JsonFormGroup depth={depth} label={label} meta={`array (${value.length})`} path={path}>
        {value.length === 0 ? (
          <div className="workbench-editor-area__form-empty" style={formDepthStyle(depth + 1)}>
            Empty array
          </div>
        ) : (
          value.map((item, index) => (
            <JsonValueFormField
              key={index}
              depth={depth + 1}
              label={`[${index}]`}
              path={[...path, index]}
              value={item}
              onFieldChange={onFieldChange}
            />
          ))
        )}
      </JsonFormGroup>
    );
  }

  if (isJsonRecord(value)) {
    const entries = Object.entries(value);

    return (
      <JsonFormGroup depth={depth} label={label} meta={`object (${entries.length})`} path={path}>
        {entries.length === 0 ? (
          <div className="workbench-editor-area__form-empty" style={formDepthStyle(depth + 1)}>
            Empty object
          </div>
        ) : (
          entries.map(([key, childValue]) => (
            <JsonValueFormField
              key={key}
              depth={depth + 1}
              label={key}
              path={[...path, key]}
              value={childValue}
              onFieldChange={onFieldChange}
            />
          ))
        )}
      </JsonFormGroup>
    );
  }

  const fieldLabel = getJsonPathLabel(path);
  const labelStyle = formDepthStyle(depth);

  if (typeof value === 'boolean') {
    return (
      <label className="workbench-editor-area__form-field">
        <span className="workbench-editor-area__form-label" style={labelStyle}>
          {label}
        </span>
        <Select
          aria-label={fieldLabel}
          className="workbench-editor-area__form-control"
          controlWidth="full"
          value={String(value)}
          onValueChange={(nextValue) => {
            onFieldChange(path, nextValue);
          }}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      </label>
    );
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <label className="workbench-editor-area__form-field">
        <span className="workbench-editor-area__form-label" style={labelStyle}>
          {label}
        </span>
        <TextInput
          aria-label={fieldLabel}
          className="workbench-editor-area__form-control"
          controlWidth="full"
          onValueChange={(nextValue) => {
            onFieldChange(path, nextValue);
          }}
          step={typeof value === 'number' ? 'any' : undefined}
          type={typeof value === 'number' ? 'number' : 'text'}
          value={formatFormFieldValue(value)}
        />
      </label>
    );
  }

  return (
    <div className="workbench-editor-area__form-field">
      <span className="workbench-editor-area__form-label" style={labelStyle}>
        {label}
      </span>
      <output aria-label={fieldLabel} className="workbench-editor-area__form-readonly">
        {formatFormFieldValue(value)}
      </output>
    </div>
  );
}

function JsonFormGroup({
  children,
  depth,
  label,
  meta,
  path,
}: {
  children: ReactNode;
  depth: number;
  label: string;
  meta: string;
  path: JsonPath;
}) {
  return (
    <>
      <div
        aria-label={getJsonPathLabel(path)}
        className="workbench-editor-area__form-group-header"
        role="group"
        style={formDepthStyle(depth)}
      >
        <span className="workbench-editor-area__form-label">{label}</span>
        <span className="workbench-editor-area__form-badge">{meta}</span>
      </div>
      {children}
    </>
  );
}

function formDepthStyle(depth: number): CSSProperties {
  return {
    '--workbench-editor-form-depth': String(depth),
  } as CSSProperties;
}

function isJsonLikeDocument(document: EditorDocumentContext): boolean {
  const mimeType = document.mimeType?.toLowerCase();
  const path = document.path.toLowerCase();

  return (
    path.endsWith('.json') ||
    mimeType === 'application/json' ||
    mimeType === 'application/schema+json' ||
    mimeType === JDW_SCHEMA_DOCUMENT_MIME ||
    Boolean(mimeType?.endsWith('+json'))
  );
}

function isJdwDocument(document: EditorDocumentContext): boolean {
  return document.mimeType === JDW_WIDGET_DOCUMENT_MIME || isJdwDocumentPath(document.path);
}

function isMarkdownDocument(document: EditorDocumentContext): boolean {
  const mimeType = document.mimeType?.toLowerCase();
  const path = document.path.toLowerCase();

  return path.endsWith('.md') || path.endsWith('.mdx') || mimeType === 'text/markdown';
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJdwWidgetJson(content: string): boolean {
  const parsed = parseJsonWidgetData(content);
  return parsed.value !== null;
}

function formatFormFieldValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value) ?? String(value);
}

function coerceFormFieldValue(previousValue: unknown, nextValue: string): unknown {
  if (typeof previousValue === 'number') {
    const parsedNumber = Number(nextValue);
    return Number.isNaN(parsedNumber) ? previousValue : parsedNumber;
  }

  if (typeof previousValue === 'boolean') {
    if (nextValue === 'true') {
      return true;
    }

    if (nextValue === 'false') {
      return false;
    }
  }

  return nextValue;
}

function getJsonPathValue(value: unknown, path: JsonPath): unknown {
  let cursor = value;

  for (const segment of path) {
    if (Array.isArray(cursor) && typeof segment === 'number') {
      cursor = cursor[segment];
      continue;
    }

    if (isJsonRecord(cursor) && typeof segment === 'string') {
      cursor = cursor[segment];
      continue;
    }

    return undefined;
  }

  return cursor;
}

function updateJsonPathValue(value: unknown, path: JsonPath, nextValue: unknown): unknown {
  if (path.length === 0) {
    return nextValue;
  }

  const [head, ...tail] = path;

  if (Array.isArray(value) && typeof head === 'number') {
    const nextArray = [...value];
    nextArray[head] = updateJsonPathValue(nextArray[head], tail, nextValue);
    return nextArray;
  }

  if (isJsonRecord(value) && typeof head === 'string') {
    return {
      ...value,
      [head]: updateJsonPathValue(value[head], tail, nextValue),
    };
  }

  return value;
}

function getJsonPathLabel(path: JsonPath): string {
  return path.reduce<string>((label, segment) => {
    if (typeof segment === 'number') {
      return `${label}[${segment}]`;
    }

    return label ? `${label}.${segment}` : segment;
  }, '');
}
