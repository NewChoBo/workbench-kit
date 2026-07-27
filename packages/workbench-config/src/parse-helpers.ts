import { WorkbenchConfigValidationError } from './validation-error.js';

export function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkbenchConfigValidationError(`Expected ${label} to be an object.`);
  }

  return value as Record<string, unknown>;
}

export function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a non-empty string.`);
  }

  return value.trim();
}

export function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a non-empty string.`);
  }

  return value.trim();
}

export function assertKnownKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
  label: string,
) {
  const knownKeys = new Set(keys);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new WorkbenchConfigValidationError(`Unexpected ${label} field "${unknownKeys[0]}".`);
  }
}
