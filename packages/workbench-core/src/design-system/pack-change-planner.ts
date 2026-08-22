import {
  isSameDesignSystemPackRef,
  snapshotDesignSystemResolutionInput,
  uiComponentRefKey,
  validateUiDesignSystemState,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  validateUiPropertyValue,
  type DesignSystemAuthoredDocumentSnapshot,
  type DesignSystemContributionProvenance,
  type DesignSystemDependencySubstitution,
  type DesignSystemDiagnostic,
  type DesignSystemPackChangeMutation,
  type DesignSystemPackDescriptor,
  type DesignSystemPackRef,
  type DesignSystemResourceDescriptor,
  type DesignSystemTokenDescriptor,
  type UiComponentDescriptor,
  type UiComponentRef,
  type UiDesignSystemState,
  type UiLayoutPropertyDescriptor,
  type UiLayoutStrategyDescriptor,
  type UiValueSource,
} from '@workbench-kit/contracts';

import {
  ComponentResolver,
  type ComponentCompatibility,
  type ExplicitComponentReplacement,
} from './component-resolver.js';
import type { DesignSystemPackRegistrySnapshot } from './registry.js';
import { DesignSystemResolver } from './resolver.js';
import { DesignTokenResolver } from './token-resolver.js';

export interface DesignSystemDependencyReplacement {
  readonly sourceId: string;
  readonly candidates: readonly string[];
}

export interface DesignSystemPackChangeRequest {
  readonly requestId: string;
  readonly document: DesignSystemAuthoredDocumentSnapshot;
  readonly targetPack: DesignSystemPackRef;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly componentReplacements?: readonly ExplicitComponentReplacement[];
  readonly tokenReplacements?: readonly DesignSystemDependencyReplacement[];
  readonly resourceReplacements?: readonly DesignSystemDependencyReplacement[];
}

export interface DesignSystemThemeChoice {
  readonly scopeId?: string;
  readonly themeId: string;
}

export interface DesignSystemComponentChoice {
  readonly nodeId: string;
  readonly target: UiComponentRef;
}

export interface DesignSystemDependencyChoice {
  readonly sourceId: string;
  readonly targetId: string;
}

export interface DesignSystemPackChangeChoices {
  readonly themes: readonly DesignSystemThemeChoice[];
  readonly components?: readonly DesignSystemComponentChoice[];
  readonly tokens?: readonly DesignSystemDependencyChoice[];
  readonly resources?: readonly DesignSystemDependencyChoice[];
}

export interface DesignSystemNodeCompatibility {
  readonly nodeId: string;
  readonly compatibility: ComponentCompatibility;
}

export interface DesignSystemDependencyOccurrence {
  readonly path: string;
  readonly nodeId?: string;
  readonly scopeId?: string;
  readonly propertyId?: string;
}

export type DesignSystemDependencyCompatibility = (
  | {
      readonly kind: 'direct';
      readonly sourceId: string;
      readonly targetId: string;
    }
  | {
      readonly kind: 'replacement-required';
      readonly sourceId: string;
      readonly candidates: readonly string[];
    }
  | {
      readonly kind: 'unsupported';
      readonly sourceId: string;
      readonly reason: 'source-not-found' | 'no-compatible-dependency';
    }
) & {
  readonly occurrences: readonly DesignSystemDependencyOccurrence[];
};

export interface DesignSystemThemeChoiceRequirement {
  readonly scopeId?: string;
  readonly candidates: readonly string[];
}

export interface DesignSystemPackChangePlan {
  readonly request: DesignSystemPackChangeRequest;
  readonly requestId: string;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly registryRevision: number;
  readonly sourceDocument: DesignSystemAuthoredDocumentSnapshot;
  readonly sourcePack: DesignSystemPackRef;
  readonly targetPack: DesignSystemPackRef;
  readonly sourceProvenance: DesignSystemContributionProvenance;
  readonly targetProvenance: DesignSystemContributionProvenance;
  readonly components: readonly DesignSystemNodeCompatibility[];
  readonly tokens: readonly DesignSystemDependencyCompatibility[];
  readonly resources: readonly DesignSystemDependencyCompatibility[];
  readonly themeSelections: readonly DesignSystemThemeChoiceRequirement[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly blocked: boolean;
}

export interface DesignSystemPackChangePlanResult {
  readonly plan?: DesignSystemPackChangePlan;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

export interface DesignSystemPackChangeFinalizeResult {
  readonly mutation?: DesignSystemPackChangeMutation;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isCanonicalRef(value: unknown): value is UiComponentRef {
  return isPlainRecord(value) && isCanonicalText(value.id) && isCanonicalText(value.version);
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(
    diagnostics.map((entry) =>
      Object.freeze({
        ...entry,
        ...(entry.tokenPath ? { tokenPath: Object.freeze([...entry.tokenPath]) } : {}),
      }),
    ),
  );
}

function diagnostic(
  code: DesignSystemDiagnostic['code'],
  message: string,
  path: string,
  context: Partial<DesignSystemDiagnostic> = {},
): DesignSystemDiagnostic {
  return Object.freeze({ code, message, path, ...context });
}

function failedPlan(
  ...diagnostics: readonly DesignSystemDiagnostic[]
): DesignSystemPackChangePlanResult {
  return Object.freeze({ diagnostics: freezeDiagnostics(diagnostics) });
}

function failedFinalize(
  ...diagnostics: readonly DesignSystemDiagnostic[]
): DesignSystemPackChangeFinalizeResult {
  return Object.freeze({ diagnostics: freezeDiagnostics(diagnostics) });
}

function snapshotRevision(snapshot: unknown): number | null {
  if (!isPlainRecord(snapshot)) return null;
  const revision = Object.getOwnPropertyDescriptor(snapshot, 'revision');
  const lookup = Object.getOwnPropertyDescriptor(snapshot, 'lookup');
  if (
    !revision ||
    !('value' in revision) ||
    !Number.isInteger(revision.value) ||
    revision.value < 0 ||
    !lookup ||
    !('value' in lookup) ||
    typeof lookup.value !== 'function'
  ) {
    return null;
  }
  return revision.value as number;
}

function lookupPack(
  snapshot: DesignSystemPackRegistrySnapshot,
  ref: DesignSystemPackRef,
): DesignSystemPackDescriptor | null {
  try {
    const result = snapshot.lookup(ref);
    return result.status === 'resolved' ? result.descriptor : null;
  } catch {
    return null;
  }
}

function isSource(value: unknown): value is UiValueSource {
  if (!isPlainRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'literal') return Object.prototype.hasOwnProperty.call(value, 'value');
  const fields = {
    token: 'tokenId',
    resource: 'resourceId',
    binding: 'bindingId',
    expression: 'expressionId',
  } as const;
  const field = fields[value.kind as keyof typeof fields];
  return field !== undefined && isCanonicalText(value[field]);
}

function authoredDocumentDiagnostics(
  value: unknown,
  requestId?: string,
): readonly DesignSystemDiagnostic[] {
  const context = requestId === undefined ? {} : { requestId };
  if (
    !isPlainRecord(value) ||
    !isCanonicalText(value.documentId) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    return Object.freeze([
      diagnostic(
        'invalid-pack-change-request',
        'The authored document identity and revision must be canonical.',
        'request.document',
        context,
      ),
    ]);
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'state')) {
    return Object.freeze([
      diagnostic(
        'source-design-system-state-required',
        'Pack-change planning requires explicit source design-system state.',
        'request.document.state',
        context,
      ),
    ]);
  }
  if (!isPlainRecord(value.state)) {
    return Object.freeze([
      diagnostic(
        'invalid-pack-change-request',
        'The authored document design-system state must be plain declarative data.',
        'request.document.state',
        context,
      ),
    ]);
  }
  const diagnostics: DesignSystemDiagnostic[] = validateUiDesignSystemState(
    value.state as unknown as UiDesignSystemState,
    'request.document.state',
  ).map((entry) => diagnostic('invalid-pack-change-request', entry.message, entry.path, context));
  if (!Array.isArray(value.nodes)) {
    diagnostics.push(
      diagnostic(
        'invalid-pack-change-request',
        'The authored document nodes must be an ordered array.',
        'request.document.nodes',
        context,
      ),
    );
    return freezeDiagnostics(diagnostics);
  }

