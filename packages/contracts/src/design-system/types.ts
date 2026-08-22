import type {
  UiBindingDirection,
  UiChildSlotCardinality,
  UiComponentDescriptor,
  UiComponentRef,
} from '../ui-authoring/component-types';
import type {
  UiValueSchema,
  UiValueSource,
  UiValueSourceKind,
  UiValueType,
} from '../ui-authoring/types';

export const DESIGN_SYSTEM_CONTRIBUTION_SOURCES = Object.freeze([
  'builtin',
  'extension',
  'host',
] as const);

export type DesignSystemContributionSource = (typeof DESIGN_SYSTEM_CONTRIBUTION_SOURCES)[number];

export interface DesignSystemPackRef {
  readonly id: string;
  readonly version: string;
}

export interface DesignSystemThemeRef {
  readonly pack: DesignSystemPackRef;
  readonly themeId: string;
}

export interface DesignSystemContributionProvenance {
  readonly source: DesignSystemContributionSource;
  readonly sourceId: string;
  readonly sourceVersion: string;
}

export type DesignSystemTokenValueSchema = Omit<UiValueSchema, 'defaultValue'>;
export type DesignSystemResourceValueSchema = Pick<UiValueSchema, 'type'>;

export interface DesignSystemTokenDescriptor {
  readonly id: string;
  readonly value: DesignSystemTokenValueSchema;
}

export const DESIGN_SYSTEM_RESOURCE_TRUST_REQUIREMENTS = Object.freeze([
  'authorized-pack',
] as const);
export type DesignSystemResourceTrustRequirement =
  (typeof DESIGN_SYSTEM_RESOURCE_TRUST_REQUIREMENTS)[number];

export const DESIGN_SYSTEM_RESOURCE_LOADING_REQUIREMENTS = Object.freeze([
  'renderer-resolved',
] as const);
export type DesignSystemResourceLoadingRequirement =
  (typeof DESIGN_SYSTEM_RESOURCE_LOADING_REQUIREMENTS)[number];

export interface DesignSystemResourceDescriptor {
  readonly id: string;
  readonly value: DesignSystemResourceValueSchema;
  readonly mediaType?: string;
  readonly trust: DesignSystemResourceTrustRequirement;
  readonly loading: DesignSystemResourceLoadingRequirement;
}

export interface DesignSystemComponentRoleRef {
  readonly id: string;
  readonly version: string;
}

export interface DesignSystemRequiredPropertyCapability {
  readonly id: string;
  readonly type: UiValueType;
  readonly allowedSources?: readonly UiValueSourceKind[];
}

export interface DesignSystemRequiredEventCapability {
  readonly id: string;
  readonly payloadType?: UiValueType;
}

export interface DesignSystemRequiredBindingCapability {
  readonly id: string;
  readonly direction: UiBindingDirection;
  readonly type: UiValueType;
}

export interface DesignSystemRequiredChildSlotCapability {
  readonly id: string;
  readonly cardinality: UiChildSlotCardinality;
}

export interface DesignSystemComponentRoleRequirements {
  readonly properties?: readonly DesignSystemRequiredPropertyCapability[];
  readonly events?: readonly DesignSystemRequiredEventCapability[];
  readonly bindings?: readonly DesignSystemRequiredBindingCapability[];
  readonly childSlots?: readonly DesignSystemRequiredChildSlotCapability[];
  readonly supportedStrategyIds?: readonly string[];
  readonly accessibilityRoles?: readonly string[];
}

export interface DesignSystemComponentRoleMapping {
  readonly role: DesignSystemComponentRoleRef;
  readonly requirements: DesignSystemComponentRoleRequirements;
  readonly component: UiComponentRef;
}

export interface DesignSystemThemeDescriptor {
  readonly id: string;
  readonly displayName?: string;
  readonly tokenValues?: Readonly<Record<string, UiValueSource>>;
}

export interface DesignSystemThemeScopeSelection {
  readonly theme?: DesignSystemThemeRef;
  readonly tokenOverrides?: Readonly<Record<string, UiValueSource>>;
}

export interface UiDesignSystemState {
  readonly pack: DesignSystemPackRef;
  readonly theme: DesignSystemThemeRef;
  readonly scopes?: Readonly<Record<string, DesignSystemThemeScopeSelection>>;
}

export interface DesignSystemPackDescriptor {
  readonly ref: DesignSystemPackRef;
  readonly displayName?: string;
  readonly defaultThemeId: string;
  readonly defaultTokenValues?: Readonly<Record<string, UiValueSource>>;
  readonly themes: readonly DesignSystemThemeDescriptor[];
  readonly components: readonly UiComponentDescriptor[];
  readonly tokens?: readonly DesignSystemTokenDescriptor[];
  readonly resources?: readonly DesignSystemResourceDescriptor[];
  readonly componentRoles?: readonly DesignSystemComponentRoleMapping[];
  readonly provenance: DesignSystemContributionProvenance;
}

export interface DesignSystemPackContribution {
  readonly contributionId: string;
  readonly packs: readonly DesignSystemPackDescriptor[];
}

export const DESIGN_SYSTEM_DIAGNOSTIC_CODES = Object.freeze([
  'invalid-contribution-shape',
  'blank-contribution-id',
  'duplicate-contribution-id',
  'invalid-pack-descriptor',
  'noncanonical-pack-id',
  'noncanonical-pack-version',
  'noncanonical-provenance',
  'empty-theme-catalog',
  'noncanonical-theme-id',
  'duplicate-theme-id',
  'default-theme-not-found',
  'invalid-component-descriptor',
  'noncanonical-token-id',
  'invalid-token-value-source',
  'invalid-token-descriptor',
  'duplicate-token-id',
  'invalid-resource-descriptor',
  'duplicate-resource-id',
  'invalid-component-role',
  'duplicate-component-role-mapping',
  'conflicting-component-role-contract',
  'component-role-target-not-found',
  'component-role-capability-mismatch',
  'duplicate-pack-ref',
  'pack-not-installed',
  'pack-version-unavailable',
  'pack-ref-invalid',
  'pack-ref-conflicted',
  'theme-pack-mismatch',
  'theme-not-found',
  'invalid-state-shape',
  'invalid-scope-chain',
  'noncanonical-scope-id',
  'duplicate-scope-id',
  'invalid-scope-selection',
  'scope-selection-not-found',
  'scope-theme-pack-mismatch',
  'scope-theme-not-found',
  'token-not-found',
  'token-value-not-found',
  'token-cycle',
  'token-type-mismatch',
  'unsupported-token-source-kind',
  'resource-not-found',
  'resource-type-mismatch',
  'component-not-found',
  'property-not-found',
  'component-value-not-found',
  'disallowed-value-source',
  'literal-type-mismatch',
  'replacement-source-conflicted',
  'replacement-candidate-not-found',
  'duplicate-replacement-candidate',
] as const);

export type DesignSystemDiagnosticCode = (typeof DESIGN_SYSTEM_DIAGNOSTIC_CODES)[number];

export interface DesignSystemDiagnostic {
  readonly code: DesignSystemDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly contributionId?: string;
  readonly packId?: string;
  readonly requestedVersion?: string;
  readonly availableVersions?: readonly string[];
  readonly themeId?: string;
  readonly scopeId?: string;
  readonly tokenId?: string;
  readonly resourceId?: string;
  readonly componentId?: string;
  readonly componentVersion?: string;
  readonly propertyId?: string;
  readonly roleId?: string;
  readonly roleVersion?: string;
  readonly tokenPath?: readonly string[];
}
