import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { uiAuthoringDeclarativeEqual } from './immutability.js';
import type { UiDocumentV3 } from './types.js';

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_DEPTH = 64;
const MAX_SOURCE_VALUES = 100_000;

export type PreparedUiSourceEditV3 =
  | { readonly document: UiDocumentV3; readonly error?: never }
  | { readonly document?: never; readonly error: string };

/** Bounds untrusted text before entering the recursive canonical document parser. */
export function prepareUiSourceEditV3(
  current: UiDocumentV3,
  expectedSource: string,
  source: string,
): PreparedUiSourceEditV3 {
  if (expectedSource !== current.source)
    return { error: 'The document changed. Review the current source before applying JSON.' };
  if (
    typeof source !== 'string' ||
    source.length > MAX_SOURCE_BYTES ||
    new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES
  )
    return { error: 'Document JSON must be no larger than 2 MiB.' };
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid JSON.' };
  }
  const pending = [{ value: raw, depth: 0 }];
  let count = 0;
  while (pending.length > 0) {
    const { value, depth } = pending.pop()!;
    if (++count > MAX_SOURCE_VALUES || depth > MAX_SOURCE_DEPTH)
      return { error: 'Document JSON exceeds the supported size or nesting limit.' };
    if (typeof value === 'number' && !Number.isFinite(value))
      return { error: 'Document JSON numbers must be finite.' };
    if (value === null || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor')
        return { error: 'Document JSON cannot contain prototype-control keys.' };
      pending.push({ value: child, depth: depth + 1 });
    }
  }
  const parsed = createUiDocumentV3(current.documentId, source);
  if (parsed.document === null)
    return { error: parsed.issues[0]?.message ?? 'Invalid authored document JSON.' };
  if (!uiAuthoringDeclarativeEqual(raw, JSON.parse(parsed.document.source)))
    return {
      error:
        'Use canonical authored JSON fields only. Extra wrapper fields or normalized values are not accepted.',
    };
  const before = readUiDocumentNodeAuthoringV3(current.root)!;
  const after = readUiDocumentNodeAuthoringV3(parsed.document.root)!;
  if (
    parsed.document.root.id !== current.root.id ||
    parsed.document.root.type !== current.root.type ||
    !uiAuthoringDeclarativeEqual(before.component, after.component) ||
    before.documentSchemaVersion !== after.documentSchemaVersion ||
    !uiAuthoringDeclarativeEqual(before.designSystem, after.designSystem) ||
    !uiAuthoringDeclarativeEqual(before.compositionDefinition, after.compositionDefinition)
  )
    return {
      error: 'Source edits must preserve the root identity, schema and definition metadata.',
    };
  return {
    document: uiAuthoringDeclarativeEqual(current.root, parsed.document.root)
      ? current
      : parsed.document,
  };
}
