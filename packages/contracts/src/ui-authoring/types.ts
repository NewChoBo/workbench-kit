export const UI_VALUE_SOURCE_KINDS = Object.freeze([
  'literal',
  'token',
  'resource',
  'binding',
  'expression',
] as const);

export type UiValueSourceKind = (typeof UI_VALUE_SOURCE_KINDS)[number];

export type UiValueType =
  'string' | 'number' | 'boolean' | 'color' | 'enum' | (string & Record<never, never>);

export interface UiValueEditorDescriptor {
  readonly id: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface UiValueSchema<TLiteral = unknown> {
  readonly type: UiValueType;
  readonly defaultValue?: TLiteral;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly editor?: UiValueEditorDescriptor;
  readonly allowedSources?: readonly UiValueSourceKind[];
}

export interface UiPropertyDescriptor<TLiteral = unknown> {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly value: UiValueSchema<TLiteral>;
}

export type UiValueSource<TLiteral = unknown> =
  | { readonly kind: 'literal'; readonly value: TLiteral }
  | { readonly kind: 'token'; readonly tokenId: string }
  | { readonly kind: 'resource'; readonly resourceId: string }
  | { readonly kind: 'binding'; readonly bindingId: string }
  | { readonly kind: 'expression'; readonly expressionId: string };

export type UiPropertyValue<TLiteral = unknown> = UiValueSource<TLiteral>;

export type WidgetInspectorScalarValue = string | number | boolean;