  const nodeIds = new Set<string>();
  const scopes = isPlainRecord(value.state.scopes) ? value.state.scopes : {};
  value.nodes.forEach((node, index) => {
    const path = `request.document.nodes[${index}]`;
    if (!isPlainRecord(node) || !isCanonicalText(node.nodeId)) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Every authored node requires a canonical node id.',
          `${path}.nodeId`,
          context,
        ),
      );
      return;
    }
    const nodeContext = { ...context, nodeId: node.nodeId };
    if (nodeIds.has(node.nodeId)) {
      diagnostics.push(
        diagnostic(
          'duplicate-authored-node',
          `Authored node id "${node.nodeId}" must be globally unique.`,
          `${path}.nodeId`,
          nodeContext,
        ),
      );
    } else {
      nodeIds.add(node.nodeId);
    }
    if (
      !Array.isArray(node.scopeChain) ||
      !node.scopeChain.every(isCanonicalText) ||
      new Set(node.scopeChain).size !== node.scopeChain.length ||
      node.scopeChain.some((scopeId) => !Object.prototype.hasOwnProperty.call(scopes, scopeId))
    ) {
      diagnostics.push(
        diagnostic(
          'invalid-authored-scope-chain',
          'Authored scope chains must contain unique declared scope ids in root-to-leaf order.',
          `${path}.scopeChain`,
          nodeContext,
        ),
      );
    }
    if (
      !isCanonicalRef(node.component) ||
      !isPlainRecord(node.properties) ||
      !Object.values(node.properties).every(isSource)
    ) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Authored component and property values must be canonical declarative data.',
          path,
          nodeContext,
        ),
      );
    }
    if (
      node.layout !== undefined &&
      (!isPlainRecord(node.layout) ||
        !isCanonicalText(node.layout.strategyId) ||
        !isPlainRecord(node.layout.values) ||
        !Object.values(node.layout.values).every(isSource))
    ) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Authored layout state must use a canonical strategy and declarative values.',
          `${path}.layout`,
          nodeContext,
        ),
      );
    }
  });
  return freezeDiagnostics(diagnostics);
}

function isAuthoredDocument(value: unknown): value is DesignSystemAuthoredDocumentSnapshot {
  return authoredDocumentDiagnostics(value).length === 0;
}

function isReplacementList(
  value: unknown,
  component: boolean,
): value is readonly (ExplicitComponentReplacement | DesignSystemDependencyReplacement)[] {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (!isPlainRecord(entry) || !Array.isArray(entry.candidates)) return false;
    return component
      ? isCanonicalRef(entry.source) && entry.candidates.every(isCanonicalRef)
      : isCanonicalText(entry.sourceId) && entry.candidates.every(isCanonicalText);
  });
}

function isRequestEnvelope(value: unknown): value is DesignSystemPackChangeRequest {
  return (
    isPlainRecord(value) &&
    isCanonicalText(value.requestId) &&
    isPlainRecord(value.document) &&
    isCanonicalRef(value.targetPack) &&
    Array.isArray(value.layoutStrategies) &&
    value.layoutStrategies.every(isPlainRecord) &&
    Array.isArray(value.layoutProperties) &&
    value.layoutProperties.every(isPlainRecord) &&
    isReplacementList(value.componentReplacements, true) &&
    isReplacementList(value.tokenReplacements, false) &&
    isReplacementList(value.resourceReplacements, false)
  );
}

function isRequest(value: unknown): value is DesignSystemPackChangeRequest {
  return isRequestEnvelope(value) && isAuthoredDocument(value.document);
}

