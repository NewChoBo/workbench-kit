export interface IntegrationCommandAction<TCommandId extends string = string> {
  readonly enabled: boolean;
  readonly execute: () => Promise<void> | void;
  readonly id: TCommandId;
  readonly label: string;
  readonly visible?: boolean | undefined;
}

export function createIntegrationCommandAction<TCommandId extends string = string>(input: {
  busy?: boolean;
  busyLabel?: string;
  enabled: boolean;
  execute: () => Promise<void> | void;
  id: TCommandId;
  label: string;
  visible?: boolean;
}): IntegrationCommandAction<TCommandId> {
  return {
    enabled: input.enabled,
    execute: input.execute,
    id: input.id,
    label: input.busy === true ? (input.busyLabel ?? input.label) : input.label,
    visible: input.visible ?? true,
  };
}
