/**
 * UI-agnostic widget registry boundary for JSON layout composition.
 * Implementations (e.g. json-widget-tree) provide concrete build/render types.
 */
export type WidgetJsonSchema = Record<string, unknown>;

export type WidgetInspectorField =
  | {
      kind: 'text' | 'color';
      prop: string;
      label: string;
      placeholder?: string;
    }
  | {
      kind: 'number';
      prop: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      kind: 'select';
      prop: string;
      label: string;
      options: readonly { label: string; value: string }[];
    }
  | {
      kind: 'boolean';
      prop: string;
      label: string;
    };

export interface WidgetInspectorSection {
  readonly title: string;
  readonly fields: readonly WidgetInspectorField[];
}

export interface WidgetTypeShape {
  readonly type: string;
}

export interface WidgetTypeDefinition<
  W extends WidgetTypeShape = WidgetTypeShape,
  TBuild = unknown,
> {
  readonly type: W['type'];
  readonly build: TBuild;
  readonly displayName?: string;
  readonly schema?: WidgetJsonSchema;
  readonly inspector?: readonly WidgetInspectorSection[];
  readonly capabilities?: readonly string[];
}

export interface WidgetRegistryContract<TBuild = unknown> {
  has(type: string): boolean;
  get(type: string): TBuild | undefined;
  definition(type: string): WidgetTypeDefinition<WidgetTypeShape, TBuild> | undefined;
  definitions(): readonly WidgetTypeDefinition<WidgetTypeShape, TBuild>[];
  types(): readonly string[];
}
