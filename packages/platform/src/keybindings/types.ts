export interface KeybindingDefinition {
  args?: readonly unknown[] | undefined;
  command: string;
  key: string;
  when?: string | undefined;
}

export interface KeybindingMatch extends KeybindingDefinition {
  readonly specificity: number;
}

export interface KeybindingResolveOptions {
  key: string;
  whenContext?: Readonly<Record<string, boolean | number | string | null | undefined>>;
}
