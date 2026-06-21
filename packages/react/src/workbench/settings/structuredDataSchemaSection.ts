import type {
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaSectionSummary,
} from './structuredDataSchemaTypes';
import { formatWorkbenchStructuredDataSchemaLabel } from './structuredDataSchemaField';

export function getWorkbenchStructuredDataSchemaSectionId(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  return section.id ?? section.sectionKey;
}

export function getWorkbenchStructuredDataSchemaSectionPath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  const dataPath = section.dataPath;
  if (dataPath !== undefined) {
    return dataPath.trim();
  }

  return section.sectionKey || section.id || '';
}

export function getWorkbenchStructuredDataSchemaFieldDataPath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
  fieldPath: string,
) {
  if (fieldPath.includes('.')) return fieldPath;
  const sectionPath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return sectionPath ? `${sectionPath}.${fieldPath}` : fieldPath;
}

export function getWorkbenchStructuredDataSchemaFieldDefinition({
  fieldPath,
  properties,
  section,
}: {
  fieldPath: string;
  properties?: Record<string, WorkbenchStructuredDataSchemaFieldDefinition> | undefined;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  const sectionPath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return (
    properties?.[fieldPath] ??
    (sectionPath ? properties?.[`${sectionPath}.${fieldPath}`] : undefined)
  );
}

export function getWorkbenchStructuredDataSchemaSectionFieldLabel(fieldPath: string) {
  return formatWorkbenchStructuredDataSchemaLabel(fieldPath.split('.').pop() ?? fieldPath);
}

export function slugWorkbenchStructuredDataSchemaAnchor(value: string | undefined) {
  return (
    value
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

export function getWorkbenchStructuredDataSchemaSectionAnchorId({
  index,
  panelId,
  section,
}: {
  index: number;
  panelId: string;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  return `${panelId}-section-${index}-${slugWorkbenchStructuredDataSchemaAnchor(
    getWorkbenchStructuredDataSchemaSectionId(section) ?? section.title,
  )}`;
}
