const FIELD_REMAP_TRANSFORM_DRAG_TYPE = 'application/x-workbench-field-remap-transform' as const;

type FieldRemapDragDataReader = Pick<DataTransfer, 'getData' | 'types'>;
type FieldRemapDragDataWriter = Pick<DataTransfer, 'setData'>;

export function hasFieldRemapTransformDragType(dataTransfer: Pick<DataTransfer, 'types'>): boolean {
  return Array.from(dataTransfer.types).includes(FIELD_REMAP_TRANSFORM_DRAG_TYPE);
}

function isCanonicalTransformPayload(value: unknown): value is { readonly transformId: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === 'transformId' &&
    typeof (value as { readonly transformId?: unknown }).transformId === 'string' &&
    (value as { readonly transformId: string }).transformId.length > 0
  );
}

/** Internal same-component payload; intentionally not exported from the package surface. */
export function writeFieldRemapTransformDragData(
  dataTransfer: FieldRemapDragDataWriter,
  transformId: string,
): void {
  dataTransfer.setData(FIELD_REMAP_TRANSFORM_DRAG_TYPE, JSON.stringify({ transformId }));
}

/** Parse only the exact private payload shape before callers resolve the registry id. */
export function readFieldRemapTransformDragData(
  dataTransfer: FieldRemapDragDataReader,
): string | undefined {
  if (!hasFieldRemapTransformDragType(dataTransfer)) {
    return undefined;
  }
  const raw = dataTransfer.getData(FIELD_REMAP_TRANSFORM_DRAG_TYPE);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCanonicalTransformPayload(parsed) ? parsed.transformId : undefined;
  } catch {
    return undefined;
  }
}
