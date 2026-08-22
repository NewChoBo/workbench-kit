export type WorkbenchStructuredDataPath = readonly (number | string)[];

export type WorkbenchStructuredDataRecord = Record<string, unknown>;

type WorkbenchStructuredDataContainer = WorkbenchStructuredDataRecord | unknown[];

const MAX_WORKBENCH_STRUCTURED_DATA_ARRAY_INDEX = 4_294_967_294;

export function getWorkbenchStructuredDataValue(
  data: unknown,
  path: WorkbenchStructuredDataPath,
): unknown {
  return path.reduce<unknown>((currentValue, segment) => {
    if (Array.isArray(currentValue)) {
      const index = getWorkbenchStructuredDataArrayIndex(segment);
      return index === null || !hasWorkbenchStructuredDataOwnProperty(currentValue, index)
        ? undefined
        : currentValue[index];
    }
    if (!isWorkbenchStructuredDataRecord(currentValue)) return undefined;
    const key = String(segment);
    return hasWorkbenchStructuredDataOwnProperty(currentValue, key) ? currentValue[key] : undefined;
  }, data);
}

export function setWorkbenchStructuredDataValue(
  data: WorkbenchStructuredDataRecord,
  path: WorkbenchStructuredDataPath,
  value: unknown,
): WorkbenchStructuredDataRecord {
  if (path.length === 0) return data;

  const nextValue = setWorkbenchStructuredDataPathValue(data, path, value);
  return isWorkbenchStructuredDataRecord(nextValue) ? nextValue : {};
}

export function setWorkbenchStructuredDataPathOrRootValue({
  data,
  path,
  value,
}: {
  data: unknown;
  path: WorkbenchStructuredDataPath;
  value: unknown;
}): unknown {
  if (path.length === 0) return value;
  return setWorkbenchStructuredDataValue(asWorkbenchStructuredDataRecord(data) ?? {}, path, value);
}

export function isWorkbenchStructuredDataRecord(
  value: unknown,
): value is WorkbenchStructuredDataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function getWorkbenchStructuredDataArrayIndex(segment: number | string) {
  if (typeof segment === 'number') {
    return Number.isInteger(segment) &&
      segment >= 0 &&
      segment <= MAX_WORKBENCH_STRUCTURED_DATA_ARRAY_INDEX
      ? segment
      : null;
  }

  if (!/^(0|[1-9]\d*)$/.test(segment)) return null;

  const index = Number(segment);
  return index <= MAX_WORKBENCH_STRUCTURED_DATA_ARRAY_INDEX ? index : null;
}

export function createWorkbenchStructuredDataContainer(segment: number | string | undefined) {
  return segment !== undefined && getWorkbenchStructuredDataArrayIndex(segment) !== null ? [] : {};
}

export function cloneWorkbenchStructuredDataContainer(
  value: unknown,
  nextSegment: number | string | undefined,
): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return [...value];
  if (isWorkbenchStructuredDataRecord(value)) {
    const clone = Object.create(Object.getPrototypeOf(value)) as WorkbenchStructuredDataRecord;
    for (const key of Object.keys(value)) {
      writeWorkbenchStructuredDataProperty(clone, key, value[key]);
    }
    return clone;
  }
  return createWorkbenchStructuredDataContainer(nextSegment);
}

export function setWorkbenchStructuredDataPathValue(
  data: unknown,
  path: WorkbenchStructuredDataPath,
  value: unknown,
): unknown {
  if (path.length === 0) return value;

  const [segment, ...rest] = path;
  const root = cloneWorkspaceContainer(data, segment);
  const key = Array.isArray(root) ? getWorkbenchStructuredDataArrayIndex(segment) : String(segment);
  if (key === null) return root;

  const propertyKey = String(key);

  if (rest.length === 0) {
    writeWorkbenchStructuredDataProperty(root, propertyKey, value);
    return root;
  }

  const currentChild = readWorkbenchStructuredDataProperty(root, propertyKey);
  writeWorkbenchStructuredDataProperty(
    root,
    propertyKey,
    setWorkbenchStructuredDataPathValue(currentChild, rest, value),
  );
  return root;
}

// Keep it compatible/clean
function cloneWorkspaceContainer(
  value: unknown,
  nextSegment: number | string | undefined,
): Record<string, unknown> | unknown[] {
  return cloneWorkbenchStructuredDataContainer(value, nextSegment);
}

function readWorkbenchStructuredDataProperty(
  container: WorkbenchStructuredDataContainer,
  key: string,
): unknown {
  return hasWorkbenchStructuredDataOwnProperty(container, key)
    ? container[key as keyof typeof container]
    : undefined;
}

function writeWorkbenchStructuredDataProperty(
  container: WorkbenchStructuredDataContainer,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(container, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function hasWorkbenchStructuredDataOwnProperty(
  container: WorkbenchStructuredDataContainer,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(container, key);
}

export function asWorkbenchStructuredDataRecord(
  value: unknown,
): WorkbenchStructuredDataRecord | null {
  return isWorkbenchStructuredDataRecord(value) ? value : null;
}
