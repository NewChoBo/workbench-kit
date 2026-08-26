import type { UiValueSchema } from '../ui-authoring/types';
import { isUiValueSourceKind } from '../ui-authoring/validation';

type PlainRecord = Readonly<Record<string, unknown>>;

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: PlainRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function optionalValueIs(
  record: PlainRecord,
  key: string,
  predicate: (value: unknown) => boolean,
): boolean {
  return !hasOwn(record, key) || predicate(record[key]);
}

function isValueEditor(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'metadata']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'metadata', isRecord)
  );
}

export function isSupportedUiValueSchemaShape(value: unknown): value is UiValueSchema {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['type', 'defaultValue', 'constraints', 'editor', 'allowedSources']) &&
    typeof value.type === 'string' &&
    optionalValueIs(value, 'constraints', isRecord) &&
    optionalValueIs(value, 'editor', isValueEditor) &&
    optionalValueIs(
      value,
      'allowedSources',
      (entry) => Array.isArray(entry) && entry.every(isUiValueSourceKind),
    )
  );
}

function canonical(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

export function collectNoncanonicalUiValueSchemaText(value: UiValueSchema): readonly string[] {
  const record = value as unknown as PlainRecord;
  const issues: string[] = [];
  if (!canonical(record.type)) issues.push('type');
  if (hasOwn(record, 'allowedSources')) {
    (record.allowedSources as readonly unknown[]).forEach((entry, index) => {
      if (!canonical(entry)) issues.push(`allowedSources[${index}]`);
    });
  }
  if (hasOwn(record, 'editor')) {
    const editor = record.editor as PlainRecord;
    if (!canonical(editor.id)) issues.push('editor.id');
  }
  return Object.freeze(issues);
}
