import type { TransformContext, TransformOptionField, ValueTransformRegistry } from '../types.js';

/** Merge edge-local options over host `context.options` (edge wins). */
export function contextWithEdgeOptions(
  context: TransformContext,
  edgeOptions: Readonly<Record<string, unknown>> | undefined,
): TransformContext {
  if (!edgeOptions || Object.keys(edgeOptions).length === 0) {
    return context;
  }
  return {
    ...context,
    options: {
      ...context.options,
      ...edgeOptions,
    },
  };
}

/** Collect unique `optionFields` declared by transforms in a chain (later ids win per key). */
export function collectOptionFields(
  registry: ValueTransformRegistry,
  transformIds: readonly string[],
): TransformOptionField[] {
  const byKey = new Map<string, TransformOptionField>();
  for (const id of transformIds) {
    const fields = registry.get(id)?.optionFields;
    if (!fields) {
      continue;
    }
    for (const field of fields) {
      byKey.set(field.key, field);
    }
  }
  return [...byKey.values()];
}

/** Option fields for a single chain step. */
export function optionFieldsForStep(
  registry: ValueTransformRegistry,
  transformId: string | undefined,
): TransformOptionField[] {
  if (!transformId) {
    return [];
  }
  return [...(registry.get(transformId)?.optionFields ?? [])];
}

/** Drop empty / undefined option bags when persisting edges. */
export function sanitizeOptionRecord(
  options: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!options) {
    return undefined;
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) {
      continue;
    }
    next[key] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function patchOptionRecord(
  previous: Readonly<Record<string, unknown>> | undefined,
  key: string,
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  return sanitizeOptionRecord({
    ...previous,
    [key]: value,
  });
}

/**
 * Align / sanitize per-step option bags to `length`.
 * Returns `undefined` when every step is empty.
 */
export function sanitizeOptionSteps(
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
  length: number,
): readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined {
  if (length <= 0) {
    return undefined;
  }
  const next: (Readonly<Record<string, unknown>> | undefined)[] = [];
  let any = false;
  for (let index = 0; index < length; index += 1) {
    const sanitized = sanitizeOptionRecord(steps?.[index]);
    next.push(sanitized);
    if (sanitized) {
      any = true;
    }
  }
  return any ? next : undefined;
}

/**
 * Resolve per-step options for a transform chain.
 * Prefers `steps`; otherwise expands shared `transformOptions` to every step (apply-to-all).
 */
export function resolveOptionSteps(
  transformIds: readonly string[],
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
  shared: Readonly<Record<string, unknown>> | undefined,
): (Readonly<Record<string, unknown>> | undefined)[] {
  const length = transformIds.length;
  if (length === 0) {
    return [];
  }
  if (steps && steps.length > 0) {
    return Array.from({ length }, (_, index) => sanitizeOptionRecord(steps[index]));
  }
  const bag = sanitizeOptionRecord(shared);
  if (!bag) {
    return Array.from({ length }, () => undefined);
  }
  return Array.from({ length }, () => bag);
}

/** Back-compat summary: first non-empty step bag (else undefined). */
export function sharedOptionsFromSteps(
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!steps) {
    return undefined;
  }
  for (const step of steps) {
    const sanitized = sanitizeOptionRecord(step);
    if (sanitized) {
      return sanitized;
    }
  }
  return undefined;
}

/** Merge all step bags (later steps win) — useful for live format-sample chips. */
export function mergeOptionSteps(
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!steps || steps.length === 0) {
    return undefined;
  }
  const merged: Record<string, unknown> = {};
  for (const step of steps) {
    if (!step) {
      continue;
    }
    Object.assign(merged, step);
  }
  return sanitizeOptionRecord(merged);
}

export function patchOptionStep(
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
  length: number,
  index: number,
  key: string,
  value: unknown,
  sharedFallback?: Readonly<Record<string, unknown>>,
): readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined {
  const base = resolveOptionSteps(
    Array.from({ length }, () => ''),
    steps,
    sharedFallback,
  );
  const next = base.map((step, stepIndex) =>
    stepIndex === index ? patchOptionRecord(step, key, value) : step,
  );
  return sanitizeOptionSteps(next, length);
}

export function resizeOptionSteps(
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
  length: number,
): readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined {
  if (length <= 0) {
    return undefined;
  }
  const next = Array.from({ length }, (_, index) => sanitizeOptionRecord(steps?.[index]));
  return sanitizeOptionSteps(next, length);
}
