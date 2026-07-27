import {
  assertKnownKeys,
  assertRecord,
  readOptionalString,
  readRequiredString,
} from './parse-helpers.js';
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
