import {
  designSystemComponentRoleRefKey,
  isCanonicalDesignSystemText,
  isSameDesignSystemComponentRoleRequirements,
  snapshotDesignSystemResolutionInput,
  uiComponentRefKey,
  validateDesignSystemPackDescriptor,
  type DesignSystemComponentRoleRef,
  type DesignSystemDiagnostic,
  type DesignSystemPackDescriptor,
  type UiComponentRef,
} from '@workbench-kit/contracts';

export interface ExplicitComponentReplacement {
  readonly source: UiComponentRef;
  readonly candidates: readonly UiComponentRef[];
}

export interface ComponentCompatibilityRequest {
  readonly sourcePack: DesignSystemPackDescriptor;
  readonly targetPack: DesignSystemPackDescriptor;
  readonly component: UiComponentRef;
  readonly replacements?: readonly ExplicitComponentReplacement[];
}

export type ComponentCompatibility =
  | {
      readonly kind: 'direct';
      readonly source: UiComponentRef;
      readonly target: UiComponentRef;
    }
  | {
      readonly kind: 'semantic-role';
      readonly source: UiComponentRef;
      readonly matches: readonly {
        readonly role: DesignSystemComponentRoleRef;
        readonly candidate: UiComponentRef;
      }[];
      readonly candidates: readonly UiComponentRef[];
    }
  | {
      readonly kind: 'replacement-required';
      readonly source: UiComponentRef;
      readonly candidates: readonly UiComponentRef[];
    }
  | {
      readonly kind: 'unsupported';
      readonly source: UiComponentRef;
      readonly reason: 'source-component-not-found' | 'no-compatible-component';
    };

export interface ComponentCompatibilityResolution {
  readonly compatibility: ComponentCompatibility;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalComponentRef(value: unknown): value is UiComponentRef {
  return (
    isPlainRecord(value) &&
    isCanonicalDesignSystemText(value.id) &&
    isCanonicalDesignSystemText(value.version)
  );
}

function freezeRef(ref: UiComponentRef): UiComponentRef {
  return Object.freeze({ id: ref.id, version: ref.version });
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })));
}

function result(
  compatibility: ComponentCompatibility,
  diagnostics: readonly DesignSystemDiagnostic[] = [],
): ComponentCompatibilityResolution {
  return Object.freeze({
    compatibility: Object.freeze(compatibility),
    diagnostics: freezeDiagnostics(diagnostics),
  });
}

function unsupported(
  source: UiComponentRef,
  reason: 'source-component-not-found' | 'no-compatible-component',
  diagnostics: readonly DesignSystemDiagnostic[] = [],
): ComponentCompatibilityResolution {
  return result({ kind: 'unsupported', source: freezeRef(source), reason }, diagnostics);
}

function invalidCompatibilityRequest(source?: UiComponentRef): ComponentCompatibilityResolution {
  return unsupported(source ?? { id: '', version: '' }, 'source-component-not-found', [
    {
      code: 'invalid-component-compatibility-request',
      message: 'Component compatibility requires declarative valid Pack and replacement data.',
      path: 'request',
    },
  ]);
}

function isValidCompatibilityRequest(
  value: Readonly<Record<string, unknown>>,
): value is Readonly<Record<string, unknown>> & ComponentCompatibilityRequest {
  if (
    !isPlainRecord(value.sourcePack) ||
    !isPlainRecord(value.targetPack) ||
    !isCanonicalComponentRef(value.component) ||
    validateDesignSystemPackDescriptor(value.sourcePack as unknown as DesignSystemPackDescriptor)
      .length > 0 ||
    validateDesignSystemPackDescriptor(value.targetPack as unknown as DesignSystemPackDescriptor)
      .length > 0
  ) {
    return false;
  }
  if (value.replacements === undefined) return true;
  if (!Array.isArray(value.replacements)) return false;
  return value.replacements.every(
    (replacement) =>
      isPlainRecord(replacement) &&
      isCanonicalComponentRef(replacement.source) &&
      Array.isArray(replacement.candidates) &&
      replacement.candidates.every((candidate) => isCanonicalComponentRef(candidate)),
  );
}

function hasExactComponent(pack: DesignSystemPackDescriptor, ref: UiComponentRef): boolean {
  return pack.components.some(
    (candidate) => candidate.id === ref.id && candidate.version === ref.version,
  );
}

function matchingReplacementIndexes(
  replacements: readonly ExplicitComponentReplacement[],
  source: UiComponentRef,
): readonly number[] {
  const key = uiComponentRefKey(source);
  return replacements.flatMap((replacement, index) =>
    uiComponentRefKey(replacement.source) === key ? [index] : [],
  );
}

