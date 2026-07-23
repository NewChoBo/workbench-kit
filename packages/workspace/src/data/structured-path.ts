export type WorkbenchStructuredDataPath = readonly (number | string)[];

export type WorkbenchStructuredDataRecord = Record<string, unknown>;

export function getWorkbenchStructuredDataValue(
  data: unknown,
  path: WorkbenchStructuredDataPath,
): unknown {
  return path.reduce<unknown>((currentValue, segment) => {
    if (Array.isArray(currentValue)) {
      const index = getWorkbenchStructuredDataArrayIndex(segment);
      return index === null ? undefined : currentValue[index];
    }
    if (!isWorkbenchStructuredDataRecord(currentValue)) return undefined;
    return currentValue[String(segment)];
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
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getWorkbenchStructuredDataArrayIndex(segment: number | string) {
  const index = typeof segment === 'number' ? segment : Number(segment);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function createWorkbenchStructuredDataContainer(segment: number | string | undefined) {
  return segment !== undefined && getWorkbenchStructuredDataArrayIndex(segment) !== null ? [] : {};
}

export function cloneWorkbenchStructuredDataContainer(
  value: unknown,
  nextSegment: number | string | undefined,
): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return [...value];
  if (isWorkbenchStructuredDataRecord(value)) return { ...value };
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

  if (rest.length === 0) {
    root[key as keyof typeof root] = value as never;
    return root;
  }

  const currentChild = root[key as keyof typeof root];
  root[key as keyof typeof root] = setWorkbenchStructuredDataPathValue(
    currentChild,
    rest,
    value,
  ) as never;
  return root;
}

// Keep it compatible/clean
function cloneWorkspaceContainer(
  value: unknown,
  nextSegment: number | string | undefined,
): Record<string, unknown> | unknown[] {
  return cloneWorkbenchStructuredDataContainer(value, nextSegment);
}

export function asWorkbenchStructuredDataRecord(
  value: unknown,
): WorkbenchStructuredDataRecord | null {
  return isWorkbenchStructuredDataRecord(value) ? value : null;
}
