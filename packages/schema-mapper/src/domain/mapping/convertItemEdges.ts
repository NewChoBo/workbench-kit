import { edgeTransformIds } from '../document/mappingEdge.js';
import { applyTransformChain } from '../../registry/createValueTransformRegistry.js';
import { BUILTIN_TRANSFORM_IDS } from '../../registry/builtinTransforms.js';
import { resolveOptionSteps } from './transformOptions.js';
import { isPlainObject, readObjectPath, writeObjectPath } from './pathUtils.js';
import { findTargetSlot, flattenSourceFields, flattenTargetSlots } from './treeUtils.js';
import type {
  MappingEdge,
  SourceField,
  TargetSlot,
  TransformContext,
  ValueTransformRegistry,
} from '../types.js';

function findSourceField(fields: readonly SourceField[], fieldId: string): SourceField | undefined {
  return flattenSourceFields(fields).find((field) => field.id === fieldId);
}

function itemRelativePath(
  node: { readonly path?: string; readonly label: string; readonly id: string } | undefined,
): string {
  if (!node) {
    return '';
  }
  const path = node.path?.trim();
  if (path) {
    return path;
  }
  return node.label.trim() || node.id.split('.').pop() || '';
}

/**
 * Convert each object in a source array through list-context `itemEdges`.
 * Child field paths are treated as item-relative (ingest array children).
 */
export function convertArrayWithItemEdges(input: {
  readonly items: unknown;
  readonly itemEdges: readonly MappingEdge[];
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly transforms: ValueTransformRegistry;
  readonly context?: TransformContext;
}): unknown[] {
  if (!Array.isArray(input.items)) {
    return [];
  }

  const targetLeaves = flattenTargetSlots(input.targets);

  return input.items.map((rawItem) => {
    const item = isPlainObject(rawItem) ? rawItem : {};
    let outItem: Record<string, unknown> = {};

    for (const edge of input.itemEdges) {
      const sourceField = findSourceField(input.sources, edge.sourceFieldId);
      const targetSlot =
        findTargetSlot(input.targets, edge.targetSlotId) ??
        targetLeaves.find((slot) => slot.id === edge.targetSlotId);
      if (!sourceField || !targetSlot) {
        continue;
      }

      const sourcePath = itemRelativePath(sourceField);
      const sourceValue = sourcePath ? readObjectPath(item, sourcePath) : undefined;

      const chain = edgeTransformIds(edge);
      let value: unknown;
      if (chain.length === 0) {
        const identity = input.transforms.get(BUILTIN_TRANSFORM_IDS.identity);
        value = identity
          ? identity.apply(sourceValue, { ...input.context, sampleValue: sourceValue })
          : sourceValue;
      } else {
        const steps = resolveOptionSteps(chain, edge.transformOptionSteps, edge.transformOptions);
        value = applyTransformChain(
          input.transforms,
          chain,
          sourceValue,
          { ...input.context, sampleValue: sourceValue },
          steps,
        );
      }

      const targetPath = itemRelativePath(targetSlot);
      if (!targetPath) {
        continue;
      }
      outItem = writeObjectPath(outItem, targetPath, value);
    }

    return outItem;
  });
}
