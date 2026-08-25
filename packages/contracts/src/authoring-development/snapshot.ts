export class UnsupportedAuthoringDevelopmentSnapshotValueError extends TypeError {
  readonly path: string;

  constructor(path: string) {
    super('Authoring development data must contain only supported acyclic own plain data.');
    this.name = 'UnsupportedAuthoringDevelopmentSnapshotValueError';
    this.path = path;
  }
}

function fail(path: string): never {
  throw new UnsupportedAuthoringDevelopmentSnapshotValueError(path);
}

function propertyPath(parent: string, key: string, array: boolean): string {
  if (array && /^(0|[1-9]\d*)$/.test(key)) return `${parent}[${key}]`;
  return `${parent}.${key}`;
}

function isSupportedPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
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
    return fail(path);
  }
  return descriptor.value;
}

function cloneSnapshotValue(
  value: unknown,
  path: string,
  active: Set<object>,
  completed: Map<object, unknown>,
): unknown {
  if (isSupportedPrimitive(value)) return value;
  if (typeof value !== 'object' || value === null) return fail(path);

  if (active.has(value)) return fail(path);
  const prior = completed.get(value);
  if (prior !== undefined) return prior;

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (array && prototype !== Array.prototype) ||
    (!array && prototype !== Object.prototype && prototype !== null)
  ) {
    return fail(path);
  }

  active.add(value);
  try {
    if (array) {
      const length = arrayLength(value, path);
      const keys = Reflect.ownKeys(value);
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
        return fail(path);
      }

      const clone = new Array<unknown>(length);
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.enumerable !== true
        ) {
          return fail(propertyPath(path, key, true));
        }
        clone[index] = cloneSnapshotValue(
          descriptor.value,
          propertyPath(path, key, true),
          active,
          completed,
        );
      }
      Object.freeze(clone);
      completed.set(value, clone);
      return clone;
    }

    const clone: Record<string, unknown> = Object.create(prototype) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') return fail(path);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        descriptor.enumerable !== true
      ) {
        return fail(propertyPath(path, key, false));
      }
      Object.defineProperty(clone, key, {
        configurable: false,
        enumerable: true,
        value: cloneSnapshotValue(
          descriptor.value,
          propertyPath(path, key, false),
          active,
          completed,
        ),
        writable: false,
      });
    }
    Object.freeze(clone);
    completed.set(value, clone);
    return clone;
  } finally {
    active.delete(value);
  }
}

export function snapshotAuthoringDevelopmentValue<T>(value: T): T {
  return cloneSnapshotValue(value, '$', new Set<object>(), new Map<object, unknown>()) as T;
}
