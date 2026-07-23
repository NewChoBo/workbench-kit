import type { MappingEdge } from '@workbench-kit/field-remap';
import type { FieldItemInput, Mapping } from 'react-table-mapping';

/** One column: field name (static string cell). */
export const FIELD_REMAP_NAME_COLUMNS = [{ title: 'Field', key: 'name' }] as const;

export interface FieldRemapLeaf {
  /** Kit field/slot id (may contain dots, e.g. `a.user_name`). */
  readonly id: string;
  readonly label: string;
}

/**
 * react-table-mapping builds connectors with `querySelector('#connector-…'+id)`.
 * Dots in ids break CSS selectors (`#a.user_name` → id=a + class=user_name).
 * Encode kit ids for the OSS UI and decode when adapting mappings.
 */
export function toTableMappingFieldId(kitFieldId: string): string {
  return kitFieldId.split('.').join('__');
}

export function fromTableMappingFieldId(tableFieldId: string): string {
  return tableFieldId.split('__').join('.');
}

/** Build react-table-mapping source/target rows from leaf field descriptors. */
export function toTableMappingFields(leaves: readonly FieldRemapLeaf[]): FieldItemInput[] {
  return leaves.map((leaf) => {
    const id = toTableMappingFieldId(leaf.id);
    return {
      id,
      key: id,
      name: {
        type: 'string' as const,
        columnKey: 'name',
        value: leaf.label,
      },
    };
  });
}

/** OSS Mapping[] → kit MappingEdge[] (identity / pass-through). */
export function tableMappingsToEdges(mappings: readonly Mapping[]): MappingEdge[] {
  return mappings.map((mapping) => ({
    id: mapping.id,
    sourceFieldId: fromTableMappingFieldId(mapping.source),
    targetSlotId: fromTableMappingFieldId(mapping.target),
    transformIds: ['identity'] as const,
  }));
}

/** kit MappingEdge[] → OSS Mapping[] for controlled mappings. */
export function edgesToTableMappings(edges: readonly MappingEdge[]): Mapping[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: toTableMappingFieldId(edge.sourceFieldId),
    target: toTableMappingFieldId(edge.targetSlotId),
  }));
}
