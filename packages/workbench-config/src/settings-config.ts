import { WorkbenchConfigValidationError } from './validation-error.js';

export type WorkbenchSettingsConfig = Readonly<Record<string, unknown>>;

export function parseWorkbenchSettingsConfig(input: unknown): WorkbenchSettingsConfig {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new WorkbenchConfigValidationError('Expected settings config to be an object.');
  }

  return { ...(input as Record<string, unknown>) };
}

export function parseWorkbenchSettingsConfigJson(jsonText: string): WorkbenchSettingsConfig {
  try {
    return parseWorkbenchSettingsConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected settings config to be valid JSON.');
  }
}
