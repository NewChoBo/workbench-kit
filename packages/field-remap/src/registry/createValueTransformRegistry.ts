import { throwIfAborted } from '../domain/abort.js';
import { MAX_TRANSFORM_CHAIN } from '../domain/constants.js';
import type {
  FieldDataType,
  TransformContext,
  ValueTransformDefinition,
  ValueTransformListFilter,
  ValueTransformRegistry,
} from '../domain/types.js';

export function createValueTransformRegistry(
  initial: readonly ValueTransformDefinition[] = [],
): ValueTransformRegistry {
  const byId = new Map<string, ValueTransformDefinition>();

  for (const definition of initial) {
    byId.set(definition.id, definition);
  }

  function resolve(id: string): ValueTransformDefinition | undefined {
    return byId.get(id.trim()) ?? byId.get(id);
  }

  return {
    list(filter) {
      return [...byId.values()].filter((definition) => matchesFilter(definition, filter));
    },
    get(id) {
      return resolve(id);
    },
    apply(id, value, context = {}) {
      const definition = resolve(id);
      if (!definition) {
        throw new Error(`Unknown value transform: ${id}`);
      }
      return definition.apply(value, context);
    },
    register(definition) {
      byId.set(definition.id, definition);
    },
  };
}

/**
 * Apply an ordered transform chain (empty = identity / unchanged).
 * Optional `optionSteps[i]` merges over `context.options` for step `i` only.
 * Awaits Promise-returning host transforms (e.g. JSONata 2.x).
 */
export async function applyTransformChain(
  registry: ValueTransformRegistry,
  transformIds: readonly string[],
  value: unknown,
  context: TransformContext = {},
  optionSteps?: readonly (Readonly<Record<string, unknown>> | undefined)[],
): Promise<unknown> {
  let current = value;
  const ids = transformIds.slice(0, MAX_TRANSFORM_CHAIN);
  for (let index = 0; index < ids.length; index += 1) {
    throwIfAborted(context.signal);
    const stepOptions = optionSteps?.[index];
    const stepContext =
      stepOptions && Object.keys(stepOptions).length > 0
        ? {
            ...context,
            options: {
              ...context.options,
              ...stepOptions,
            },
          }
        : context;
    current = await registry.apply(ids[index]!, current, stepContext);
  }
  return current;
}

function matchesFilter(
  definition: ValueTransformDefinition,
  filter: ValueTransformListFilter | undefined,
): boolean {
  if (!filter) {
    return true;
  }

  if (filter.category && definition.category !== filter.category) {
    return false;
  }

  if (filter.inputType) {
    const inputTypes = definition.inputTypes;
    if (inputTypes && inputTypes.length > 0 && !inputTypes.includes(filter.inputType)) {
      return false;
    }
  }

  return true;
}

/** Whether a transform may sit between a typed source field and a typed target slot. */
export function isTransformCompatible(
  definition: ValueTransformDefinition,
  sourceType: FieldDataType | undefined,
  targetType: FieldDataType | undefined,
): boolean {
  if (
    sourceType &&
    sourceType !== 'unknown' &&
    definition.inputTypes &&
    definition.inputTypes.length > 0 &&
    !definition.inputTypes.includes(sourceType)
  ) {
    return false;
  }

  // Collection sources only accept transforms that declare array input (or untyped).
  if (sourceType === 'array') {
    const acceptsArray =
      !definition.inputTypes ||
      definition.inputTypes.length === 0 ||
      definition.inputTypes.includes('array');
    if (!acceptsArray) {
      return false;
    }
  }

  // Array → array is pass-through only; reduce / typed outputs are not collection-preserving.
  if (
    sourceType === 'array' &&
    targetType === 'array' &&
    definition.outputType &&
    definition.outputType !== 'array'
  ) {
    return false;
  }

  if (
    targetType &&
    targetType !== 'unknown' &&
    definition.outputType &&
    definition.outputType !== 'unknown' &&
    definition.outputType !== targetType
  ) {
    // Formatted outputs are strings; string sinks accept them.
    return targetType === 'string';
  }

  // Pass-through / undeclared output: known source and target types must match.
  if (
    !definition.outputType &&
    sourceType &&
    sourceType !== 'unknown' &&
    targetType &&
    targetType !== 'unknown' &&
    sourceType !== targetType
  ) {
    return false;
  }

  return true;
}

/**
 * Whether an ordered transform chain can sit between source and target types.
 * Each step must accept the previous output type (or the original source for step 0).
 * Empty chains always return true — use {@link arePortsCompatible} for identity type match.
 */
export function isTransformChainCompatible(
  registry: ValueTransformRegistry,
  transformIds: readonly string[],
  sourceType: FieldDataType | undefined,
  targetType: FieldDataType | undefined,
): boolean {
  if (transformIds.length === 0) {
    return true;
  }
  if (transformIds.length > MAX_TRANSFORM_CHAIN) {
    return false;
  }

  let currentType = sourceType;
  for (let index = 0; index < transformIds.length; index += 1) {
    const definition = registry.get(transformIds[index]!);
    if (!definition) {
      return false;
    }
    const isLast = index === transformIds.length - 1;
    if (!isTransformCompatible(definition, currentType, isLast ? targetType : undefined)) {
      return false;
    }
    if (definition.outputType) {
      currentType = definition.outputType;
    }
  }

  return true;
}

/**
 * Identity (direct) port type match.
 * Missing or `unknown` types are permissive — same default as transform helpers.
 */
export function areFieldTypesCompatible(
  source: FieldDataType | undefined,
  target: FieldDataType | undefined,
): boolean {
  if (!source || source === 'unknown' || !target || target === 'unknown') {
    return true;
  }
  return source === target;
}

export type ArePortsCompatibleInput = {
  readonly sourceType?: FieldDataType;
  readonly targetType?: FieldDataType;
  readonly transformIds?: readonly string[];
  readonly registry?: ValueTransformRegistry;
};

/**
 * Whether two field/slot ports may connect under `FieldDataType` rules.
 * Empty / omitted `transformIds` ≡ identity match via {@link areFieldTypesCompatible}.
 * Non-empty chains require `registry` and use {@link isTransformChainCompatible}.
 */
export function arePortsCompatible(input: ArePortsCompatibleInput): boolean {
  const chain = input.transformIds ?? [];
  if (chain.length === 0) {
    return areFieldTypesCompatible(input.sourceType, input.targetType);
  }
  if (!input.registry) {
    return false;
  }
  return isTransformChainCompatible(input.registry, chain, input.sourceType, input.targetType);
}

export type { TransformContext };