export class ComponentResolver {
  classify(request: ComponentCompatibilityRequest): ComponentCompatibilityResolution {
    let snapshot: unknown;
    try {
      snapshot = snapshotDesignSystemResolutionInput(request);
    } catch {
      return invalidCompatibilityRequest();
    }
    if (!isPlainRecord(snapshot) || !isValidCompatibilityRequest(snapshot)) {
      const source =
        isPlainRecord(snapshot) && isCanonicalComponentRef(snapshot.component)
          ? snapshot.component
          : undefined;
      return invalidCompatibilityRequest(source);
    }
    try {
      return this.classifySnapshot(snapshot);
    } catch {
      return invalidCompatibilityRequest(snapshot.component);
    }
  }

  private classifySnapshot(
    request: ComponentCompatibilityRequest,
  ): ComponentCompatibilityResolution {
    const source = freezeRef(request.component);
    if (!hasExactComponent(request.sourcePack, request.component)) {
      return unsupported(source, 'source-component-not-found');
    }

    if (hasExactComponent(request.targetPack, request.component)) {
      return result({ kind: 'direct', source, target: freezeRef(request.component) });
    }

    const sourceRoles = (request.sourcePack.componentRoles ?? []).filter(
      (mapping) => uiComponentRefKey(mapping.component) === uiComponentRefKey(request.component),
    );
    const matches: {
      readonly role: DesignSystemComponentRoleRef;
      readonly candidate: UiComponentRef;
    }[] = [];
    for (const sourceRole of sourceRoles) {
      const roleKey = designSystemComponentRoleRefKey(sourceRole.role);
      for (const candidate of request.targetPack.components) {
        const targetRole = (request.targetPack.componentRoles ?? []).find(
          (mapping) =>
            uiComponentRefKey(mapping.component) === uiComponentRefKey(candidate) &&
            designSystemComponentRoleRefKey(mapping.role) === roleKey &&
            isSameDesignSystemComponentRoleRequirements(
              mapping.requirements,
              sourceRole.requirements,
            ),
        );
        if (targetRole !== undefined) {
          matches.push({
            role: Object.freeze({ ...sourceRole.role }),
            candidate: freezeRef(candidate),
          });
        }
      }
    }
    if (matches.length > 0) {
      const seen = new Set<string>();
      const candidates = matches.flatMap((match) => {
        const key = uiComponentRefKey(match.candidate);
        if (seen.has(key)) return [];
        seen.add(key);
        return [match.candidate];
      });
      return result({
        kind: 'semantic-role',
        source,
        matches: Object.freeze(matches.map((match) => Object.freeze(match))),
        candidates: Object.freeze(candidates),
      });
    }

    const replacements = request.replacements ?? [];
    const replacementIndexes = matchingReplacementIndexes(replacements, request.component);
    if (replacementIndexes.length > 1) {
      return unsupported(
        source,
        'no-compatible-component',
        replacementIndexes.map((index) => ({
          code: 'replacement-source-conflicted',
          message: 'Explicit component replacement source must have exactly one entry.',
          path: `replacements[${index}].source`,
          componentId: request.component.id,
          componentVersion: request.component.version,
        })),
      );
    }
    if (replacementIndexes.length === 0) {
      return unsupported(source, 'no-compatible-component');
    }

    const replacementIndex = replacementIndexes[0];
    const replacement = replacements[replacementIndex];
    const diagnostics: DesignSystemDiagnostic[] = [];
    const seen = new Set<string>();
    const candidates: UiComponentRef[] = [];
    replacement.candidates.forEach((candidate, candidateIndex) => {
      const key = uiComponentRefKey(candidate);
      if (seen.has(key)) {
        diagnostics.push({
          code: 'duplicate-replacement-candidate',
          message: 'Explicit component replacement candidate must not be duplicated.',
          path: `replacements[${replacementIndex}].candidates[${candidateIndex}]`,
          componentId: candidate.id,
          componentVersion: candidate.version,
        });
        return;
      }
      seen.add(key);
      if (!hasExactComponent(request.targetPack, candidate)) {
        diagnostics.push({
          code: 'replacement-candidate-not-found',
          message: 'Explicit component replacement candidate is not declared in the target Pack.',
          path: `replacements[${replacementIndex}].candidates[${candidateIndex}]`,
          componentId: candidate.id,
          componentVersion: candidate.version,
        });
        return;
      }
      candidates.push(freezeRef(candidate));
    });
    if (candidates.length === 0) {
      return unsupported(source, 'no-compatible-component', diagnostics);
    }
    return result(
      {
        kind: 'replacement-required',
        source,
        candidates: Object.freeze(candidates),
      },
      diagnostics,
    );
  }
}
