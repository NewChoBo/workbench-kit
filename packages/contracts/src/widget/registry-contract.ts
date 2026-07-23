/**
 * UI-agnostic widget registry boundary for JSON layout composition.
 * Implementations (e.g. json-widget-tree) provide concrete build/render types.
 */
export type WidgetJsonSchema = Record<string, unknown>;

export const WIDGET_HOST_TAGS = [
  'article',
  'aside',
  'div',
  'footer',
  'header',
  'main',
  'nav',
  'section',
  'span',
] as const;

export type WidgetHostTag = (typeof WIDGET_HOST_TAGS)[number];

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

export interface WidgetMeasureConstraints {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export interface WidgetMeasureResult {
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

export type WidgetMeasureFunction = (
  widget: WidgetTypeShape,
  constraints: WidgetMeasureConstraints,
) => WidgetMeasureResult | null | undefined;

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
  readonly hostTag?: WidgetHostTag;
  readonly measure?: WidgetMeasureFunction;
}

export function isWidgetHostTag(value: unknown): value is WidgetHostTag {
  return typeof value === 'string' && WIDGET_HOST_TAGS.includes(value as WidgetHostTag);
}

export interface WidgetRegistryContract<TBuild = unknown> {
  has(type: string): boolean;
  get(type: string): TBuild | undefined;
  definition(type: string): WidgetTypeDefinition<WidgetTypeShape, TBuild> | undefined;
  definitions(): readonly WidgetTypeDefinition<WidgetTypeShape, TBuild>[];
  types(): readonly string[];
}
