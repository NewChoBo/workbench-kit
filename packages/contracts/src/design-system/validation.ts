import { validateUiComponentDescriptor } from '../ui-authoring/component-validation';
import type { UiComponentDescriptor } from '../ui-authoring/component-types';
import { isStructurallyValidUiValueSource } from '../ui-authoring/validation';
import { cloneAndFreezeDeclarativeSnapshot } from '../declarative-snapshot';
import { validateDesignSystemDescriptorExtensions } from './descriptor-validation';
import {
  DESIGN_SYSTEM_CONTRIBUTION_SOURCES,
  type DesignSystemContributionProvenance,
  type DesignSystemContributionSource,
  type DesignSystemDiagnostic,
  type DesignSystemPackContribution,
  type DesignSystemPackDescriptor,
  type DesignSystemPackRef,
  type DesignSystemThemeRef,
  type DesignSystemThemeScopeSelection,
  type UiDesignSystemState,
} from './types';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataEntries(value: object): readonly (readonly [PropertyKey, unknown])[] | null {
  const entries: (readonly [PropertyKey, unknown])[] = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return null;
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

type ValidationSnapshot<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

function snapshotValidationInput<T>(value: T): ValidationSnapshot<T> {
  try {
    return {
      ok: true,
      value: cloneAndFreezeDeclarativeSnapshot(value, () => new TypeError('invalid input')),
    };
  } catch {
    return { ok: false };
  }
}

export function isCanonicalDesignSystemText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

export function isDesignSystemContributionSource(
  value: unknown,
): value is DesignSystemContributionSource {
  return (
    typeof value === 'string' &&
    DESIGN_SYSTEM_CONTRIBUTION_SOURCES.includes(value as DesignSystemContributionSource)
  );
}

export function designSystemPackRefKey(ref: DesignSystemPackRef): string {
  return JSON.stringify([ref.id, ref.version]);
}

export function isSameDesignSystemPackRef(
  left: DesignSystemPackRef,
  right: DesignSystemPackRef,
): boolean {
  return left.id === right.id && left.version === right.version;
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

export function validateDesignSystemPackRef(
  ref: DesignSystemPackRef,
  path = 'ref',
): readonly DesignSystemDiagnostic[] {
  const snapshot = snapshotValidationInput(ref);
  const normalizedRef = snapshot.ok ? snapshot.value : (undefined as never);
  const diagnostics: DesignSystemDiagnostic[] = [];
  if (!isCanonicalDesignSystemText(normalizedRef?.id)) {
    diagnostics.push({
      code: 'noncanonical-pack-id',
      message: 'Design System Pack id must be non-blank and already trimmed.',
      path: `${path}.id`,
      packId: normalizedRef?.id,
      requestedVersion: normalizedRef?.version,
    });
  }
  if (!isCanonicalDesignSystemText(normalizedRef?.version)) {
    diagnostics.push({
      code: 'noncanonical-pack-version',
      message: 'Design System Pack version must be non-blank and already trimmed.',
      path: `${path}.version`,
      packId: normalizedRef?.id,
      requestedVersion: normalizedRef?.version,
    });
  }
  return freezeDiagnostics(diagnostics);
}

export function validateDesignSystemThemeRef(
  ref: DesignSystemThemeRef,
  path = 'theme',
): readonly DesignSystemDiagnostic[] {
  const snapshot = snapshotValidationInput(ref);
  const normalizedRef = snapshot.ok ? snapshot.value : (undefined as never);
  const diagnostics = [...validateDesignSystemPackRef(normalizedRef?.pack, `${path}.pack`)];
  if (!isCanonicalDesignSystemText(normalizedRef?.themeId)) {
    diagnostics.push({
      code: 'noncanonical-theme-id',
      message: 'Design System Theme id must be non-blank and already trimmed.',
      path: `${path}.themeId`,
      packId: normalizedRef?.pack?.id,
      requestedVersion: normalizedRef?.pack?.version,
      themeId: normalizedRef?.themeId,
    });
  }
  return freezeDiagnostics(diagnostics);
}

function validateProvenance(
  provenance: DesignSystemContributionProvenance,
  path: string,
  descriptor: DesignSystemPackDescriptor,
): DesignSystemDiagnostic[] {
  if (
    !isPlainRecord(provenance) ||
    !isDesignSystemContributionSource(provenance.source) ||
    !isCanonicalDesignSystemText(provenance.sourceId) ||
    !isCanonicalDesignSystemText(provenance.sourceVersion)
  ) {
    return [
      {
        code: 'noncanonical-provenance',
        message:
          'Design System provenance requires a canonical source, sourceId and sourceVersion.',
        path,
        packId: descriptor.ref?.id,
        requestedVersion: descriptor.ref?.version,
      },
    ];
  }
  return [];
}

function validateTokenValues(
  value: unknown,
  path: string,
  ref: DesignSystemPackRef,
): DesignSystemDiagnostic[] {
  if (value === undefined) return [];
  if (!isPlainRecord(value)) {
    return [
      {
        code: 'invalid-token-value-source',
        message: 'Design System token values must be a declarative token-to-UiValueSource map.',
        path,
        packId: ref?.id,
        requestedVersion: ref?.version,
      },
    ];
  }

  const entries = ownDataEntries(value);
  if (entries === null) {
    return [
      {
        code: 'invalid-token-value-source',
        message: 'Design System token values must use own data properties only.',
        path,
        packId: ref?.id,
        requestedVersion: ref?.version,
      },
    ];
  }

  const diagnostics: DesignSystemDiagnostic[] = [];
  for (const [tokenId, source] of entries) {
    const tokenPath = `${path}[${JSON.stringify(String(tokenId))}]`;
    if (typeof tokenId !== 'string' || !isCanonicalDesignSystemText(tokenId)) {
      diagnostics.push({
        code: 'noncanonical-token-id',
        message: 'Design System token id must be non-blank and already trimmed.',
        path: tokenPath,
        packId: ref?.id,
        requestedVersion: ref?.version,
      });
      continue;
    }
    if (!isStructurallyValidUiValueSource(source)) {
      diagnostics.push({
        code: 'invalid-token-value-source',
        message: 'Design System token value must be a structurally valid UiValueSource.',
        path: tokenPath,
        packId: ref?.id,
        requestedVersion: ref?.version,
      });
    }
  }
  return diagnostics;
}

export function validateDesignSystemPackDescriptor(
  descriptor: DesignSystemPackDescriptor,
  path = 'pack',
): readonly DesignSystemDiagnostic[] {
  const snapshot = snapshotValidationInput(descriptor);
  if (!snapshot.ok || !isPlainRecord(snapshot.value)) {
    return freezeDiagnostics([
      {
        code: 'invalid-pack-descriptor',
        message: 'Design System Pack descriptor must be a plain data object.',
        path,
      },
    ]);
  }

  const normalizedDescriptor = snapshot.value as unknown as DesignSystemPackDescriptor;
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(normalizedDescriptor.ref, `${path}.ref`),
    ...validateProvenance(
      normalizedDescriptor.provenance,
      `${path}.provenance`,
      normalizedDescriptor,
    ),
    ...validateTokenValues(
      normalizedDescriptor.defaultTokenValues,
      `${path}.defaultTokenValues`,
      normalizedDescriptor.ref,
    ),
  ];

  const themes = Array.isArray(normalizedDescriptor.themes) ? normalizedDescriptor.themes : [];
  if (themes.length === 0) {
    diagnostics.push({
      code: 'empty-theme-catalog',
      message: 'Design System Pack must declare at least one Theme.',
      path: `${path}.themes`,
      packId: normalizedDescriptor.ref?.id,
      requestedVersion: normalizedDescriptor.ref?.version,
    });
  }

  const themeIds = new Set<string>();
  themes.forEach((theme, themeIndex) => {
    const themePath = `${path}.themes[${themeIndex}]`;
    if (!isCanonicalDesignSystemText(theme?.id)) {
      diagnostics.push({
        code: 'noncanonical-theme-id',
        message: 'Design System Theme id must be non-blank and already trimmed.',
        path: `${themePath}.id`,
        packId: normalizedDescriptor.ref?.id,
        requestedVersion: normalizedDescriptor.ref?.version,
        themeId: theme?.id,
      });
    } else if (themeIds.has(theme.id)) {
      diagnostics.push({
        code: 'duplicate-theme-id',
        message: `Design System Theme id "${theme.id}" must not be duplicated within a pack.`,
        path: `${themePath}.id`,
        packId: normalizedDescriptor.ref?.id,
        requestedVersion: normalizedDescriptor.ref?.version,
        themeId: theme.id,
      });
    } else {
      themeIds.add(theme.id);
    }
    diagnostics.push(
      ...validateTokenValues(
        theme?.tokenValues,
        `${themePath}.tokenValues`,
        normalizedDescriptor.ref,
      ),
    );
  });

  if (
    !isCanonicalDesignSystemText(normalizedDescriptor.defaultThemeId) ||
    !themeIds.has(normalizedDescriptor.defaultThemeId)
  ) {
    diagnostics.push({
      code: 'default-theme-not-found',
      message: 'Design System Pack defaultThemeId must name exactly one declared Theme.',
      path: `${path}.defaultThemeId`,
      packId: normalizedDescriptor.ref?.id,
      requestedVersion: normalizedDescriptor.ref?.version,
      themeId: normalizedDescriptor.defaultThemeId,
    });
  }

  if (!Array.isArray(normalizedDescriptor.components)) {
    diagnostics.push({
      code: 'invalid-component-descriptor',
      message: 'Design System Pack components must be an array of UiComponentDescriptor values.',
      path: `${path}.components`,
      packId: normalizedDescriptor.ref?.id,
      requestedVersion: normalizedDescriptor.ref?.version,
    });
  } else {
    const componentRefs = new Set<string>();
    normalizedDescriptor.components.forEach((component, componentIndex) => {
      if (!isPlainRecord(component)) {
        diagnostics.push({
          code: 'invalid-component-descriptor',
          message: 'UI component descriptor must be a plain data object.',
          path: `${path}.components[${componentIndex}]`,
          packId: normalizedDescriptor.ref?.id,
          requestedVersion: normalizedDescriptor.ref?.version,
        });
        return;
      }
      if (
        isCanonicalDesignSystemText(component.id) &&
        isCanonicalDesignSystemText(component.version)
      ) {
        const key = JSON.stringify([component.id, component.version]);
        if (componentRefs.has(key)) {
          diagnostics.push({
            code: 'invalid-component-descriptor',
            message: 'Design System Pack component exact ref must not be duplicated.',
            path: `${path}.components[${componentIndex}]`,
            packId: normalizedDescriptor.ref?.id,
            requestedVersion: normalizedDescriptor.ref?.version,
            componentId: component.id,
            componentVersion: component.version,
          });
        }
        componentRefs.add(key);
      }
      for (const issue of validateUiComponentDescriptor(
        component as unknown as UiComponentDescriptor,
      )) {
        diagnostics.push({
          code: 'invalid-component-descriptor',
          message: issue.message,
          path: `${path}.components[${componentIndex}].${issue.path}`,
          packId: normalizedDescriptor.ref?.id,
          requestedVersion: normalizedDescriptor.ref?.version,
        });
      }
    });
  }

  diagnostics.push(...validateDesignSystemDescriptorExtensions(normalizedDescriptor, path));

  return freezeDiagnostics(diagnostics);
}

export function validateDesignSystemPackContribution(
  contribution: DesignSystemPackContribution,
  path = 'contribution',
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  const snapshot = snapshotValidationInput(contribution);
  if (!snapshot.ok || !isPlainRecord(snapshot.value)) {
    return freezeDiagnostics([
      {
        code: 'invalid-contribution-shape',
        message: 'Design System contribution must be a plain data object with a packs array.',
        path,
      },
    ]);
  }

  const normalizedContribution = snapshot.value as unknown as DesignSystemPackContribution;
  if (!isCanonicalDesignSystemText(normalizedContribution.contributionId)) {
    diagnostics.push({
      code: 'blank-contribution-id',
      message: 'Design System contribution id must be non-blank and already trimmed.',
      path: `${path}.contributionId`,
      contributionId: normalizedContribution.contributionId,
    });
  }
  if (!Array.isArray(normalizedContribution.packs)) {
    diagnostics.push({
      code: 'invalid-contribution-shape',
      message: 'Design System contribution packs must be an array.',
      path: `${path}.packs`,
      contributionId: normalizedContribution.contributionId,
    });
    return freezeDiagnostics(diagnostics);
  }
  normalizedContribution.packs.forEach((pack, packIndex) => {
    diagnostics.push(
      ...validateDesignSystemPackDescriptor(pack, `${path}.packs[${packIndex}]`).map(
        (diagnostic) => ({
          ...diagnostic,
          contributionId: normalizedContribution.contributionId,
        }),
      ),
    );
  });
  return freezeDiagnostics(diagnostics);
}

export function validateDesignSystemThemeScopeSelection(
  selection: DesignSystemThemeScopeSelection,
  pack: DesignSystemPackRef,
  path: string,
  scopeId?: string,
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  const selectionSnapshot = snapshotValidationInput(selection);
  const packSnapshot = snapshotValidationInput(pack);
  const normalizedPack = packSnapshot.ok ? packSnapshot.value : (undefined as never);
  const packId = normalizedPack?.id;
  const requestedVersion = normalizedPack?.version;
  if (!selectionSnapshot.ok || !isPlainRecord(selectionSnapshot.value)) {
    diagnostics.push({
      code: 'invalid-scope-selection',
      message: 'ThemeScope selection must declare a Theme, token overrides, or both.',
      path,
      packId,
      requestedVersion,
      scopeId,
    });
    return freezeDiagnostics(diagnostics);
  }

  const selectionRecord = selectionSnapshot.value as unknown as Record<string, unknown>;
  const theme = selectionRecord.theme;
  const tokenOverrides = selectionRecord.tokenOverrides;
  if (theme === undefined && tokenOverrides === undefined) {
    diagnostics.push({
      code: 'invalid-scope-selection',
      message: 'ThemeScope selection must declare a Theme, token overrides, or both.',
      path,
      packId,
      requestedVersion,
      scopeId,
    });
    return freezeDiagnostics(diagnostics);
  }

  if (theme !== undefined) {
    const normalizedTheme = theme as DesignSystemThemeRef;
    diagnostics.push(
      ...validateDesignSystemThemeRef(normalizedTheme, `${path}.theme`).map((diagnostic) => ({
        ...diagnostic,
        scopeId,
      })),
    );
    if (
      validateDesignSystemPackRef(normalizedPack).length === 0 &&
      validateDesignSystemPackRef(normalizedTheme?.pack).length === 0 &&
      !isSameDesignSystemPackRef(normalizedTheme.pack, normalizedPack)
    ) {
      diagnostics.push({
        code: 'scope-theme-pack-mismatch',
        message: 'ThemeScope Theme must belong to the exact document Design System Pack.',
        path: `${path}.theme.pack`,
        packId,
        requestedVersion,
        themeId: normalizedTheme.themeId,
        scopeId,
      });
    }
  }

  diagnostics.push(
    ...validateTokenValues(tokenOverrides, `${path}.tokenOverrides`, normalizedPack).map(
      (diagnostic) => ({
        ...diagnostic,
        scopeId,
      }),
    ),
  );
  return freezeDiagnostics(diagnostics);
}

export function validateUiDesignSystemState(
  state: UiDesignSystemState,
  path = 'state',
): readonly DesignSystemDiagnostic[] {
  const snapshot = snapshotValidationInput(state);
  if (!snapshot.ok || !isPlainRecord(snapshot.value)) {
    return freezeDiagnostics([
      ...validateDesignSystemPackRef(undefined as unknown as DesignSystemPackRef, `${path}.pack`),
      ...validateDesignSystemThemeRef(
        undefined as unknown as DesignSystemThemeRef,
        `${path}.theme`,
      ),
    ]);
  }
  const normalizedState = snapshot.value as unknown as UiDesignSystemState;
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(normalizedState.pack, `${path}.pack`),
    ...validateDesignSystemThemeRef(normalizedState.theme, `${path}.theme`),
  ];
  if (
    validateDesignSystemPackRef(normalizedState.pack).length === 0 &&
    validateDesignSystemPackRef(normalizedState.theme?.pack).length === 0 &&
    !isSameDesignSystemPackRef(normalizedState.pack, normalizedState.theme.pack)
  ) {
    diagnostics.push({
      code: 'theme-pack-mismatch',
      message: 'Document Theme must belong to the exact document Design System Pack.',
      path: `${path}.theme.pack`,
      packId: normalizedState.pack.id,
      requestedVersion: normalizedState.pack.version,
      themeId: normalizedState.theme.themeId,
    });
  }

  if (normalizedState.scopes !== undefined) {
    if (!isPlainRecord(normalizedState.scopes)) {
      diagnostics.push({
        code: 'invalid-scope-selection',
        message: 'Design System scopes must be a scope-to-selection record.',
        path: `${path}.scopes`,
        packId: normalizedState.pack?.id,
        requestedVersion: normalizedState.pack?.version,
      });
    } else {
      const entries = ownDataEntries(normalizedState.scopes);
      if (entries === null) {
        diagnostics.push({
          code: 'invalid-scope-selection',
          message: 'Design System scopes must use own data properties only.',
          path: `${path}.scopes`,
          packId: normalizedState.pack?.id,
          requestedVersion: normalizedState.pack?.version,
        });
      } else {
        for (const [scopeId, selection] of entries) {
          const normalizedScopeId = typeof scopeId === 'string' ? scopeId : String(scopeId);
          const scopePath = `${path}.scopes[${JSON.stringify(normalizedScopeId)}]`;
          if (typeof scopeId !== 'string' || !isCanonicalDesignSystemText(scopeId)) {
            diagnostics.push({
              code: 'noncanonical-scope-id',
              message: 'ThemeScope id must be non-blank and already trimmed.',
              path: scopePath,
              packId: normalizedState.pack?.id,
              requestedVersion: normalizedState.pack?.version,
              scopeId: normalizedScopeId,
            });
            continue;
          }
          diagnostics.push(
            ...validateDesignSystemThemeScopeSelection(
              selection as DesignSystemThemeScopeSelection,
              normalizedState.pack,
              scopePath,
              scopeId,
            ),
          );
        }
      }
    }
  }
  return freezeDiagnostics(diagnostics);
}
