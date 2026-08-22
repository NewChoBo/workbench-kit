import { validateUiComponentDescriptor } from '../ui-authoring/component-validation';
import { isStructurallyValidUiValueSource } from '../ui-authoring/validation';
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
  const diagnostics: DesignSystemDiagnostic[] = [];
  if (!isCanonicalDesignSystemText(ref?.id)) {
    diagnostics.push({
      code: 'noncanonical-pack-id',
      message: 'Design System Pack id must be non-blank and already trimmed.',
      path: `${path}.id`,
      packId: ref?.id,
      requestedVersion: ref?.version,
    });
  }
  if (!isCanonicalDesignSystemText(ref?.version)) {
    diagnostics.push({
      code: 'noncanonical-pack-version',
      message: 'Design System Pack version must be non-blank and already trimmed.',
      path: `${path}.version`,
      packId: ref?.id,
      requestedVersion: ref?.version,
    });
  }
  return freezeDiagnostics(diagnostics);
}

export function validateDesignSystemThemeRef(
  ref: DesignSystemThemeRef,
  path = 'theme',
): readonly DesignSystemDiagnostic[] {
  const diagnostics = [...validateDesignSystemPackRef(ref?.pack, `${path}.pack`)];
  if (!isCanonicalDesignSystemText(ref?.themeId)) {
    diagnostics.push({
      code: 'noncanonical-theme-id',
      message: 'Design System Theme id must be non-blank and already trimmed.',
      path: `${path}.themeId`,
      packId: ref?.pack?.id,
      requestedVersion: ref?.pack?.version,
      themeId: ref?.themeId,
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
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(descriptor.ref, `${path}.ref`),
    ...validateProvenance(descriptor.provenance, `${path}.provenance`, descriptor),
    ...validateTokenValues(
      descriptor.defaultTokenValues,
      `${path}.defaultTokenValues`,
      descriptor.ref,
    ),
  ];

  const themes = Array.isArray(descriptor.themes) ? descriptor.themes : [];
  if (themes.length === 0) {
    diagnostics.push({
      code: 'empty-theme-catalog',
      message: 'Design System Pack must declare at least one Theme.',
      path: `${path}.themes`,
      packId: descriptor.ref?.id,
      requestedVersion: descriptor.ref?.version,
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
        packId: descriptor.ref?.id,
        requestedVersion: descriptor.ref?.version,
        themeId: theme?.id,
      });
    } else if (themeIds.has(theme.id)) {
      diagnostics.push({
        code: 'duplicate-theme-id',
        message: `Design System Theme id "${theme.id}" must not be duplicated within a pack.`,
        path: `${themePath}.id`,
        packId: descriptor.ref?.id,
        requestedVersion: descriptor.ref?.version,
        themeId: theme.id,
      });
    } else {
      themeIds.add(theme.id);
    }
    diagnostics.push(
      ...validateTokenValues(theme?.tokenValues, `${themePath}.tokenValues`, descriptor.ref),
    );
  });

  if (
    !isCanonicalDesignSystemText(descriptor.defaultThemeId) ||
    !themeIds.has(descriptor.defaultThemeId)
  ) {
    diagnostics.push({
      code: 'default-theme-not-found',
      message: 'Design System Pack defaultThemeId must name exactly one declared Theme.',
      path: `${path}.defaultThemeId`,
      packId: descriptor.ref?.id,
      requestedVersion: descriptor.ref?.version,
      themeId: descriptor.defaultThemeId,
    });
  }

  if (!Array.isArray(descriptor.components)) {
    diagnostics.push({
      code: 'invalid-component-descriptor',
      message: 'Design System Pack components must be an array of UiComponentDescriptor values.',
      path: `${path}.components`,
      packId: descriptor.ref?.id,
      requestedVersion: descriptor.ref?.version,
    });
  } else {
    descriptor.components.forEach((component, componentIndex) => {
      for (const issue of validateUiComponentDescriptor(component)) {
        diagnostics.push({
          code: 'invalid-component-descriptor',
          message: issue.message,
          path: `${path}.components[${componentIndex}].${issue.path}`,
          packId: descriptor.ref?.id,
          requestedVersion: descriptor.ref?.version,
        });
      }
    });
  }

  return freezeDiagnostics(diagnostics);
}

