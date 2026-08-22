import {
  UnsupportedDesignSystemSnapshotValueError,
  isCanonicalDesignSystemText,
  isSameDesignSystemPackRef,
  snapshotUiDesignSystemState,
  validateDesignSystemPackRef,
  validateDesignSystemThemeRef,
  validateDesignSystemThemeScopeSelection,
  type DesignSystemContributionProvenance,
  type DesignSystemDiagnostic,
  type DesignSystemPackDescriptor,
  type DesignSystemThemeDescriptor,
  type DesignSystemThemeScopeSelection,
  type UiDesignSystemState,
} from '@workbench-kit/contracts';

import type { DesignSystemPackLookupResult, DesignSystemPackRegistrySnapshot } from './registry.js';

export interface DesignSystemResolutionRequest {
  readonly state: UiDesignSystemState;
  readonly scopeChain?: readonly string[];
}

export interface ResolvedDesignSystemScope {
  readonly scopeId: string;
  readonly selection: DesignSystemThemeScopeSelection;
}

export interface ResolvedDesignSystemSelection {
  readonly registryRevision: number;
  readonly pack: DesignSystemPackDescriptor;
  readonly theme: DesignSystemThemeDescriptor;
  readonly selectedBy:
    { readonly kind: 'document' } | { readonly kind: 'scope'; readonly scopeId: string };
  readonly appliedScopes: readonly ResolvedDesignSystemScope[];
  readonly provenance: DesignSystemContributionProvenance;
}

export interface DesignSystemResolutionResult {
  readonly selection?: ResolvedDesignSystemSelection;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(
    diagnostics.map((diagnostic) =>
      Object.freeze({
        ...diagnostic,
        ...(diagnostic.availableVersions !== undefined
          ? { availableVersions: Object.freeze([...diagnostic.availableVersions]) }
          : {}),
      }),
    ),
  );
}

function failure(diagnostics: readonly DesignSystemDiagnostic[]): DesignSystemResolutionResult {
  return Object.freeze({ diagnostics: freezeDiagnostics(diagnostics) });
}

function invalidStateShape(path = 'state'): DesignSystemResolutionResult {
  return failure([
    {
      code: 'invalid-state-shape',
      message: 'Design System resolution state must be a declarative plain data object.',
      path,
    },
  ]);
}

function invalidScopeChain(): DesignSystemResolutionResult {
  return failure([
    {
      code: 'invalid-scope-chain',
      message: 'Design System scopeChain must be a declarative array of scope ids.',
      path: 'scopeChain',
    },
  ]);
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnDataValue(
  value: Readonly<Record<string, unknown>>,
  key: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return { ok: true, value: undefined };
  if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return { ok: false };
  return { ok: true, value: descriptor.value };
}

function snapshotScopeChain(value: unknown): readonly string[] | null {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return null;

  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined) {
      result.push(undefined);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
    result.push(descriptor.value);
  }
  return Object.freeze(result) as readonly string[];
}

