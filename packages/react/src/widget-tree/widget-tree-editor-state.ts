import { validateJsonWidgetData } from '@workbench-kit/jdw';

export type WidgetTreeValidationState = 'invalid' | 'unchanged' | 'valid-changed';

export interface WidgetTreeEditorState {
  readonly canApply: boolean;
  readonly firstError: string | null;
  readonly textDirty: boolean;
  readonly validationOk: boolean;
  readonly validationState: WidgetTreeValidationState;
}

export function createWidgetTreeEditorState(input: {
  readonly baselineValue: string;
  readonly currentValue: string;
  readonly registeredTypes?: readonly string[] | undefined;
}): WidgetTreeEditorState {
  const textDirty = input.currentValue !== input.baselineValue;
  const validation = validateJsonWidgetData(input.currentValue, {
    registeredTypes: input.registeredTypes,
    strictKnownTypes: true,
  });
  const validationOk = validation.valid;
  const firstIssue = validation.issues[0];
  const firstError = firstIssue === undefined ? null : `${firstIssue.path}: ${firstIssue.message}`;
  const canApply = textDirty && validationOk;
  const validationState: WidgetTreeValidationState = !validationOk
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
