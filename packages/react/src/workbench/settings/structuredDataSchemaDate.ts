import type { WorkbenchStructuredDataSchemaFieldDefinition } from './structuredDataSchemaTypes';

export const WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT = 'yyyy-MM-dd';

interface WorkbenchStructuredDataDateParts {
  day: number;
  month: number;
  year: number;
}

const COMPACT_DATE_PATTERN = /^\d{8}$/;
const HTML_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeWorkbenchStructuredDataSchemaDateFormat(format: string): string {
  return format.trim().replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd');
}

export function inferWorkbenchStructuredDataSchemaDateFormat(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): string | undefined {
  const pattern = definition?.pattern?.trim();
  if (!pattern) return undefined;

  if (COMPACT_DATE_PATTERN.test('20260703') && /\\d\{8\}/.test(pattern)) {
    return 'yyyyMMdd';
  }

  if (/\\d\{4\}-\\d\{2\}-\\d\{2\}/.test(pattern)) {
    return WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT;
  }

  return undefined;
}

export function resolveWorkbenchStructuredDataSchemaDateFormat(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): string {
  const explicit = definition?.ui?.dateFormat?.trim();
  if (explicit) {
    return normalizeWorkbenchStructuredDataSchemaDateFormat(explicit);
  }

  return (
    inferWorkbenchStructuredDataSchemaDateFormat(definition) ??
    WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT
  );
}

export function isWorkbenchStructuredDataSchemaDateField(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): boolean {
  if (!definition) return false;
  if (definition.ui?.control === 'date') return true;
  return definition.format === 'date';
}

function isValidDateParts(parts: WorkbenchStructuredDataDateParts): boolean {
  const { day, month, year } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function parseWorkbenchStructuredDataDateParts(
  value: string,
  format: string,
): WorkbenchStructuredDataDateParts | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (format === 'yyyyMMdd' && COMPACT_DATE_PATTERN.test(trimmed)) {
    const parts = {
      year: Number(trimmed.slice(0, 4)),
      month: Number(trimmed.slice(4, 6)),
      day: Number(trimmed.slice(6, 8)),
    };
    return isValidDateParts(parts) ? parts : null;
  }

  if (format === WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT && HTML_DATE_PATTERN.test(trimmed)) {
    const parts = {
      year: Number(trimmed.slice(0, 4)),
      month: Number(trimmed.slice(5, 7)),
      day: Number(trimmed.slice(8, 10)),
    };
    return isValidDateParts(parts) ? parts : null;
  }

  const tokenPattern = format
    .replace(/yyyy/g, '(?<year>\\d{4})')
    .replace(/MM/g, '(?<month>\\d{2})')
    .replace(/dd/g, '(?<day>\\d{2})');
  const match = trimmed.match(new RegExp(`^${tokenPattern}$`));
  if (!match?.groups) return null;

  const parts = {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  };
  return isValidDateParts(parts) ? parts : null;
}

export function formatWorkbenchStructuredDataSchemaDateValue(
  parts: WorkbenchStructuredDataDateParts,
  format: string,
): string {
  const normalizedFormat = normalizeWorkbenchStructuredDataSchemaDateFormat(format);
  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  return normalizedFormat.replace(/yyyy/g, year).replace(/MM/g, month).replace(/dd/g, day);
}

export function parseWorkbenchStructuredDataSchemaDateValue(
  value: unknown,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): WorkbenchStructuredDataDateParts | null {
  if (value === null || value === undefined || value === '') return null;
  const stringValue = String(value).trim();
  if (!stringValue) return null;

  const primaryFormat = resolveWorkbenchStructuredDataSchemaDateFormat(definition);
  const primary = parseWorkbenchStructuredDataDateParts(stringValue, primaryFormat);
  if (primary) return primary;

  if (HTML_DATE_PATTERN.test(stringValue)) {
    return parseWorkbenchStructuredDataDateParts(
      stringValue,
      WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT,
    );
  }

  if (COMPACT_DATE_PATTERN.test(stringValue)) {
    return parseWorkbenchStructuredDataDateParts(stringValue, 'yyyyMMdd');
  }

  return null;
}

export function toWorkbenchStructuredDataHtmlDateInputValue(
  value: unknown,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): string {
  const parts = parseWorkbenchStructuredDataSchemaDateValue(value, definition);
  if (!parts) return '';
  return formatWorkbenchStructuredDataSchemaDateValue(
    parts,
    WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT,
  );
}

export function fromWorkbenchStructuredDataHtmlDateInputValue(
  htmlValue: string,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): string {
  const trimmed = htmlValue.trim();
  if (!trimmed) return '';

  const parts = parseWorkbenchStructuredDataDateParts(
    trimmed,
    WORKBENCH_STRUCTURED_DATA_HTML_DATE_FORMAT,
  );
  if (!parts) return trimmed;

  return formatWorkbenchStructuredDataSchemaDateValue(
    parts,
    resolveWorkbenchStructuredDataSchemaDateFormat(definition),
  );
}

export function coerceWorkbenchStructuredDataSchemaDateValue(
  rawValue: string,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  if (HTML_DATE_PATTERN.test(trimmed)) {
    return fromWorkbenchStructuredDataHtmlDateInputValue(trimmed, definition);
  }

  const parts = parseWorkbenchStructuredDataSchemaDateValue(trimmed, definition);
  if (!parts) return trimmed;

  return formatWorkbenchStructuredDataSchemaDateValue(
    parts,
    resolveWorkbenchStructuredDataSchemaDateFormat(definition),
  );
}
