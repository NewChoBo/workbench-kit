import { WorkbenchConfigValidationError } from './validation-error.js';

export interface WorkbenchKeybindingDefinition {
  readonly args?: readonly unknown[];
  readonly command: string;
  readonly key: string;
  readonly when?: string;
}

export function parseWorkbenchKeybindingsConfig(
  input: unknown,
): readonly WorkbenchKeybindingDefinition[] {
  if (!Array.isArray(input)) {
    throw new WorkbenchConfigValidationError('Expected keybindings config to be an array.');
  }

  return input.map((entry, index) => parseWorkbenchKeybindingDefinition(entry, index));
}

export function parseWorkbenchKeybindingsConfigJson(
  jsonText: string,
): readonly WorkbenchKeybindingDefinition[] {
  try {
    return parseWorkbenchKeybindingsConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected keybindings config to be valid JSON.');
  }
}

function parseWorkbenchKeybindingDefinition(
  input: unknown,
  index: number,
): WorkbenchKeybindingDefinition {
  const record = assertRecord(input, `keybindings[${index}]`);
  assertKnownKeys(record, ['args', 'command', 'key', 'when'], `keybindings[${index}]`);

  const args = readOptionalArgs(record);

  return {
    ...(args ? { args } : {}),
    command: readRequiredString(record, 'command'),
    key: readRequiredString(record, 'key'),
    ...(readOptionalString(record, 'when') ? { when: readOptionalString(record, 'when') } : {}),
  };
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkbenchConfigValidationError(`Expected ${label} to be an object.`);
  }

  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalArgs(record: Record<string, unknown>): readonly unknown[] | undefined {
  const value = record.args;
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new WorkbenchConfigValidationError('Expected "args" to be an array.');
  }

  return [...value];
}

function assertKnownKeys(record: Record<string, unknown>, keys: readonly string[], label: string) {
  const knownKeys = new Set(keys);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new WorkbenchConfigValidationError(`Unexpected ${label} field "${unknownKeys[0]}".`);
  }
}
