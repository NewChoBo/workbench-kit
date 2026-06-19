import { WorkbenchConfigValidationError } from './validation-error.js';

export interface WorkbenchUserCommandExecuteAction {
  readonly args?: unknown;
  readonly command: string;
  readonly type: 'executeCommand';
}

export interface WorkbenchUserCommandSequenceAction {
  readonly steps: readonly WorkbenchUserCommandAction[];
  readonly type: 'sequence';
}

export type WorkbenchUserCommandAction =
  | WorkbenchUserCommandExecuteAction
  | WorkbenchUserCommandSequenceAction;

export interface WorkbenchUserCommandDefinition {
  readonly action: WorkbenchUserCommandAction;
  readonly category?: string | undefined;
  readonly command: string;
  readonly title: string;
}

export interface WorkbenchUserCommandsConfig {
  readonly commands: readonly WorkbenchUserCommandDefinition[];
  readonly version?: number | undefined;
}

export function parseWorkbenchUserCommandsConfig(input: unknown): WorkbenchUserCommandsConfig {
  const record = assertRecord(input, 'user commands config');
  assertKnownKeys(record, ['commands', 'version'], 'user commands config');

  const commands = record.commands;
  if (!Array.isArray(commands)) {
    throw new WorkbenchConfigValidationError('Expected "commands" to be an array.');
  }

  return {
    commands: commands.map((entry, index) => parseUserCommandDefinition(entry, index)),
    ...(readOptionalNumber(record, 'version') !== undefined
      ? { version: readOptionalNumber(record, 'version') }
      : {}),
  };
}

export function parseWorkbenchUserCommandsConfigJson(jsonText: string): WorkbenchUserCommandsConfig {
  try {
    return parseWorkbenchUserCommandsConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected user commands config to be valid JSON.');
  }
}

function parseUserCommandDefinition(input: unknown, index: number): WorkbenchUserCommandDefinition {
  const record = assertRecord(input, `user commands[${index}]`);
  assertKnownKeys(record, ['action', 'category', 'command', 'title'], `user commands[${index}]`);

  return {
    action: parseUserCommandAction(record.action, `user commands[${index}].action`),
    ...(readOptionalString(record, 'category') ? { category: readOptionalString(record, 'category') } : {}),
    command: readRequiredString(record, 'command'),
    title: readRequiredString(record, 'title'),
  };
}

function parseUserCommandAction(input: unknown, label: string): WorkbenchUserCommandAction {
  const record = assertRecord(input, label);
  const type = readRequiredString(record, 'type');

  if (type === 'executeCommand') {
    assertKnownKeys(record, ['args', 'command', 'type'], label);
    return {
      ...(record.args !== undefined ? { args: record.args } : {}),
      command: readRequiredString(record, 'command'),
      type,
    };
  }

  if (type === 'sequence') {
    assertKnownKeys(record, ['steps', 'type'], label);
    const steps = record.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new WorkbenchConfigValidationError(`Expected "${label}.steps" to be a non-empty array.`);
    }

    return {
      steps: steps.map((step, index) => parseUserCommandAction(step, `${label}.steps[${index}]`)),
      type,
    };
  }

  throw new WorkbenchConfigValidationError(`Unexpected ${label} type "${type}".`);
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

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a finite number.`);
  }

  return value;
}

function assertKnownKeys(record: Record<string, unknown>, keys: readonly string[], label: string) {
  const knownKeys = new Set(keys);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new WorkbenchConfigValidationError(`Unexpected ${label} field "${unknownKeys[0]}".`);
  }
}
