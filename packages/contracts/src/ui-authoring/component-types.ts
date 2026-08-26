import type { UiPropertyDescriptor, UiValueSchema } from './types';

export const UI_COMPONENT_KINDS = Object.freeze(['atomic', 'composite'] as const);
export type UiComponentKind = (typeof UI_COMPONENT_KINDS)[number];

export const UI_BINDING_DIRECTIONS = Object.freeze(['input', 'output', 'bidirectional'] as const);
export type UiBindingDirection = (typeof UI_BINDING_DIRECTIONS)[number];

export const UI_CHILD_SLOT_CARDINALITIES = Object.freeze(['one', 'many'] as const);
export type UiChildSlotCardinality = (typeof UI_CHILD_SLOT_CARDINALITIES)[number];

export interface UiComponentRef {
  readonly id: string;
  readonly version: string;
}

export interface UiComponentEventDescriptor {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly payload?: UiValueSchema;
}

export interface UiComponentBindingDescriptor {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly semanticRole?: string;
  readonly direction: UiBindingDirection;
  readonly value: UiValueSchema;
}

export interface UiComponentChildSlotDescriptor {
  readonly id: string;
  readonly cardinality: UiChildSlotCardinality;
  readonly allowedComponents?: readonly UiComponentRef[];
}

export interface UiComponentLayoutSupport {
  readonly childSlots?: readonly UiComponentChildSlotDescriptor[];
  readonly supportedStrategyIds?: readonly string[];
  readonly defaultStrategyId?: string;
}

export interface UiComponentAccessibilityDescriptor {
  readonly supportedRoles?: readonly string[];
  readonly defaultRole?: string;
  readonly accessibleNamePropertyId?: string;
  readonly accessibleDescriptionPropertyId?: string;
}

export interface UiComponentDesignTimeMetadata {
  readonly label: string;
  readonly description?: string;
  readonly category?: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly hiddenFromPalette?: boolean;
}

export interface UiComponentDescriptorBase extends UiComponentRef {
  readonly kind: UiComponentKind;
  readonly properties?: readonly UiPropertyDescriptor[];
  readonly events?: readonly UiComponentEventDescriptor[];
  readonly bindings?: readonly UiComponentBindingDescriptor[];
  readonly layout?: UiComponentLayoutSupport;
  readonly accessibility?: UiComponentAccessibilityDescriptor;
  readonly designTime: UiComponentDesignTimeMetadata;
}

export interface UiAtomicComponentDescriptor extends UiComponentDescriptorBase {
  readonly kind: 'atomic';
}

export interface UiCompositeComponentDescriptor extends UiComponentDescriptorBase {
  readonly kind: 'composite';
  readonly compositionRef: string;
}

export type UiComponentDescriptor = UiAtomicComponentDescriptor | UiCompositeComponentDescriptor;

export interface UiComponentCatalogContribution {
  readonly contributorId: string;
  readonly components: readonly UiComponentDescriptor[];
}

export function isUiComponentKind(value: unknown): value is UiComponentKind {
  return typeof value === 'string' && UI_COMPONENT_KINDS.includes(value as UiComponentKind);
}

export function isUiBindingDirection(value: unknown): value is UiBindingDirection {
  return typeof value === 'string' && UI_BINDING_DIRECTIONS.includes(value as UiBindingDirection);
}

export function isUiChildSlotCardinality(value: unknown): value is UiChildSlotCardinality {
  return (
    typeof value === 'string' &&
    UI_CHILD_SLOT_CARDINALITIES.includes(value as UiChildSlotCardinality)
  );
}
