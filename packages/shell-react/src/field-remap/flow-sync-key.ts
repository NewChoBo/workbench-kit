import type { Edge, Node } from '@xyflow/react';
import type { ValueTransformRegistry } from '@workbench-kit/field-remap';

import type { FieldRemapFlowEdgeData, FieldRemapFlowNodeData } from './flow-adapter.js';
import type { FieldRemapSelection } from './flow-ops.js';

type GraphSyncToken = string | number | boolean | null | undefined;

function appendToken(parts: string[], value: GraphSyncToken): void {
  const encoded =
    value === undefined
      ? 'undefined'
      : value === null
        ? 'null'
        : `${typeof value}:${String(value)}`;
  parts.push(`${encoded.length}:${encoded}`);
}

function appendTransformRegistrySignature(
  parts: string[],
  transforms: ValueTransformRegistry,
): void {
  const definitions = transforms
    .list()
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));
  appendToken(parts, definitions.length);
  for (const definition of definitions) {
    appendToken(parts, definition.id);
    appendToken(parts, definition.label);
    appendToken(parts, definition.description);
    appendToken(parts, definition.category);
    appendToken(parts, definition.outputType);
    appendToken(parts, definition.inputTypes?.length ?? 0);
    for (const inputType of definition.inputTypes ?? []) {
      appendToken(parts, inputType);
    }
    appendToken(parts, definition.optionFields?.length ?? 0);
    for (const option of definition.optionFields ?? []) {
      appendToken(parts, option.key);
      appendToken(parts, option.label);
      appendToken(parts, option.kind);
    }
  }
}

export function createTransformRegistrySignature(transforms: ValueTransformRegistry): string {
  const parts: string[] = [];
  appendTransformRegistrySignature(parts, transforms);
  return parts.join('');
}

function appendSelection(parts: string[], selection: FieldRemapSelection): void {
  appendToken(parts, selection?.kind);
  if (!selection) {
    return;
  }
  if (selection.kind === 'edge' || selection.kind === 'transformStep') {
    appendToken(parts, selection.edgeId);
    appendToken(parts, selection.kind === 'transformStep' ? selection.stepIndex : undefined);
    return;
  }
  appendToken(parts, selection.kind === 'draft' ? selection.localId : selection.operatorId);
}

/**
 * Stable signature for the controlled values copied into XYFlow's internal node store.
 * This intentionally lists display fields instead of serializing arbitrary props.
 */
export function createFieldRemapGraphSyncKey(input: {
  readonly nodes: readonly Node<FieldRemapFlowNodeData>[];
  readonly edges: readonly Edge<FieldRemapFlowEdgeData>[];
  readonly selection: FieldRemapSelection;
  readonly transformRegistrySignature: string;
}): string {
  const parts: string[] = [];
  appendToken(parts, input.nodes.length);
  for (const node of input.nodes) {
    appendToken(parts, node.id);
    appendToken(parts, node.type);
    appendToken(parts, node.position.x);
    appendToken(parts, node.position.y);
    appendToken(parts, node.selected);

    const data = node.data;
    appendToken(parts, data.kind);
    if (data.kind === 'source-object' || data.kind === 'target-object') {
      appendToken(parts, data.title);
      appendToken(parts, data.schemaRole);
      appendToken(parts, data.ports.length);
      for (const port of data.ports) {
        appendToken(parts, port.fieldId);
        appendToken(parts, port.label);
        appendToken(parts, port.dataType);
      }
      continue;
    }
    if (data.kind === 'transform') {
      appendToken(parts, data.mappingEdgeId);
      appendToken(parts, data.stepIndex);
      appendToken(parts, data.transformId);
      appendToken(parts, data.label);
      appendToken(parts, data.selected);
      continue;
    }
    if (data.kind === 'draft-transform') {
      appendToken(parts, data.localId);
      appendToken(parts, data.transformId);
      appendToken(parts, data.label);
      appendToken(parts, data.sourceFieldId);
      appendToken(parts, data.targetSlotId);
      continue;
    }
    appendToken(parts, data.operatorId);
    appendToken(parts, data.label);
    if (data.kind === 'combine-operator') {
      appendToken(parts, data.inputFieldIds.length);
      for (const fieldId of data.inputFieldIds) {
        appendToken(parts, fieldId);
      }
      appendToken(parts, data.outputSlotId);
      continue;
    }
    appendToken(parts, data.inputFieldId);
    appendToken(parts, data.outputSlotIds.length);
    for (const slotId of data.outputSlotIds) {
      appendToken(parts, slotId);
    }
  }

  appendToken(parts, input.edges.length);
  for (const edge of input.edges) {
    appendToken(parts, edge.id);
    appendToken(parts, edge.type);
    appendToken(parts, edge.source);
    appendToken(parts, edge.sourceHandle);
    appendToken(parts, edge.target);
    appendToken(parts, edge.targetHandle);
    appendToken(parts, edge.selected);
    appendToken(parts, edge.data?.mappingEdgeId);
    appendToken(parts, edge.data?.draftLocalId);
    appendToken(parts, edge.data?.operatorId);
    appendToken(parts, edge.data?.segment);
  }

  appendSelection(parts, input.selection);
  appendToken(parts, input.transformRegistrySignature);
  return parts.join('');
}
