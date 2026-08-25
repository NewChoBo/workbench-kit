import {
  isCanonicalDesignSystemText,
  isSameDesignSystemPackRef,
  snapshotUiDesignSystemState,
  validateDesignSystemThemeRef,
  validateUiDesignSystemState,
  type DesignSystemDiagnostic,
  type DesignSystemPackRef,
  type DesignSystemThemeRef,
  type UiDesignSystemState,
} from '@workbench-kit/contracts';

import type { DesignSystemPackLookupResult, DesignSystemPackRegistrySnapshot } from './registry.js';

export interface UiDesignSystemThemeChoice {
  readonly ref: DesignSystemThemeRef;
  readonly displayName: string;
}

export interface UiDesignSystemPackChoice {
  readonly ref: DesignSystemPackRef;
  readonly displayName: string;
  readonly themes: readonly UiDesignSystemThemeChoice[];
}

export interface UiDesignSystemAuthoringChoiceProjection {
  readonly registryRevision: number;
  readonly state: UiDesignSystemState;
  readonly packs: readonly UiDesignSystemPackChoice[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

function freezePackRef(ref: DesignSystemPackRef): DesignSystemPackRef {
  return Object.freeze({ id: ref.id, version: ref.version });
}

function freezeThemeRef(ref: DesignSystemThemeRef): DesignSystemThemeRef {
  return Object.freeze({ pack: freezePackRef(ref.pack), themeId: ref.themeId });
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  const seen = new Set<string>();
  return Object.freeze(
    diagnostics.flatMap((diagnostic) => {
      const key = JSON.stringify(diagnostic);
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        Object.freeze({
          ...diagnostic,
          ...(diagnostic.availableVersions === undefined
            ? {}
            : { availableVersions: Object.freeze([...diagnostic.availableVersions]) }),
          ...(diagnostic.tokenPath === undefined
            ? {}
            : { tokenPath: Object.freeze([...diagnostic.tokenPath]) }),
        }),
      ];
    }),
  );
}

function lookupDiagnostics(
  lookup: Exclude<DesignSystemPackLookupResult, { readonly status: 'resolved' }>,
): readonly DesignSystemDiagnostic[] {
  switch (lookup.status) {
    case 'invalid-request':
      return lookup.diagnostics;
    case 'not-installed':
      return [
        {
          code: 'pack-not-installed',
          message: 'The selected Design System Pack id is not installed.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
      ];
    case 'version-unavailable':
      return [
        {
          code: 'pack-version-unavailable',
          message: 'The selected exact Design System Pack version is unavailable.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
          availableVersions: lookup.availableVersions,
        },
      ];
    case 'invalid':
      return [
        {
          code: 'pack-ref-invalid',
          message: 'The selected exact Design System Pack descriptor is invalid.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
        ...lookup.diagnostics,
      ];
    case 'conflicted':
      return [
        {
          code: 'pack-ref-conflicted',
          message: 'The selected exact Design System Pack ref is conflicted.',
          path: 'state.pack',
          packId: lookup.ref.id,
          requestedVersion: lookup.ref.version,
        },
        ...lookup.diagnostics,
      ];
  }
}

function missingThemeDiagnostic(state: UiDesignSystemState): DesignSystemDiagnostic {
  return {
    code: 'theme-not-found',
    message: 'The selected Theme is unavailable in the exact Design System Pack.',
    path: 'state.theme.themeId',
    packId: state.pack.id,
    requestedVersion: state.pack.version,
    themeId: state.theme.themeId,
  };
}

/**
 * Projects immutable, selectable Design System Pack and Theme choices for authoring surfaces.
 * Invalid or conflicted registry entries remain diagnostic-only and never become choices.
 */
export function projectUiDesignSystemAuthoringChoices(
  registry: DesignSystemPackRegistrySnapshot,
  state: UiDesignSystemState,
): UiDesignSystemAuthoringChoiceProjection {
  const stateSnapshot = snapshotUiDesignSystemState(state);
  const packs = Object.freeze(
    registry.packs().map((descriptor) => {
      const ref = freezePackRef(descriptor.ref);
      return Object.freeze<UiDesignSystemPackChoice>({
        ref,
        displayName: isCanonicalDesignSystemText(descriptor.displayName)
          ? descriptor.displayName
          : descriptor.ref.id,
        themes: Object.freeze(
          descriptor.themes.map((theme) =>
            Object.freeze<UiDesignSystemThemeChoice>({
              ref: freezeThemeRef({ pack: descriptor.ref, themeId: theme.id }),
              displayName: isCanonicalDesignSystemText(theme.displayName)
                ? theme.displayName
                : theme.id,
            }),
          ),
        ),
      });
    }),
  );

  const lookup = registry.lookup(stateSnapshot.pack);
  const currentDiagnostics: DesignSystemDiagnostic[] = [
    ...validateUiDesignSystemState(stateSnapshot),
  ];
  if (lookup.status !== 'resolved') {
    currentDiagnostics.push(...lookupDiagnostics(lookup));
  } else if (
    validateDesignSystemThemeRef(stateSnapshot.theme).length === 0 &&
    isSameDesignSystemPackRef(stateSnapshot.pack, stateSnapshot.theme.pack) &&
    !lookup.descriptor.themes.some((theme) => theme.id === stateSnapshot.theme.themeId)
  ) {
    currentDiagnostics.push(missingThemeDiagnostic(stateSnapshot));
  }

  return Object.freeze<UiDesignSystemAuthoringChoiceProjection>({
    registryRevision: registry.revision,
    state: stateSnapshot,
    packs,
    diagnostics: freezeDiagnostics([...registry.diagnostics(), ...currentDiagnostics]),
  });
}
