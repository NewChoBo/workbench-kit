/**
 * Minimal n→m operators (combine / split) evaluated beside v1 MappingEdge[].
 * Document v2 may persist these; v1 hosts call {@link applyMappingOperators} explicitly.
 */

import { throwIfAborted } from '../abort.js';
import type {
  SourceField,
  TargetSlot,
  TransformContext,
  ValueTransformRegistry,
} from '../types.js';
import { applyTransformChain } from '../../registry/createValueTransformRegistry.js';
import { findSourceField, findTargetSlot } from './resolveMappedValue.js';
import { isPlainObject, readObjectPath, writeObjectPath } from './pathUtils.js';

/** Max inputs on a combine operator. */
export const MAX_MAPPING_FAN_IN = 8;
/** Max outputs on a split operator. */
export const MAX_MAPPING_FAN_OUT = 8;

export type CombineMappingOperator = {
  readonly kind: 'combine';
  readonly id: string;
  readonly inputFieldIds: readonly string[];
  readonly outputSlotId: string;
  /** Optional chain applied to the combined object bag (max 3 via registry). */
  readonly transformIds?: readonly string[];
};

export type SplitMappingOperator = {
  readonly kind: 'split';
  readonly id: string;
  readonly inputFieldId: string;
  readonly outputSlotIds: readonly string[];
  /** Optional chain applied to the source value before splitting an object. */
  readonly transformIds?: readonly string[];
};

export type MappingOperator = CombineMappingOperator | SplitMappingOperator;

export type ApplyMappingOperatorsInput = {
  readonly operators: readonly MappingOperator[];
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  /** Named input bags keyed by source shape id (same contract as convertToShape). */
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly transforms: ValueTransformRegistry;
  /** Existing nested output to merge into (usually `{}` or convertToShape output). */
  readonly output?: Readonly<Record<string, unknown>>;
  readonly context?: TransformContext;
  readonly signal?: AbortSignal;
};

export type ApplyMappingOperatorsResult = {
  readonly output: Record<string, unknown>;
};

export class MappingOperatorError extends Error {
  readonly code = 'mapping_operator_error' as const;
  readonly operatorId: string;

  constructor(operatorId: string, message: string) {
    super(message);
    this.name = 'MappingOperatorError';
    this.operatorId = operatorId;
  }
}

function leafKey(field: { readonly path?: string; readonly label: string; readonly id: string }): string {
  const path = field.path?.trim();
  if (path) {
    const parts = path.split('.').filter(Boolean);
    return parts[parts.length - 1] ?? path;
  }
  const idParts = field.id.split('.').filter(Boolean);
  return idParts[idParts.length - 1] ?? field.label;
}

function outputPathForTarget(slot: TargetSlot): string {
  const path = slot.path?.trim();
  if (path) {
    return path;
  }
  const id = slot.id.trim();
  if (id.includes('.')) {
    const parts = id.split('.').filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(1).join('.');
    }
  }
  return slot.label.trim() || id;
}

function readFieldValue(field: SourceField, inputs: Readonly<Record<string, unknown>>): unknown {
  const shapeId = field.shapeId?.trim();
  const bag =
    shapeId && Object.prototype.hasOwnProperty.call(inputs, shapeId)
      ? inputs[shapeId]
      : Object.keys(inputs).length === 1
        ? inputs[Object.keys(inputs)[0]!]
        : inputs;

  const path = field.path?.trim();
  if (path) {
    if (shapeId && Object.prototype.hasOwnProperty.call(inputs, shapeId)) {
      return readObjectPath(bag, path);
    }
    const fromBag = readObjectPath(bag, path);
    if (fromBag !== undefined) {
      return fromBag;
    }
    return readObjectPath(inputs, path);
  }

  return field.sampleValue;
}

function validateCombine(operator: CombineMappingOperator): void {
  if (operator.inputFieldIds.length < 2) {
    throw new MappingOperatorError(operator.id, 'combine requires at least 2 inputFieldIds.');
  }
  if (operator.inputFieldIds.length > MAX_MAPPING_FAN_IN) {
    throw new MappingOperatorError(
      operator.id,
      `combine fan-in exceeds MAX_MAPPING_FAN_IN (${MAX_MAPPING_FAN_IN}).`,
    );
  }
}

function validateSplit(operator: SplitMappingOperator): void {
  if (operator.outputSlotIds.length < 2) {
    throw new MappingOperatorError(operator.id, 'split requires at least 2 outputSlotIds.');
  }
  if (operator.outputSlotIds.length > MAX_MAPPING_FAN_OUT) {
    throw new MappingOperatorError(
      operator.id,
      `split fan-out exceeds MAX_MAPPING_FAN_OUT (${MAX_MAPPING_FAN_OUT}).`,
    );
  }
}

/**
 * Evaluate combine/split operators and merge writes into a target-shaped object.
 * Deterministic: operators run in array order; later writes overwrite earlier paths.
 */
export async function applyMappingOperators(
  input: ApplyMappingOperatorsInput,
): Promise<ApplyMappingOperatorsResult> {
  const signal = input.signal ?? input.context?.signal;
  const context: TransformContext = {
    ...input.context,
    ...(signal ? { signal } : {}),
  };
  throwIfAborted(signal);

  let output: Record<string, unknown> = input.output ? { ...input.output } : {};

  for (const operator of input.operators) {
    throwIfAborted(signal);

    if (operator.kind === 'combine') {
      validateCombine(operator);
      const bag: Record<string, unknown> = {};
      for (const fieldId of operator.inputFieldIds) {
        const field = findSourceField(input.sources, fieldId);
        if (!field) {
          throw new MappingOperatorError(operator.id, `Unknown source field "${fieldId}".`);
        }
        bag[leafKey(field)] = readFieldValue(field, input.inputs);
      }

      const target = findTargetSlot(input.targets, operator.outputSlotId);
      if (!target) {
        throw new MappingOperatorError(
          operator.id,
          `Unknown target slot "${operator.outputSlotId}".`,
        );
      }

      const value = await applyTransformChain(
        input.transforms,
        operator.transformIds ?? [],
        bag,
        context,
      );
      output = writeObjectPath(output, outputPathForTarget(target), value);
      continue;
    }

    validateSplit(operator);
    const source = findSourceField(input.sources, operator.inputFieldId);
    if (!source) {
      throw new MappingOperatorError(
        operator.id,
        `Unknown source field "${operator.inputFieldId}".`,
      );
    }

    let current = readFieldValue(source, input.inputs);
    current = await applyTransformChain(
      input.transforms,
      operator.transformIds ?? [],
      current,
      context,
    );

    if (!isPlainObject(current)) {
      throw new MappingOperatorError(
        operator.id,
        'split requires a plain object source value (after transforms).',
      );
    }

    for (const slotId of operator.outputSlotIds) {
      const target = findTargetSlot(input.targets, slotId);
      if (!target) {
        throw new MappingOperatorError(operator.id, `Unknown target slot "${slotId}".`);
      }
      const key = leafKey(target);
      output = writeObjectPath(output, outputPathForTarget(target), current[key]);
    }
  }

  return { output };
}
