export type StrictPortableDataFailureKind = 'unsupported' | 'limit';

export interface StrictPortableDataBudget {
  readonly maxProperties: number;
  used: number;
}

export interface StrictPortableDataSnapshotOptions {
  readonly path?: string;
  readonly maxDepth?: number;
  readonly maxStringLength?: number;
  readonly budget?: StrictPortableDataBudget;
}

export class StrictPortableDataError extends TypeError {
  readonly kind: StrictPortableDataFailureKind;
  readonly path: string;

  constructor(kind: StrictPortableDataFailureKind, path: string) {
    super('The value must contain only supported bounded acyclic own plain data.');
    this.name = 'StrictPortableDataError';
    this.kind = kind;
    this.path = path;
  }
}

export function createStrictPortableDataBudget(maxProperties: number): StrictPortableDataBudget {
  return { maxProperties, used: 0 };
}

function propertyPath(parent: string, key: string, array: boolean): string {
  if (array && /^(0|[1-9]\d*)$/.test(key)) return `${parent}[${key}]`;
  return `${parent}.${key}`;
}

interface SnapshotContext {
  readonly maxDepth: number | undefined;
  readonly maxStringLength: number | undefined;
  readonly budget: StrictPortableDataBudget | undefined;
  readonly active: Set<object>;
  readonly completed: Map<object, unknown>;
}

function fail(kind: StrictPortableDataFailureKind, path: string): never {
  throw new StrictPortableDataError(kind, path);
}

function snapshotPrimitive(value: unknown, path: string, context: SnapshotContext): unknown {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (context.maxStringLength !== undefined && value.length > context.maxStringLength) {
      return fail('limit', path);
    }
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fail('unsupported', path);
}

function arrayLength(value: readonly unknown[], path: string): number {
  const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    descriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
    typeof descriptor.value !== 'number' ||
    !Number.isSafeInteger(descriptor.value) ||
    descriptor.value < 0
  ) {
    return fail('unsupported', path);
  }
  return descriptor.value;
}

function countProperty(context: SnapshotContext, path: string): void {
  if (context.budget === undefined) return;
  context.budget.used += 1;
  if (context.budget.used > context.budget.maxProperties) {
    fail('limit', path);
  }
}

function checkPropertyKeyLength(context: SnapshotContext, key: string, path: string): void {
  if (context.maxStringLength !== undefined && key.length > context.maxStringLength) {
    fail('limit', path);
  }
}

function cloneSnapshotValue(
  value: unknown,
  path: string,
  depth: number,
  context: SnapshotContext,
): unknown {
  if (value === null || typeof value !== 'object') {
    return snapshotPrimitive(value, path, context);
  }
  if (context.maxDepth !== undefined && depth > context.maxDepth) {
    return fail('limit', path);
  }

  if (context.active.has(value)) return fail('unsupported', path);
  const prior = context.completed.get(value);
  if (prior !== undefined) return prior;

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (array && prototype !== Array.prototype) ||
    (!array && prototype !== Object.prototype && prototype !== null)
  ) {
    return fail('unsupported', path);
  }

  context.active.add(value);
  try {
    if (array) {
      const length = arrayLength(value, path);
      const keys = Reflect.ownKeys(value);
      for (const key of keys) {
        if (typeof key === 'string') checkPropertyKeyLength(context, key, path);
      }
      if (
        keys.some(
          (key) =>
            typeof key !== 'string' ||
            (key !== 'length' &&
              (!/^(0|[1-9]\d*)$/.test(key) ||
                Number(key) >= length ||
                String(Number(key)) !== key)),
        )
      ) {
        return fail('unsupported', path);
      }

      const clone = new Array<unknown>(length);
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const itemPath = propertyPath(path, key, true);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.enumerable !== true
        ) {
          return fail('unsupported', itemPath);
        }
        countProperty(context, itemPath);
        clone[index] = cloneSnapshotValue(descriptor.value, itemPath, depth + 1, context);
      }
      Object.freeze(clone);
      context.completed.set(value, clone);
      return clone;
    }

    const clone: Record<string, unknown> = Object.create(prototype) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') return fail('unsupported', path);
      checkPropertyKeyLength(context, key, path);
      const itemPath = propertyPath(path, key, false);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        descriptor.enumerable !== true
      ) {
        return fail('unsupported', itemPath);
      }
      countProperty(context, itemPath);
      Object.defineProperty(clone, key, {
        configurable: false,
        enumerable: true,
        value: cloneSnapshotValue(descriptor.value, itemPath, depth + 1, context),
        writable: false,
      });
    }
    Object.freeze(clone);
    context.completed.set(value, clone);
    return clone;
  } finally {
    context.active.delete(value);
  }
}

export function snapshotStrictPortableData<T>(
  value: T,
  options: StrictPortableDataSnapshotOptions = {},
): T {
  const context: SnapshotContext = {
    maxDepth: options.maxDepth,
    maxStringLength: options.maxStringLength,
    budget: options.budget,
    active: new Set<object>(),
    completed: new Map<object, unknown>(),
  };
  return cloneSnapshotValue(value, options.path ?? '$', 0, context) as T;
}
