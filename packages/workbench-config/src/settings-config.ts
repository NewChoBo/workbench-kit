import { WorkbenchConfigValidationError } from './validation-error.js';

export type WorkbenchSettingsConfig = Readonly<Record<string, unknown>>;

export function parseWorkbenchSettingsConfig(input: unknown): WorkbenchSettingsConfig {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new WorkbenchConfigValidationError('Expected settings config to be an object.');
  }

  const settings = { ...(input as Record<string, unknown>) };
  const colorTheme = settings['workbench.colorTheme'];
  if (colorTheme !== undefined && typeof colorTheme !== 'string') {
    throw new WorkbenchConfigValidationError('Expected workbench.colorTheme to be a string.');
  }

  const editorFontSize = settings['editor.fontSize'];
  if (
    editorFontSize !== undefined &&
    (typeof editorFontSize !== 'number' || !Number.isFinite(editorFontSize) || editorFontSize < 1)
  ) {
    throw new WorkbenchConfigValidationError('Expected editor.fontSize to be a number >= 1.');
  }

  return settings;
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