export function validateDesignSystemPackContribution(
  contribution: DesignSystemPackContribution,
  path = 'contribution',
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  if (!isCanonicalDesignSystemText(contribution.contributionId)) {
    diagnostics.push({
      code: 'blank-contribution-id',
      message: 'Design System contribution id must be non-blank and already trimmed.',
      path: `${path}.contributionId`,
      contributionId: contribution.contributionId,
    });
  }
  contribution.packs.forEach((pack, packIndex) => {
    diagnostics.push(
      ...validateDesignSystemPackDescriptor(pack, `${path}.packs[${packIndex}]`).map(
        (diagnostic) => ({ ...diagnostic, contributionId: contribution.contributionId }),
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
  if (!isPlainRecord(selection)) {
    diagnostics.push({
      code: 'invalid-scope-selection',
      message: 'ThemeScope selection must declare a Theme, token overrides, or both.',
      path,
      packId: pack.id,
      requestedVersion: pack.version,
      scopeId,
    });
    return freezeDiagnostics(diagnostics);
  }

  const normalizedSelection = selection as unknown as DesignSystemThemeScopeSelection;
  if (normalizedSelection.theme === undefined && normalizedSelection.tokenOverrides === undefined) {
    diagnostics.push({
      code: 'invalid-scope-selection',
      message: 'ThemeScope selection must declare a Theme, token overrides, or both.',
      path,
      packId: pack.id,
      requestedVersion: pack.version,
      scopeId,
    });
    return freezeDiagnostics(diagnostics);
  }

  if (normalizedSelection.theme !== undefined) {
    diagnostics.push(
      ...validateDesignSystemThemeRef(normalizedSelection.theme, `${path}.theme`).map(
        (diagnostic) => ({
          ...diagnostic,
          scopeId,
        }),
      ),
    );
    if (
      validateDesignSystemPackRef(normalizedSelection.theme.pack).length === 0 &&
      !isSameDesignSystemPackRef(normalizedSelection.theme.pack, pack)
    ) {
      diagnostics.push({
        code: 'scope-theme-pack-mismatch',
        message: 'ThemeScope Theme must belong to the exact document Design System Pack.',
        path: `${path}.theme.pack`,
        packId: pack.id,
        requestedVersion: pack.version,
        themeId: normalizedSelection.theme.themeId,
        scopeId,
      });
    }
  }

  diagnostics.push(
    ...validateTokenValues(normalizedSelection.tokenOverrides, `${path}.tokenOverrides`, pack).map(
      (diagnostic) => ({ ...diagnostic, scopeId }),
    ),
  );
  return freezeDiagnostics(diagnostics);
}

export function validateUiDesignSystemState(
  state: UiDesignSystemState,
  path = 'state',
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateDesignSystemPackRef(state.pack, `${path}.pack`),
    ...validateDesignSystemThemeRef(state.theme, `${path}.theme`),
  ];
  if (
    validateDesignSystemPackRef(state.pack).length === 0 &&
    validateDesignSystemPackRef(state.theme.pack).length === 0 &&
    !isSameDesignSystemPackRef(state.pack, state.theme.pack)
  ) {
    diagnostics.push({
      code: 'theme-pack-mismatch',
      message: 'Document Theme must belong to the exact document Design System Pack.',
      path: `${path}.theme.pack`,
      packId: state.pack.id,
      requestedVersion: state.pack.version,
      themeId: state.theme.themeId,
    });
  }

  if (state.scopes !== undefined) {
    if (!isPlainRecord(state.scopes)) {
      diagnostics.push({
        code: 'invalid-scope-selection',
        message: 'Design System scopes must be a scope-to-selection record.',
        path: `${path}.scopes`,
        packId: state.pack.id,
        requestedVersion: state.pack.version,
      });
    } else {
      const entries = ownDataEntries(state.scopes);
      if (entries === null) {
        diagnostics.push({
          code: 'invalid-scope-selection',
          message: 'Design System scopes must use own data properties only.',
          path: `${path}.scopes`,
          packId: state.pack.id,
          requestedVersion: state.pack.version,
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
              packId: state.pack.id,
              requestedVersion: state.pack.version,
              scopeId: normalizedScopeId,
            });
            continue;
          }
          diagnostics.push(
            ...validateDesignSystemThemeScopeSelection(
              selection as DesignSystemThemeScopeSelection,
              state.pack,
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
