export interface KeybindingDefinition {
  args?: readonly unknown[];
  command: string;
  key: string;
  when?: string;
}

export interface KeybindingMatch extends KeybindingDefinition {
  readonly specificity: number;
}

export interface KeybindingResolveOptions {
  key: string;
  whenContext?: Readonly<Record<string, boolean | number | string | null | undefined>>;
}
