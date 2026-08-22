import type { UiComponentDescriptor } from '../ui-authoring/component-types';
import type { UiValueSource } from '../ui-authoring/types';

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
}
