import type { TransformOptionField, ValueTransformRegistry } from '../types.js';

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

/** Resolve sanitized per-step options aligned to a transform chain. */
export function resolveOptionSteps(
  transformIds: readonly string[],
  steps: readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined,
): (Readonly<Record<string, unknown>> | undefined)[] {
  const length = transformIds.length;
  if (length === 0) {
    return [];
  }
  return Array.from({ length }, (_, index) => sanitizeOptionRecord(steps?.[index]));
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
