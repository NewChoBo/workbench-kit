export function deepFreezeUiAuthoringValue<T>(value: T, seen = new Set<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) {
    deepFreezeUiAuthoringValue(nested, seen);
  }
  return Object.freeze(value);
}

export function cloneUiAuthoringJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
