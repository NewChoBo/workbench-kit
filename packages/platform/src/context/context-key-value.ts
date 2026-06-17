export type ContextKeyValue = boolean | number | string | null | undefined;

export interface ContextKeyChangeEvent {
  key: string;
  previousValue: ContextKeyValue;
  value: ContextKeyValue;
}

export function isContextKeyTruthy(value: ContextKeyValue): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return value.length > 0;
}
