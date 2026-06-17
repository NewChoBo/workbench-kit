export type JsonConfigValidationState = 'invalid' | 'unchanged' | 'valid-changed';

export interface JsonConfigEditorState {
  canApply: boolean;
  firstError: string | null;
  textDirty: boolean;
  validationOk: boolean;
  validationState: JsonConfigValidationState;
}

export function createJsonConfigEditorState(input: {
  baselineValue: string;
  currentValue: string;
}): JsonConfigEditorState {
  const textDirty = input.currentValue !== input.baselineValue;
  let validationOk = true;
  let firstError: string | null = null;

  if (input.currentValue.trim().length > 0) {
    try {
      JSON.parse(input.currentValue);
    } catch (error) {
      validationOk = false;
      firstError = error instanceof Error ? error.message : 'Invalid JSON';
    }
  }

  const canApply = textDirty && validationOk;
  const validationState: JsonConfigValidationState = !validationOk
    ? 'invalid'
    : textDirty
      ? 'valid-changed'
      : 'unchanged';

  return {
    canApply,
    firstError,
    textDirty,
    validationOk,
    validationState,
  };
}