function catalogDiagnostics(
  request: DesignSystemPackChangeRequest,
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  const strategyIds = new Set<string>();
  const propertyIds = new Set<string>();
  request.layoutProperties.forEach((property, index) => {
    if (!isPlainRecord(property) || !isCanonicalText(property.id) || propertyIds.has(property.id)) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Layout properties must have unique canonical ids.',
          `request.layoutProperties[${index}]`,
          { requestId: request.requestId },
        ),
      );
    } else {
      propertyIds.add(property.id);
    }
  });
  request.layoutStrategies.forEach((strategy, index) => {
    if (!isPlainRecord(strategy) || !isCanonicalText(strategy.id) || strategyIds.has(strategy.id)) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Layout strategies must have unique canonical ids.',
          `request.layoutStrategies[${index}]`,
          { requestId: request.requestId },
        ),
      );
      return;
    }
    strategyIds.add(strategy.id);
    try {
      for (const issue of validateUiLayoutStrategyDescriptor(strategy, request.layoutProperties)) {
        diagnostics.push(
          diagnostic(
            'invalid-pack-change-request',
            issue.message,
            `request.layoutStrategies[${index}].${issue.path}`,
            { requestId: request.requestId },
          ),
        );
      }
    } catch {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          'Layout strategy and property descriptors must be canonical declarative data.',
          `request.layoutStrategies[${index}]`,
          { requestId: request.requestId },
        ),
      );
    }
  });
  for (const node of request.document.nodes) {
    if (!node.layout) continue;
    const strategy = request.layoutStrategies.find(
      (entry) => isPlainRecord(entry) && entry.id === node.layout!.strategyId,
    );
    if (
      strategy === undefined ||
      !Array.isArray(strategy.supportedContainerProperties) ||
      !Array.isArray(strategy.supportedChildProperties)
    ) {
      diagnostics.push(
        diagnostic(
          'invalid-pack-change-request',
          `Authored layout strategy "${node.layout.strategyId}" is missing from the request catalog.`,
          `request.document.nodes.${node.nodeId}.layout.strategyId`,
          { nodeId: node.nodeId, requestId: request.requestId },
        ),
      );
      continue;
    }
    for (const propertyId of Object.keys(node.layout.values)) {
      const property = request.layoutProperties.find(
        (entry) => isPlainRecord(entry) && entry.id === propertyId,
      );
      if (
        property === undefined ||
        (!strategy.supportedContainerProperties.includes(propertyId) &&
          !strategy.supportedChildProperties.includes(propertyId))
      ) {
        diagnostics.push(
          diagnostic(
            'invalid-pack-change-request',
            `Authored layout property "${propertyId}" is missing or unsupported by its strategy.`,
            `request.document.nodes.${node.nodeId}.layout.values.${propertyId}`,
            { nodeId: node.nodeId, propertyId, requestId: request.requestId },
          ),
        );
      }
    }
  }
  return diagnostics;
}

interface DependencyOccurrenceGroups {
  readonly tokens: readonly {
    readonly sourceId: string;
    readonly occurrences: readonly DesignSystemDependencyOccurrence[];
  }[];
  readonly resources: readonly {
    readonly sourceId: string;
    readonly occurrences: readonly DesignSystemDependencyOccurrence[];
  }[];
}

function collectDependencies(
  document: DesignSystemAuthoredDocumentSnapshot,
): DependencyOccurrenceGroups {
  const tokens = new Map<string, DesignSystemDependencyOccurrence[]>();
  const resources = new Map<string, DesignSystemDependencyOccurrence[]>();
  const add = (
    groups: Map<string, DesignSystemDependencyOccurrence[]>,
    sourceId: string,
    occurrence: DesignSystemDependencyOccurrence,
  ) => {
    const current = groups.get(sourceId) ?? [];
    current.push(Object.freeze(occurrence));
    groups.set(sourceId, current);
  };
  const visit = (source: UiValueSource, occurrence: DesignSystemDependencyOccurrence) => {
    if (source.kind === 'token') add(tokens, source.tokenId, occurrence);
    if (source.kind === 'resource') add(resources, source.resourceId, occurrence);
  };
  for (const node of document.nodes) {
    for (const [propertyId, source] of Object.entries(node.properties)) {
      visit(source, {
        path: `nodes.${node.nodeId}.properties.${propertyId}`,
        nodeId: node.nodeId,
        propertyId,
      });
    }
    if (node.layout) {
      for (const [propertyId, source] of Object.entries(node.layout.values)) {
        visit(source, {
          path: `nodes.${node.nodeId}.layout.values.${propertyId}`,
          nodeId: node.nodeId,
          propertyId,
        });
      }
    }
  }
  for (const [scopeId, scope] of Object.entries(document.state.scopes ?? {})) {
    for (const [tokenId, source] of Object.entries(scope.tokenOverrides ?? {})) {
      add(tokens, tokenId, {
        path: `state.scopes.${scopeId}.tokenOverrides.${tokenId}.key`,
        scopeId,
      });
      visit(source, {
        path: `state.scopes.${scopeId}.tokenOverrides.${tokenId}.value`,
        scopeId,
      });
    }
  }
  const freezeGroups = (groups: ReadonlyMap<string, readonly DesignSystemDependencyOccurrence[]>) =>
    Object.freeze(
      [...groups].map(([sourceId, occurrences]) =>
        Object.freeze({ sourceId, occurrences: Object.freeze([...occurrences]) }),
      ),
    );
  return { tokens: freezeGroups(tokens), resources: freezeGroups(resources) };
}

function descriptorById<T extends { readonly id: string }>(
  descriptors: readonly T[] | undefined,
  id: string,
): T | undefined {
  return descriptors?.find((entry) => entry.id === id);
}

function isCompatibleToken(
  source: DesignSystemTokenDescriptor,
  target: DesignSystemTokenDescriptor,
): boolean {
  return source.value.type === target.value.type;
}

function isCompatibleResource(
  source: DesignSystemResourceDescriptor,
  target: DesignSystemResourceDescriptor,
): boolean {
  return source.value.type === target.value.type && source.mediaType === target.mediaType;
}

