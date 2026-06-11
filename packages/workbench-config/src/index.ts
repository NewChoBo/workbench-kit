export const WORKBENCH_KIT_WORKBENCH_CONFIG_VERSION = '0.0.0' as const;

export const WORKBENCH_CONFIG_DIR = '.workbench' as const;

export type WorkbenchConfigFileName =
  | 'workspace.json'
  | 'settings.json'
  | 'keybindings.json'
  | 'extensions.json'
  | 'extensions.lock.json'
  | 'layout.default.json'
  | 'tasks.json';

export interface WorkbenchExtensionsConfig {
  enabled: readonly string[];
  recommendations: readonly string[];
}

export class WorkbenchConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkbenchConfigValidationError';
  }
}

export function parseWorkbenchExtensionsConfig(input: unknown): WorkbenchExtensionsConfig {
  const record = assertRecord(input, 'extensions config');

  return {
    enabled: readOptionalStringArray(record, 'enabled'),
    recommendations: readOptionalStringArray(record, 'recommendations'),
  };
}

export function parseWorkbenchExtensionsConfigJson(jsonText: string): WorkbenchExtensionsConfig {
  try {
    return parseWorkbenchExtensionsConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected extensions config to be valid JSON.');
  }
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkbenchConfigValidationError(`Expected ${label} to be an object.`);
  }

  return value as Record<string, unknown>;
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  key: keyof WorkbenchExtensionsConfig,
): readonly string[] {
  const value = record[key];
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be an array of strings.`);
  }

  return [...value];
}
