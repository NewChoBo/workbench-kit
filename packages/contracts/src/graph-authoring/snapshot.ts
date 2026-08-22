export class UnsupportedNodeTypeSnapshotValueError extends TypeError {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`Node type descriptor value at ${path} ${reason}.`);
    this.name = 'UnsupportedNodeTypeSnapshotValueError';
    this.path = path;
  }
}

function propertyPath(parent: string, key: string | symbol, array: boolean): string {
  if (typeof key === 'symbol') return `${parent}[${String(key)}]`;
  if (array && /^(0|[1-9]\d*)$/.test(key)) return `${parent}[${key}]`;
  return `${parent}[${JSON.stringify(key)}]`;
}

function cloneSnapshotValue(value: unknown, path: string, seen: Map<object, unknown>): unknown {
  if (typeof value === 'function') {
    throw new UnsupportedNodeTypeSnapshotValueError(path, 'must not be executable');
  }
  if (typeof value !== 'object' || value === null) return value;

  const prior = seen.get(value);
  if (prior !== undefined) return prior;

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (array && prototype !== Array.prototype) ||
    (!array && prototype !== Object.prototype && prototype !== null)
  ) {
    throw new UnsupportedNodeTypeSnapshotValueError(path, 'must be an array or plain data object');
  }

  const clone: unknown[] | Record<PropertyKey, unknown> = array
    ? new Array((value as unknown[]).length)
    : Object.create(prototype);
  seen.set(value, clone);

  for (const key of Reflect.ownKeys(value)) {
    if (array && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new UnsupportedNodeTypeSnapshotValueError(
        propertyPath(path, key, array),
        'must be an own data property',
      );
    }
    Object.defineProperty(clone, key, {
      configurable: false,
      enumerable: descriptor.enumerable,
      value: cloneSnapshotValue(descriptor.value, propertyPath(path, key, array), seen),
      writable: false,
    });
  }

  return Object.freeze(clone);
}

export function cloneAndFreezeNodeTypeSnapshot<T>(value: T): T {
  return cloneSnapshotValue(value, '$', new Map<object, unknown>()) as T;
}