function classifyDependency<T extends { readonly id: string }>(
  kind: 'token' | 'resource',
  sourceId: string,
  sourceDescriptors: readonly T[] | undefined,
  targetDescriptors: readonly T[] | undefined,
  replacements: readonly DesignSystemDependencyReplacement[] | undefined,
  compatible: (source: T, target: T) => boolean,
  requestId: string,
  occurrences: readonly DesignSystemDependencyOccurrence[],
): {
  readonly compatibility: DesignSystemDependencyCompatibility;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
} {
  const source = descriptorById(sourceDescriptors, sourceId);
  if (source === undefined) {
    return {
      compatibility: Object.freeze({
        kind: 'unsupported',
        sourceId,
        reason: 'source-not-found',
        occurrences,
      }),
      diagnostics: Object.freeze([
        diagnostic(
          'pack-change-dependency-unsupported',
          `Source ${kind} "${sourceId}" is not declared by the source Pack.`,
          `${kind}s.${sourceId}`,
          { requestId },
        ),
      ]),
    };
  }
  const direct = descriptorById(targetDescriptors, sourceId);
  if (direct !== undefined && compatible(source, direct)) {
    return {
      compatibility: Object.freeze({ kind: 'direct', sourceId, targetId: sourceId, occurrences }),
      diagnostics: Object.freeze([]),
    };
  }
  const matching = (replacements ?? []).flatMap((entry, index) =>
    entry.sourceId === sourceId ? [{ entry, index }] : [],
  );
  if (matching.length > 1) {
    return {
      compatibility: Object.freeze({
        kind: 'unsupported',
        sourceId,
        reason: 'no-compatible-dependency',
        occurrences,
      }),
      diagnostics: freezeDiagnostics(
        matching.map(({ index }) =>
          diagnostic(
            'pack-change-replacement-source-conflicted',
            `Explicit ${kind} replacement source must have one entry.`,
            `${kind}Replacements[${index}]`,
            { requestId },
          ),
        ),
      ),
    };
  }
  if (matching.length === 0) {
    return {
      compatibility: Object.freeze({
        kind: 'unsupported',
        sourceId,
        reason: 'no-compatible-dependency',
        occurrences,
      }),
      diagnostics: Object.freeze([
        diagnostic(
          'pack-change-dependency-unsupported',
          `No compatible target ${kind} was supplied for "${sourceId}".`,
          `${kind}s.${sourceId}`,
          { requestId },
        ),
      ]),
    };
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const candidates: string[] = [];
  const seen = new Set<string>();
  const replacement = matching[0]!;
  replacement.entry.candidates.forEach((candidateId, index) => {
    if (seen.has(candidateId)) {
      diagnostics.push(
        diagnostic(
          'pack-change-replacement-candidate-invalid',
          `Duplicate ${kind} replacement candidate "${candidateId}" was ignored.`,
          `${kind}Replacements[${replacement.index}].candidates[${index}]`,
          { requestId },
        ),
      );
      return;
    }
    seen.add(candidateId);
    const candidate = descriptorById(targetDescriptors, candidateId);
    if (candidate === undefined || !compatible(source, candidate)) {
      diagnostics.push(
        diagnostic(
          'pack-change-replacement-candidate-invalid',
          `Target ${kind} candidate "${candidateId}" is missing or incompatible.`,
          `${kind}Replacements[${replacement.index}].candidates[${index}]`,
          { requestId },
        ),
      );
      return;
    }
    candidates.push(candidateId);
  });
  if (candidates.length === 0) {
    return {
      compatibility: Object.freeze({
        kind: 'unsupported',
        sourceId,
        reason: 'no-compatible-dependency',
        occurrences,
      }),
      diagnostics: freezeDiagnostics(
        diagnostics.length > 0
          ? diagnostics
          : [
              diagnostic(
                'pack-change-dependency-unsupported',
                `No compatible target ${kind} candidate was supplied for "${sourceId}".`,
                `${kind}Replacements[${replacement.index}].candidates`,
                { requestId },
              ),
            ],
      ),
    };
  }
  return {
    compatibility: Object.freeze({
      kind: 'replacement-required',
      sourceId,
      candidates: Object.freeze(candidates),
      occurrences,
    }),
    diagnostics: freezeDiagnostics(diagnostics),
  };
}

function declarativeEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => declarativeEqual(entry, right[index]))
    );
  }
  if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && declarativeEqual(left[key], right[rightKeys[index]!]),
    )
  );
}

function rewriteSource(
  source: UiValueSource,
  tokens: ReadonlyMap<string, string>,
  resources: ReadonlyMap<string, string>,
): UiValueSource {
  if (source.kind === 'token') {
    return Object.freeze({ kind: 'token', tokenId: tokens.get(source.tokenId) ?? source.tokenId });
  }
  if (source.kind === 'resource') {
    return Object.freeze({
      kind: 'resource',
      resourceId: resources.get(source.resourceId) ?? source.resourceId,
    });
  }
  return source;
}

function choiceMap<T>(
  choices: readonly T[] | undefined,
  getKey: (choice: T) => unknown,
): ReadonlyMap<string, T> | null {
  const result = new Map<string, T>();
  for (const choice of choices ?? []) {
    const value = getKey(choice);
    if (!isCanonicalText(value) || result.has(value)) return null;
    result.set(value, choice);
  }
  return result;
}

function isFinalizeFailure(
  value: readonly DesignSystemDependencySubstitution[] | DesignSystemPackChangeFinalizeResult,
): value is DesignSystemPackChangeFinalizeResult {
  return !Array.isArray(value);
}

function themeChoiceKey(choice: DesignSystemThemeChoice): string {
  return choice.scopeId === undefined ? '$document' : `scope:${choice.scopeId}`;
}

function themeChoices(
  choices: readonly DesignSystemThemeChoice[],
): ReadonlyMap<string, string> | null {
  const result = new Map<string, string>();
  for (const choice of choices) {
    if (!isCanonicalText(choice.themeId)) return null;
    if (choice.scopeId !== undefined && !isCanonicalText(choice.scopeId)) return null;
    const key = themeChoiceKey(choice);
    if (result.has(key)) return null;
    result.set(key, choice.themeId);
  }
  return result;
}

function findComponent(
  pack: DesignSystemPackDescriptor,
  ref: UiComponentRef,
): UiComponentDescriptor | undefined {
  return pack.components.find((entry) => uiComponentRefKey(entry) === uiComponentRefKey(ref));
}

function isPlan(value: unknown): value is DesignSystemPackChangePlan {
  return (
    isPlainRecord(value) &&
    isRequest(value.request) &&
    isCanonicalText(value.requestId) &&
    isCanonicalText(value.documentId) &&
    Number.isInteger(value.documentRevision) &&
    Number.isInteger(value.registryRevision) &&
    isAuthoredDocument(value.sourceDocument) &&
    isCanonicalRef(value.sourcePack) &&
    isCanonicalRef(value.targetPack) &&
    isPlainRecord(value.sourceProvenance) &&
    isPlainRecord(value.targetProvenance) &&
    Array.isArray(value.components) &&
    Array.isArray(value.tokens) &&
    Array.isArray(value.resources) &&
    Array.isArray(value.themeSelections) &&
    Array.isArray(value.diagnostics) &&
    typeof value.blocked === 'boolean'
  );
}

