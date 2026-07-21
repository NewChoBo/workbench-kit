import { asWorkbenchStructuredDataRecord } from '@workbench-kit/workspace';
import type {
  WorkbenchStructuredDataRecord,
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaSectionSummary,
  WorkbenchStructuredDataSchemaTableColumnInput,
  WorkbenchStructuredDataSchemaTableRowKeyInput,
} from './structuredDataSchemaTypes';
import { getWorkbenchStructuredDataSchemaFieldDefaultValue } from './structuredDataSchemaField';
import { getWorkbenchStructuredDataSchemaSectionPath } from './structuredDataSchemaSection';

export function getWorkbenchStructuredDataSchemaTableRows(
  value: unknown,
): WorkbenchStructuredDataRecord[] {
  if (Array.isArray(value)) {
    return value.map((item) => asWorkbenchStructuredDataRecord(item) ?? { value: item });
  }

  const record = asWorkbenchStructuredDataRecord(value);
  if (!record) return [];

  const objectEntries = Object.entries(record).filter(([, entry]) =>
    asWorkbenchStructuredDataRecord(entry),
  );
  if (!objectEntries.length) return [];

  return objectEntries.map(([key, entry]) => ({
    id: key,
    ...(asWorkbenchStructuredDataRecord(entry) ?? {}),
  }));
}

export function getWorkbenchStructuredDataSchemaTablePath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  const tablePath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return tablePath ? tablePath.split('.') : [];
}

export function getWorkbenchStructuredDataSchemaTableRowKey({
  row,
  rowIndex,
  value,
}: WorkbenchStructuredDataSchemaTableRowKeyInput) {
  return Array.isArray(value) ? String(rowIndex) : String(row.id ?? rowIndex);
}

export function getWorkbenchStructuredDataSchemaTableCellPath({
  column,
  rowKey,
  section,
}: {
  column: string;
  rowKey: string;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  return [...getWorkbenchStructuredDataSchemaTablePath(section), rowKey, column];
}

export function removeWorkbenchStructuredDataSchemaTableRow({
  rowIndex,
  rowKey,
  value,
}: {
  rowIndex: number;
  rowKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) return value.filter((_, index) => index !== rowIndex);

  const nextRecord = { ...(asWorkbenchStructuredDataRecord(value) ?? {}) };
  delete nextRecord[rowKey];
  return nextRecord;
}

export function appendWorkbenchStructuredDataSchemaTableRow({
  row,
  rowKey,
  value,
}: {
  row: WorkbenchStructuredDataRecord;
  rowKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) return [...value, row];

  return {
    ...(asWorkbenchStructuredDataRecord(value) ?? {}),
    [rowKey]: { ...row, id: rowKey },
  };
}

export function getWorkbenchStructuredDataSchemaTableColumns({
  maxColumns = 6,
  preferredColumns = [],
  rows,
  schemaColumns = [],
  sectionColumns = [],
}: WorkbenchStructuredDataSchemaTableColumnInput) {
  if (sectionColumns.length) return [...sectionColumns];
  if (schemaColumns.length) return [...schemaColumns];

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const preferred = preferredColumns.filter((column) => keys.includes(column));
  const remaining = keys.filter((column) => !preferred.includes(column));
  return [...preferred, ...remaining].slice(0, maxColumns);
}

export function createWorkbenchStructuredDataSchemaEmptyRow({
  columns,
  getDefinition,
}: {
  columns: readonly string[];
  getDefinition: (column: string) => WorkbenchStructuredDataSchemaFieldDefinition | undefined;
}) {
  return columns.reduce<WorkbenchStructuredDataRecord>((row, column) => {
    row[column] = getWorkbenchStructuredDataSchemaFieldDefaultValue(getDefinition(column));
    return row;
  }, {});
}
