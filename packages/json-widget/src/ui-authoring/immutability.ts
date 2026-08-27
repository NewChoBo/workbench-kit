export function deepFreezeUiAuthoringValue<T>(value: T, seen = new Set<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) {
    deepFreezeUiAuthoringValue(nested, seen);
  }
  return Object.freeze(value);
}

export function cloneUiAuthoringJsonValue<T>(value: T): T {
  return cloneStrictJsonValue(value, new Set<object>()) as T;
}

export function uiAuthoringDeclarativeEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => uiAuthoringDeclarativeEqual(entry, right[index]))
    );
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        uiAuthoringDeclarativeEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function invalidJsonValue(message: string): never {
  throw new TypeError(`UI authoring values must be strict JSON: ${message}.`);
}

function cloneStrictJsonValue(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return invalidJsonValue('numbers must be finite');
    return value;
  }
  if (typeof value !== 'object') return invalidJsonValue(`${typeof value} is not supported`);
  if (ancestors.has(value)) return invalidJsonValue('circular references are not supported');

  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      return invalidJsonValue('array subclasses are not supported');
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== value.length + 1 ||
      keys.some(
        (key) =>
          key !== 'length' &&
          (typeof key !== 'string' ||
            !Number.isInteger(Number(key)) ||
            Number(key) < 0 ||
            Number(key) >= value.length ||
            String(Number(key)) !== key),
      )
    ) {
      return invalidJsonValue('arrays cannot contain non-index properties');
    }
    return Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return invalidJsonValue('arrays cannot contain holes or accessor values');
      }
      return cloneStrictJsonValue(descriptor.value, nextAncestors);
    });
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return invalidJsonValue('object prototypes are not supported');
  }

  const entries: [string, unknown][] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return invalidJsonValue('symbol properties are not supported');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return invalidJsonValue('object properties must be enumerable data properties');
    }
    entries.push([key, cloneStrictJsonValue(descriptor.value, nextAncestors)]);
  }
  return Object.fromEntries(entries);
}