function isChoices(value: unknown): value is DesignSystemPackChangeChoices {
  return (
    isPlainRecord(value) &&
    Array.isArray(value.themes) &&
    value.themes.every(
      (entry) =>
        isPlainRecord(entry) &&
        (entry.scopeId === undefined || isCanonicalText(entry.scopeId)) &&
        isCanonicalText(entry.themeId),
    ) &&
    (value.components === undefined ||
      (Array.isArray(value.components) &&
        value.components.every(
          (entry) =>
            isPlainRecord(entry) && isCanonicalText(entry.nodeId) && isCanonicalRef(entry.target),
        ))) &&
    (value.tokens === undefined ||
      (Array.isArray(value.tokens) &&
        value.tokens.every(
          (entry) =>
            isPlainRecord(entry) &&
            isCanonicalText(entry.sourceId) &&
            isCanonicalText(entry.targetId),
        ))) &&
    (value.resources === undefined ||
      (Array.isArray(value.resources) &&
        value.resources.every(
          (entry) =>
            isPlainRecord(entry) &&
            isCanonicalText(entry.sourceId) &&
            isCanonicalText(entry.targetId),
        )))
  );
}

function packChangeComponentDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
  nodeId: string,
  requestId: string,
): readonly DesignSystemDiagnostic[] {
  return diagnostics.map((entry) => {
    const code =
      entry.code === 'replacement-source-conflicted'
        ? 'pack-change-replacement-source-conflicted'
        : entry.code === 'duplicate-replacement-candidate' ||
            entry.code === 'replacement-candidate-not-found'
          ? 'pack-change-replacement-candidate-invalid'
          : 'invalid-pack-change-request';
    return diagnostic(code, entry.message, `request.componentReplacements.${entry.path}`, {
      nodeId,
      requestId,
      ...(entry.componentId ? { componentId: entry.componentId } : {}),
      ...(entry.componentVersion ? { componentVersion: entry.componentVersion } : {}),
    });
  });
}

export class DesignSystemPackChangePlanner {
  plan(
    snapshot: DesignSystemPackRegistrySnapshot,
    request: DesignSystemPackChangeRequest,
  ): DesignSystemPackChangePlanResult {
    const revision = snapshotRevision(snapshot);
    let safeRequest: DesignSystemPackChangeRequest;
    try {
      safeRequest = snapshotDesignSystemResolutionInput(request);
    } catch {
      return failedPlan(
        diagnostic(
          'invalid-pack-change-request',
          'Pack-change request must be plain declarative data.',
          'request',
        ),
      );
    }
    if (revision === null || !isRequestEnvelope(safeRequest)) {
      return failedPlan(
        diagnostic(
          'invalid-pack-change-request',
          'Pack-change request and registry snapshot must be canonical.',
          'request',
        ),
      );
    }
    const documentDiagnostics = authoredDocumentDiagnostics(
      safeRequest.document,
      safeRequest.requestId,
    );
    if (documentDiagnostics.length > 0) return failedPlan(...documentDiagnostics);

    const diagnostics = [...catalogDiagnostics(safeRequest)];
    const sourcePack = lookupPack(snapshot, safeRequest.document.state.pack);
    const targetPack = lookupPack(snapshot, safeRequest.targetPack);
    if (sourcePack === null || targetPack === null) {
      return failedPlan(
        diagnostic(
          'pack-change-dependency-unsupported',
          'The exact source and target Packs must both resolve from one registry snapshot.',
          'request.targetPack',
          { requestId: safeRequest.requestId },
        ),
      );
    }
    if (!isSameDesignSystemPackRef(sourcePack.ref, safeRequest.document.state.pack)) {
      return failedPlan(
        diagnostic(
          'source-pack-mismatch',
          'The authored state source Pack does not match the resolved source Pack.',
          'request.document.state.pack',
          { requestId: safeRequest.requestId },
        ),
      );
    }
    if (!isSameDesignSystemPackRef(targetPack.ref, safeRequest.targetPack)) {
      return failedPlan(
        diagnostic(
          'invalid-pack-change-request',
          'The requested target Pack does not match the resolved exact target Pack.',
          'request.targetPack',
          { requestId: safeRequest.requestId },
        ),
      );
    }

    const componentResolver = new ComponentResolver();
    const components = safeRequest.document.nodes.map((node) => {
      const resolution = componentResolver.classify({
        sourcePack,
        targetPack,
        component: node.component,
        replacements: safeRequest.componentReplacements,
      });
      const componentDiagnostics = packChangeComponentDiagnostics(
        resolution.diagnostics,
        node.nodeId,
        safeRequest.requestId,
      );
      diagnostics.push(...componentDiagnostics);
      if (resolution.compatibility.kind === 'unsupported' && componentDiagnostics.length === 0) {
        diagnostics.push(
          diagnostic(
            'pack-change-dependency-unsupported',
            'The authored component has no compatible target component.',
            `request.document.nodes.${node.nodeId}.component`,
            { nodeId: node.nodeId, requestId: safeRequest.requestId },
          ),
        );
      }
      return Object.freeze({ nodeId: node.nodeId, compatibility: resolution.compatibility });
    });
    const dependencies = collectDependencies(safeRequest.document);
    const tokens = dependencies.tokens.map(({ sourceId, occurrences }) => {
      const result = classifyDependency(
        'token',
        sourceId,
        sourcePack.tokens,
        targetPack.tokens,
        safeRequest.tokenReplacements,
        isCompatibleToken,
        safeRequest.requestId,
        occurrences,
      );
      diagnostics.push(...result.diagnostics);
      return result.compatibility;
    });
    const resources = dependencies.resources.map(({ sourceId, occurrences }) => {
      const result = classifyDependency(
        'resource',
        sourceId,
        sourcePack.resources,
        targetPack.resources,
        safeRequest.resourceReplacements,
        isCompatibleResource,
        safeRequest.requestId,
        occurrences,
      );
      diagnostics.push(...result.diagnostics);
      return result.compatibility;
    });
    const themeCandidates = Object.freeze(targetPack.themes.map((theme) => theme.id));
    const themeSelections = [
      Object.freeze({ candidates: themeCandidates }),
      ...Object.entries(safeRequest.document.state.scopes ?? {}).flatMap(([scopeId, scope]) =>
        scope.theme ? [Object.freeze({ scopeId, candidates: themeCandidates })] : [],
      ),
    ];
    const blocked =
      diagnostics.some((entry) => entry.code === 'invalid-pack-change-request') ||
      components.some((entry) => entry.compatibility.kind === 'unsupported') ||
      tokens.some((entry) => entry.kind === 'unsupported') ||
      resources.some((entry) => entry.kind === 'unsupported');
    const plan = Object.freeze<DesignSystemPackChangePlan>({
      request: safeRequest,
      requestId: safeRequest.requestId,
      documentId: safeRequest.document.documentId,
      documentRevision: safeRequest.document.revision,
      registryRevision: revision,
      sourceDocument: safeRequest.document,
      sourcePack: Object.freeze({ ...sourcePack.ref }),
      targetPack: Object.freeze({ ...targetPack.ref }),
      sourceProvenance: snapshotDesignSystemResolutionInput(sourcePack.provenance),
      targetProvenance: snapshotDesignSystemResolutionInput(targetPack.provenance),
      components: Object.freeze(components),
      tokens: Object.freeze(tokens),
      resources: Object.freeze(resources),
      themeSelections: Object.freeze(themeSelections),
      diagnostics: freezeDiagnostics(diagnostics),
      blocked,
    });
    return Object.freeze({ plan, diagnostics: plan.diagnostics });
  }

