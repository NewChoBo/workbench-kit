import {
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
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(state.pack, 'state.pack'),
    ...validateDesignSystemThemeRef(state.theme, 'state.theme'),
  ];
  if (
    validateDesignSystemPackRef(state.pack).length === 0 &&
    validateDesignSystemPackRef(state.theme.pack).length === 0 &&
    !isSameDesignSystemPackRef(state.pack, state.theme.pack)
  ) {
    diagnostics.push({
      code: 'theme-pack-mismatch',
      message: 'Document Theme must belong to the exact document Design System Pack.',
      path: 'state.theme.pack',
      packId: state.pack.id,
      requestedVersion: state.pack.version,
      themeId: state.theme.themeId,
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
  scopeChain.forEach((scopeId, index) => {
    if (!isCanonicalDesignSystemText(scopeId)) {
      diagnostics.push({
        code: 'noncanonical-scope-id',
        message: 'ThemeScope id must be non-blank and already trimmed.',
        path: `scopeChain[${index}]`,
        packId: state.pack.id,
        requestedVersion: state.pack.version,
        scopeId,
      });
      return;
    }
    if (seen.has(scopeId)) {
      diagnostics.push({
        code: 'duplicate-scope-id',
        message: 'ThemeScope chain must not contain duplicate scope ids.',
        path: `scopeChain[${index}]`,
        packId: state.pack.id,
        requestedVersion: state.pack.version,
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
    const state = snapshotUiDesignSystemState(request.state);
    const scopeChain = Object.freeze([...(request.scopeChain ?? [])]);
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