function lookupFailure(
  lookup: Exclude<DesignSystemPackLookupResult, { readonly status: 'resolved' }>,
): DesignSystemResolutionResult {
  switch (lookup.status) {
    case 'invalid-request':
      return failure(lookup.diagnostics);
    case 'not-installed':
      return failure([
        {
          code: 'pack-not-installed',
          message: 'The requested Design System Pack id is not installed.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
      ]);
    case 'version-unavailable':
      return failure([
        {
          code: 'pack-version-unavailable',
          message: 'The requested exact Design System Pack version is unavailable.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
          availableVersions: lookup.availableVersions,
        },
      ]);
    case 'invalid':
      return failure([
        {
          code: 'pack-ref-invalid',
          message: 'The requested exact Design System Pack descriptor is invalid.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
        ...lookup.diagnostics,
      ]);
    case 'conflicted':
      return failure([
        {
          code: 'pack-ref-conflicted',
          message: 'The requested exact Design System Pack ref is conflicted.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
        ...lookup.diagnostics,
      ]);
  }
}

function validateRootState(state: UiDesignSystemState): readonly DesignSystemDiagnostic[] {
  const stateRecord =
    typeof state === 'object' && state !== null
      ? (state as unknown as Partial<UiDesignSystemState>)
      : {};
  const pack = stateRecord.pack as UiDesignSystemState['pack'];
  const theme = stateRecord.theme as UiDesignSystemState['theme'];
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(pack, 'state.pack'),
    ...validateDesignSystemThemeRef(theme, 'state.theme'),
  ];
  if (
    validateDesignSystemPackRef(pack).length === 0 &&
    validateDesignSystemPackRef(theme?.pack).length === 0 &&
    !isSameDesignSystemPackRef(pack, theme.pack)
  ) {
    diagnostics.push({
      code: 'theme-pack-mismatch',
      message: 'Document Theme must belong to the exact document Design System Pack.',
      path: 'state.theme.pack',
      packId: pack.id,
      requestedVersion: pack.version,
      themeId: theme.themeId,
    });
  }
  return freezeDiagnostics(diagnostics);
}

function validateScopeChain(
  scopeChain: readonly string[],
  state: UiDesignSystemState,
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  const seen = new Set<string>();
  const pack =
    typeof state === 'object' && state !== null
      ? (state as unknown as Partial<UiDesignSystemState>).pack
      : undefined;
  scopeChain.forEach((scopeId, index) => {
    if (!isCanonicalDesignSystemText(scopeId)) {
      diagnostics.push({
        code: 'noncanonical-scope-id',
        message: 'ThemeScope id must be non-blank and already trimmed.',
        path: `scopeChain[${index}]`,
        packId: pack?.id,
        requestedVersion: pack?.version,
        scopeId,
      });
      return;
    }
    if (seen.has(scopeId)) {
      diagnostics.push({
        code: 'duplicate-scope-id',
        message: 'ThemeScope chain must not contain duplicate scope ids.',
        path: `scopeChain[${index}]`,
        packId: pack?.id,
        requestedVersion: pack?.version,
        scopeId,
      });
      return;
    }
    seen.add(scopeId);
  });
  return freezeDiagnostics(diagnostics);
}

export class DesignSystemResolver {
  resolve(
    snapshot: DesignSystemPackRegistrySnapshot,
    request: DesignSystemResolutionRequest,
  ): DesignSystemResolutionResult {
    if (!isPlainRecord(request)) return invalidStateShape('request');
    const stateValue = readOwnDataValue(request, 'state');
    if (!stateValue.ok) return invalidStateShape();
    const scopeChainValue = readOwnDataValue(request, 'scopeChain');
    if (!scopeChainValue.ok) return invalidScopeChain();

    let state: UiDesignSystemState;
    try {
      state = snapshotUiDesignSystemState(stateValue.value as UiDesignSystemState);
    } catch (error) {
      if (error instanceof UnsupportedDesignSystemSnapshotValueError) {
        return invalidStateShape();
      }
      throw error;
    }
    if (!isPlainRecord(state)) return invalidStateShape();

    const scopeChain = snapshotScopeChain(scopeChainValue.value);
    if (scopeChain === null) return invalidScopeChain();
    const inputDiagnostics = [
      ...validateRootState(state),
      ...validateScopeChain(scopeChain, state),
    ];
    if (inputDiagnostics.length > 0) return failure(inputDiagnostics);

    const lookup = snapshot.lookup(state.pack);
    if (lookup.status !== 'resolved') return lookupFailure(lookup);
    const pack = lookup.descriptor;
    let theme = pack.themes.find((candidate) => candidate.id === state.theme.themeId);
    if (theme === undefined) {
      return failure([
        {
          code: 'theme-not-found',
          message: 'The explicit document Theme does not exist in the exact Design System Pack.',
          path: 'state.theme.themeId',
          packId: state.pack.id,
          requestedVersion: state.pack.version,
          themeId: state.theme.themeId,
        },
      ]);
    }

    const appliedScopes: ResolvedDesignSystemScope[] = [];
    let selectedBy: ResolvedDesignSystemSelection['selectedBy'] = Object.freeze({
      kind: 'document',
    });
    const scopeDiagnostics: DesignSystemDiagnostic[] = [];
    for (const scopeId of scopeChain) {
      if (
        state.scopes === undefined ||
        !Object.prototype.hasOwnProperty.call(state.scopes, scopeId)
      ) {
        scopeDiagnostics.push({
          code: 'scope-selection-not-found',
          message: 'The active ThemeScope has no selection in document design-system state.',
          path: `state.scopes[${JSON.stringify(scopeId)}]`,
          packId: state.pack.id,
          requestedVersion: state.pack.version,
          scopeId,
        });
        continue;
      }

      const selection = state.scopes[scopeId];
      const path = `state.scopes[${JSON.stringify(scopeId)}]`;
      const selectionDiagnostics = validateDesignSystemThemeScopeSelection(
        selection,
        state.pack,
        path,
        scopeId,
      );
      scopeDiagnostics.push(...selectionDiagnostics);
      if (selectionDiagnostics.length > 0) continue;

      appliedScopes.push(Object.freeze({ scopeId, selection }));
      if (selection.theme === undefined) continue;
      const scopedTheme = pack.themes.find(
        (candidate) => candidate.id === selection.theme?.themeId,
      );
      if (scopedTheme === undefined) {
        scopeDiagnostics.push({
          code: 'scope-theme-not-found',
          message: 'The active ThemeScope Theme does not exist in the exact Design System Pack.',
          path: `${path}.theme.themeId`,
          packId: state.pack.id,
          requestedVersion: state.pack.version,
          themeId: selection.theme.themeId,
          scopeId,
        });
        continue;
      }
      theme = scopedTheme;
      selectedBy = Object.freeze({ kind: 'scope', scopeId });
    }

    if (scopeDiagnostics.length > 0) return failure(scopeDiagnostics);
    const selection = Object.freeze<ResolvedDesignSystemSelection>({
      registryRevision: snapshot.revision,
      pack,
      theme,
      selectedBy,
      appliedScopes: Object.freeze(appliedScopes),
      provenance: pack.provenance,
    });
    return Object.freeze({ selection, diagnostics: Object.freeze([]) });
  }
}