  finalize(
    snapshot: DesignSystemPackRegistrySnapshot,
    currentDocument: DesignSystemAuthoredDocumentSnapshot,
    plan: DesignSystemPackChangePlan,
    choices: DesignSystemPackChangeChoices,
  ): DesignSystemPackChangeFinalizeResult {
    const revision = snapshotRevision(snapshot);
    let safeDocument: DesignSystemAuthoredDocumentSnapshot;
    let safePlan: DesignSystemPackChangePlan;
    let safeChoices: DesignSystemPackChangeChoices;
    try {
      safeDocument = snapshotDesignSystemResolutionInput(currentDocument);
      safePlan = snapshotDesignSystemResolutionInput(plan);
      safeChoices = snapshotDesignSystemResolutionInput(choices);
    } catch {
      return failedFinalize(
        diagnostic(
          'invalid-pack-change-request',
          'Finalize inputs must be plain declarative data.',
          'finalize',
        ),
      );
    }
    if (
      revision === null ||
      !isAuthoredDocument(safeDocument) ||
      !isPlan(safePlan) ||
      !isChoices(safeChoices)
    ) {
      return failedFinalize(
        diagnostic(
          'invalid-pack-change-request',
          'Finalize inputs and registry snapshot must be canonical.',
          'finalize',
        ),
      );
    }
    if (revision !== safePlan.registryRevision) {
      return failedFinalize(
        diagnostic(
          'pack-change-registry-stale',
          'The Design System registry changed after planning.',
          'plan.registryRevision',
          { requestId: safePlan.requestId },
        ),
      );
    }
    if (
      safeDocument.documentId !== safePlan.documentId ||
      safeDocument.revision !== safePlan.documentRevision ||
      !declarativeEqual(safeDocument, safePlan.sourceDocument)
    ) {
      return failedFinalize(
        diagnostic(
          'pack-change-document-stale',
          'The authored document changed after planning.',
          'currentDocument',
          { requestId: safePlan.requestId },
        ),
      );
    }
    const currentSourcePack = lookupPack(snapshot, safePlan.sourcePack);
    const currentTargetPack = lookupPack(snapshot, safePlan.targetPack);
    if (
      currentSourcePack === null ||
      currentTargetPack === null ||
      !isSameDesignSystemPackRef(currentSourcePack.ref, safePlan.sourcePack) ||
      !isSameDesignSystemPackRef(currentTargetPack.ref, safePlan.targetPack)
    ) {
      return failedFinalize(
        diagnostic(
          'pack-change-registry-stale',
          'The exact source or target Pack no longer matches the planned descriptor provenance.',
          'plan',
          { requestId: safePlan.requestId },
        ),
      );
    }
    const recomputed = this.plan(snapshot, safePlan.request).plan;
    if (recomputed === undefined) {
      return failedFinalize(
        diagnostic(
          'pack-change-registry-stale',
          'The exact source or target Pack can no longer produce the planned compatibility result.',
          'plan',
          { requestId: safePlan.requestId },
        ),
      );
    }
    if (!declarativeEqual(recomputed, safePlan)) {
      return failedFinalize(
        diagnostic(
          'invalid-pack-change-request',
          'The supplied plan was not produced intact by this planner.',
          'plan',
          { requestId: safePlan.requestId },
        ),
      );
    }
    if (safePlan.blocked) {
      return failedFinalize(
        ...(safePlan.diagnostics.length > 0
          ? safePlan.diagnostics
          : [
              diagnostic(
                'pack-change-dependency-unsupported',
                'The blocked plan cannot be finalized.',
                'plan',
                { requestId: safePlan.requestId },
              ),
            ]),
      );
    }

    const themeMap = themeChoices(safeChoices.themes);
    const componentMap = choiceMap(safeChoices.components, (choice) => choice.nodeId);
    const tokenChoiceMap = choiceMap(safeChoices.tokens, (choice) => choice.sourceId);
    const resourceChoiceMap = choiceMap(safeChoices.resources, (choice) => choice.sourceId);
    if (!themeMap || !componentMap || !tokenChoiceMap || !resourceChoiceMap) {
      return failedFinalize(
        diagnostic(
          'pack-change-choice-invalid',
          'Pack-change choices must have unique canonical keys.',
          'choices',
          { requestId: safePlan.requestId },
        ),
      );
    }

    const requiredThemeKeys = new Set(
      safePlan.themeSelections.map((entry) =>
        entry.scopeId === undefined ? '$document' : `scope:${entry.scopeId}`,
      ),
    );
    if ([...requiredThemeKeys].some((key) => !themeMap.has(key))) {
      return failedFinalize(
        diagnostic(
          'pack-change-choice-required',
          'Every document/scope Theme requires one explicit target choice.',
          'choices.themes',
          { requestId: safePlan.requestId },
        ),
      );
    }
    if (
      themeMap.size !== requiredThemeKeys.size ||
      [...themeMap].some(
        ([key, themeId]) =>
          !requiredThemeKeys.has(key) ||
          !safePlan.themeSelections
            .find(
              (entry) =>
                (entry.scopeId === undefined ? '$document' : `scope:${entry.scopeId}`) === key,
            )
            ?.candidates.includes(themeId),
      )
    ) {
      return failedFinalize(
        diagnostic(
          'pack-change-choice-invalid',
          'Every document/scope Theme choice must select one declared target Theme.',
          'choices.themes',
          { requestId: safePlan.requestId },
        ),
      );
    }

    const componentSubstitutions: {
      readonly nodeId: string;
      readonly source: UiComponentRef;
      readonly target: UiComponentRef;
    }[] = [];
    const selectedComponents = new Map<string, UiComponentRef>();
    for (const entry of safePlan.components) {
      if (entry.compatibility.kind === 'direct') {
        selectedComponents.set(entry.nodeId, entry.compatibility.target);
        continue;
      }
      if (entry.compatibility.kind === 'unsupported') {
        return failedFinalize(
          diagnostic(
            'pack-change-dependency-unsupported',
            'Unsupported components cannot be finalized.',
            `plan.components.${entry.nodeId}`,
            { nodeId: entry.nodeId, requestId: safePlan.requestId },
          ),
        );
      }
      const choice = componentMap.get(entry.nodeId);
      if (
        choice === undefined ||
        !entry.compatibility.candidates.some(
          (candidate) => uiComponentRefKey(candidate) === uiComponentRefKey(choice.target),
        )
      ) {
        return failedFinalize(
          diagnostic(
            choice === undefined ? 'pack-change-choice-required' : 'pack-change-choice-invalid',
            'A non-direct component requires one exact candidate choice.',
            `choices.components.${entry.nodeId}`,
            { nodeId: entry.nodeId, requestId: safePlan.requestId },
          ),
        );
      }
      selectedComponents.set(entry.nodeId, choice.target);
      componentSubstitutions.push({
        nodeId: entry.nodeId,
        source: entry.compatibility.source,
        target: choice.target,
      });
    }
    if (componentMap.size !== componentSubstitutions.length) {
      return failedFinalize(
        diagnostic(
          'pack-change-choice-invalid',
          'Component choices contain unrelated extra node ids.',
          'choices.components',
          { requestId: safePlan.requestId },
        ),
      );
    }

    const resolveDependencies = (
      compatibilities: readonly DesignSystemDependencyCompatibility[],
      choicesById: ReadonlyMap<string, DesignSystemDependencyChoice>,
      path: 'tokens' | 'resources',
    ): readonly DesignSystemDependencySubstitution[] | DesignSystemPackChangeFinalizeResult => {
      const substitutions: DesignSystemDependencySubstitution[] = [];
      for (const entry of compatibilities) {
        if (entry.kind === 'direct') continue;
        if (entry.kind === 'unsupported') {
          return failedFinalize(
            diagnostic(
              'pack-change-dependency-unsupported',
              `Unsupported ${path} cannot be finalized.`,
              `plan.${path}.${entry.sourceId}`,
              { requestId: safePlan.requestId },
            ),
          );
        }
        const choice = choicesById.get(entry.sourceId);
        if (choice === undefined || !entry.candidates.includes(choice.targetId)) {
          return failedFinalize(
            diagnostic(
              choice === undefined ? 'pack-change-choice-required' : 'pack-change-choice-invalid',
              `A non-direct ${path.slice(0, -1)} requires one exact candidate choice.`,
              `choices.${path}.${entry.sourceId}`,
              { requestId: safePlan.requestId },
            ),
          );
        }
        substitutions.push({ sourceId: entry.sourceId, targetId: choice.targetId });
      }
      if (choicesById.size !== substitutions.length) {
        return failedFinalize(
          diagnostic(
            'pack-change-choice-invalid',
            `${path} choices contain unrelated extra source ids.`,
            `choices.${path}`,
            { requestId: safePlan.requestId },
          ),
        );
      }
      return Object.freeze(substitutions.map((entry) => Object.freeze(entry)));
    };

    const tokens = resolveDependencies(safePlan.tokens, tokenChoiceMap, 'tokens');
    if (isFinalizeFailure(tokens)) return tokens;
    const resources = resolveDependencies(safePlan.resources, resourceChoiceMap, 'resources');
    if (isFinalizeFailure(resources)) return resources;
    const tokenMap = new Map(tokens.map((entry) => [entry.sourceId, entry.targetId]));
    const resourceMap = new Map(resources.map((entry) => [entry.sourceId, entry.targetId]));

    for (const [scopeId, scope] of Object.entries(safeDocument.state.scopes ?? {})) {
      const rewrittenKeys = new Set<string>();
      for (const tokenId of Object.keys(scope.tokenOverrides ?? {})) {
        const rewrittenId = tokenMap.get(tokenId) ?? tokenId;
        if (rewrittenKeys.has(rewrittenId)) {
          return failedFinalize(
            diagnostic(
              'pack-change-target-resolution-failed',
              `ThemeScope "${scopeId}" token overrides collide at target token "${rewrittenId}".`,
              `targetState.scopes.${scopeId}.tokenOverrides.${rewrittenId}`,
              { requestId: safePlan.requestId },
            ),
          );
        }
        rewrittenKeys.add(rewrittenId);
      }
    }
    const targetPack = currentTargetPack;
    const targetState = Object.freeze<UiDesignSystemState>({
      pack: Object.freeze({ ...targetPack.ref }),
      theme: Object.freeze({
        pack: Object.freeze({ ...targetPack.ref }),
        themeId: themeMap.get('$document')!,
      }),
      ...(safeDocument.state.scopes
        ? {
            scopes: Object.freeze(
              Object.fromEntries(
                Object.entries(safeDocument.state.scopes).map(([scopeId, scope]) => [
                  scopeId,
                  Object.freeze({
                    ...(scope.theme
                      ? {
                          theme: Object.freeze({
                            pack: Object.freeze({ ...targetPack.ref }),
                            themeId: themeMap.get(`scope:${scopeId}`)!,
                          }),
                        }
                      : {}),
                    ...(scope.tokenOverrides
                      ? {
                          tokenOverrides: Object.freeze(
                            Object.fromEntries(
                              Object.entries(scope.tokenOverrides).map(([tokenId, source]) => [
                                tokenMap.get(tokenId) ?? tokenId,
                                rewriteSource(source, tokenMap, resourceMap),
                              ]),
                            ),
                          ),
                        }
                      : {}),
                  }),
                ]),
              ),
            ),
          }
        : {}),
    });
    if (validateUiDesignSystemState(targetState).length > 0) {
      return failedFinalize(
        diagnostic(
          'pack-change-target-resolution-failed',
          'The selected target design-system state is invalid.',
          'targetState',
          { requestId: safePlan.requestId },
        ),
      );
    }

    const strategyMap = new Map(
      safePlan.request.layoutStrategies.map((entry) => [entry.id, entry]),
    );
    const propertyMap = new Map(
      safePlan.request.layoutProperties.map((entry) => [entry.id, entry]),
    );
    const resolver = new DesignSystemResolver();
    const tokenResolver = new DesignTokenResolver();
    for (const [scopeId, scope] of Object.entries(targetState.scopes ?? {})) {
      const selection = resolver.resolve(snapshot, {
        state: targetState,
        scopeChain: [scopeId],
      }).selection;
      if (selection === undefined) {
        return failedFinalize(
          diagnostic(
            'pack-change-target-resolution-failed',
            `ThemeScope "${scopeId}" cannot be resolved in the target Pack.`,
            `targetState.scopes.${scopeId}`,
            { requestId: safePlan.requestId },
          ),
        );
      }
      for (const [tokenId, source] of Object.entries(scope.tokenOverrides ?? {})) {
        const token = descriptorById(targetPack.tokens, tokenId);
        if (
          token === undefined ||
          validateUiPropertyValue({ id: tokenId, value: token.value }, source).length > 0 ||
          tokenResolver.resolveToken(selection, { tokenId }).diagnostics.length > 0
        ) {
          return failedFinalize(
            diagnostic(
              'pack-change-target-resolution-failed',
              `ThemeScope "${scopeId}" token override "${tokenId}" cannot resolve in the target Pack.`,
              `targetState.scopes.${scopeId}.tokenOverrides.${tokenId}`,
              { requestId: safePlan.requestId },
            ),
          );
        }
      }
    }
    for (const node of safeDocument.nodes) {
      const targetRef = selectedComponents.get(node.nodeId)!;
      const targetComponent = findComponent(targetPack, targetRef);
      if (targetComponent === undefined) {
        return failedFinalize(
          diagnostic(
            'pack-change-target-resolution-failed',
            'The selected target component is unavailable.',
            `nodes.${node.nodeId}.component`,
            { nodeId: node.nodeId, requestId: safePlan.requestId },
          ),
        );
      }
      const selection = resolver.resolve(snapshot, {
        state: targetState,
        scopeChain: node.scopeChain,
      }).selection;
      if (selection === undefined) {
        return failedFinalize(
          diagnostic(
            'pack-change-target-resolution-failed',
            'The selected target ThemeScope chain cannot be resolved.',
            `nodes.${node.nodeId}.scopeChain`,
            { nodeId: node.nodeId, requestId: safePlan.requestId },
          ),
        );
      }
      for (const [propertyId, source] of Object.entries(node.properties)) {
        const descriptor = targetComponent.properties?.find((entry) => entry.id === propertyId);
        const rewritten = rewriteSource(source, tokenMap, resourceMap);
        if (
          descriptor === undefined ||
          validateUiPropertyValue(descriptor, rewritten).length > 0 ||
          tokenResolver.resolveComponentProperty(selection, {
            component: targetRef,
            propertyId,
            instanceValue: rewritten,
          }).diagnostics.length > 0
        ) {
          return failedFinalize(
            diagnostic(
              'pack-change-target-resolution-failed',
              `Target component property "${propertyId}" cannot preserve the authored value.`,
              `nodes.${node.nodeId}.properties.${propertyId}`,
              { nodeId: node.nodeId, propertyId, requestId: safePlan.requestId },
            ),
          );
        }
      }
      if (node.layout) {
        const strategy = strategyMap.get(node.layout.strategyId);
        if (
          strategy === undefined ||
          !targetComponent.layout?.supportedStrategyIds?.includes(node.layout.strategyId)
        ) {
          return failedFinalize(
            diagnostic(
              'pack-change-target-resolution-failed',
              'The target component does not support the authored layout strategy.',
              `nodes.${node.nodeId}.layout.strategyId`,
              { nodeId: node.nodeId, requestId: safePlan.requestId },
            ),
          );
        }
        for (const [propertyId, source] of Object.entries(node.layout.values)) {
          const descriptor = propertyMap.get(propertyId);
          const rewritten = rewriteSource(source, tokenMap, resourceMap);
          const layoutIssues =
            descriptor === undefined
              ? Object.freeze([])
              : validateUiLayoutPropertyValue(descriptor, rewritten);
          if (
            descriptor === undefined ||
            (!strategy.supportedContainerProperties.includes(propertyId) &&
              !strategy.supportedChildProperties.includes(propertyId)) ||
            layoutIssues.length > 0
          ) {
            return failedFinalize(
              diagnostic(
                layoutIssues.some((entry) => entry.code === 'unsupported-layout-literal-type')
                  ? 'unsupported-layout-literal-type'
                  : 'pack-change-target-resolution-failed',
                `Layout property "${propertyId}" cannot be preserved in the target Pack.`,
                `nodes.${node.nodeId}.layout.values.${propertyId}`,
                { nodeId: node.nodeId, propertyId, requestId: safePlan.requestId },
              ),
            );
          }
          if (
            rewritten.kind === 'token' &&
            tokenResolver.resolveToken(selection, {
              tokenId: rewritten.tokenId,
              expectedType: descriptor.value.type,
            }).diagnostics.length > 0
          ) {
            return failedFinalize(
              diagnostic(
                'pack-change-target-resolution-failed',
                `Layout token "${rewritten.tokenId}" cannot be resolved in the target Pack.`,
                `nodes.${node.nodeId}.layout.values.${propertyId}`,
                { nodeId: node.nodeId, propertyId, requestId: safePlan.requestId },
              ),
            );
          }
          if (rewritten.kind === 'resource') {
            const resource = descriptorById(targetPack.resources, rewritten.resourceId);
            if (resource !== undefined && resource.value.type === descriptor.value.type) continue;
            return failedFinalize(
              diagnostic(
                'pack-change-target-resolution-failed',
                `Layout resource "${rewritten.resourceId}" is missing from the target Pack.`,
                `nodes.${node.nodeId}.layout.values.${propertyId}`,
                { nodeId: node.nodeId, propertyId, requestId: safePlan.requestId },
              ),
            );
          }
        }
      }
    }

    return Object.freeze({
      mutation: Object.freeze<DesignSystemPackChangeMutation>({
        requestId: safePlan.requestId,
        registryRevision: revision,
        documentId: safeDocument.documentId,
        baseRevision: safeDocument.revision,
        sourceDocument: safeDocument,
        targetState,
        components: Object.freeze(componentSubstitutions.map((entry) => Object.freeze(entry))),
        tokens,
        resources,
      }),
      diagnostics: Object.freeze([]),
    });
  }
}
