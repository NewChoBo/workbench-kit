import {
  designSystemPackRefKey,
  isCanonicalDesignSystemText,
  isStructurallyValidUiValueSource,
  normalizeUiAllowedSources,
  validateUiPropertyValue,
  type DesignSystemContributionProvenance,
  type DesignSystemDiagnostic,
  type DesignSystemPackRef,
  type DesignSystemResourceDescriptor,
  type UiComponentRef,
  type UiValueSource,
  type UiValueType,
} from '@workbench-kit/contracts';

import type { ResolvedDesignSystemSelection } from './resolver.js';

export type ResolvedDesignValueSource = Exclude<UiValueSource, { readonly kind: 'token' }>;

export type DesignValueProvenanceKind =
  'instance' | 'theme-scope' | 'theme' | 'pack-default' | 'component-fallback';

export interface DesignValueProvenanceEntry {
  readonly kind: DesignValueProvenanceKind;
  readonly sourceId: string;
  readonly tokenId?: string;
}

export interface ResolvedDesignResource {
  readonly pack: DesignSystemPackRef;
  readonly descriptor: DesignSystemResourceDescriptor;
  readonly provenance: DesignSystemContributionProvenance;
}

export interface ResolvedDesignValue {
  readonly valueType: UiValueType;
  readonly source: ResolvedDesignValueSource;
  readonly resource?: ResolvedDesignResource;
  readonly provenance: readonly DesignValueProvenanceEntry[];
}

export interface DesignTokenResolutionRequest {
  readonly tokenId: string;
  readonly expectedType?: UiValueType;
}

export interface DesignComponentPropertyResolutionRequest {
  readonly component: UiComponentRef;
  readonly propertyId: string;
  readonly instanceValue?: UiValueSource;
}

export interface DesignValueResolutionResult {
  readonly value?: ResolvedDesignValue;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

interface TokenSourceSelection {
  readonly source: UiValueSource;
  readonly provenance: DesignValueProvenanceEntry;
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(
    diagnostics.map((diagnostic) =>
      Object.freeze({
        ...diagnostic,
        ...(diagnostic.tokenPath === undefined
          ? {}
          : { tokenPath: Object.freeze([...diagnostic.tokenPath]) }),
      }),
    ),
  );
}

function failure(diagnostic: DesignSystemDiagnostic): DesignValueResolutionResult {
  return Object.freeze({ diagnostics: freezeDiagnostics([diagnostic]) });
}

function cloneJsonValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map((item) => cloneJsonValue(item)));
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      clone[key] = cloneJsonValue(descriptor.value);
    }
  }
  return Object.freeze(clone);
}

function cloneTerminalSource(source: ResolvedDesignValueSource): ResolvedDesignValueSource {
  switch (source.kind) {
    case 'literal':
      return Object.freeze({ kind: 'literal', value: cloneJsonValue(source.value) });
    case 'resource':
      return Object.freeze({ kind: 'resource', resourceId: source.resourceId });
    case 'binding':
      return Object.freeze({ kind: 'binding', bindingId: source.bindingId });
    case 'expression':
      return Object.freeze({ kind: 'expression', expressionId: source.expressionId });
  }
}

function success(
  valueType: UiValueType,
  source: ResolvedDesignValueSource,
  provenance: readonly DesignValueProvenanceEntry[],
  resource?: ResolvedDesignResource,
): DesignValueResolutionResult {
  const frozenProvenance = Object.freeze(provenance.map((entry) => Object.freeze({ ...entry })));
  const frozenResource =
    resource === undefined
      ? undefined
      : Object.freeze({
          pack: Object.freeze({ ...resource.pack }),
          descriptor: resource.descriptor,
          provenance: resource.provenance,
        });
  const value = Object.freeze({
    valueType,
    source: cloneTerminalSource(source),
    ...(frozenResource === undefined ? {} : { resource: frozenResource }),
    provenance: frozenProvenance,
  });
  return Object.freeze({ value, diagnostics: Object.freeze([]) });
}

function componentPropertySourceId(component: UiComponentRef, propertyId: string): string {
  return JSON.stringify([component.id, component.version, propertyId]);
}

function literalMatchesType(type: UiValueType, value: unknown): boolean {
  switch (type) {
    case 'string':
    case 'color':
    case 'enum':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

function selectTokenSource(
  selection: ResolvedDesignSystemSelection,
  tokenId: string,
): TokenSourceSelection | undefined {
  for (let index = selection.appliedScopes.length - 1; index >= 0; index -= 1) {
    const scope = selection.appliedScopes[index];
    const source = scope.selection.tokenOverrides?.[tokenId];
    if (source !== undefined) {
      return {
        source,
        provenance: { kind: 'theme-scope', sourceId: scope.scopeId, tokenId },
      };
    }
  }
  const themeSource = selection.theme.tokenValues?.[tokenId];
  if (themeSource !== undefined) {
    return {
      source: themeSource,
      provenance: { kind: 'theme', sourceId: selection.theme.id, tokenId },
    };
  }
  const packSource = selection.pack.defaultTokenValues?.[tokenId];
  if (packSource !== undefined) {
    return {
      source: packSource,
      provenance: {
        kind: 'pack-default',
        sourceId: designSystemPackRefKey(selection.pack.ref),
        tokenId,
      },
    };
  }
  return undefined;
}

function resolveResource(
  selection: ResolvedDesignSystemSelection,
  resourceId: string,
  expectedType: UiValueType,
  provenance: readonly DesignValueProvenanceEntry[],
): DesignValueResolutionResult {
  const descriptor = selection.pack.resources?.find((candidate) => candidate.id === resourceId);
  if (descriptor === undefined) {
    return failure({
      code: 'resource-not-found',
      message: 'The referenced Design System resource is not declared in the selected Pack.',
      path: 'source.resourceId',
      packId: selection.pack.ref.id,
      requestedVersion: selection.pack.ref.version,
      resourceId,
    });
  }
  if (descriptor.value.type !== expectedType) {
    return failure({
      code: 'resource-type-mismatch',
      message:
        'The referenced Design System resource type does not match the requested value type.',
      path: 'source.resourceId',
      packId: selection.pack.ref.id,
      requestedVersion: selection.pack.ref.version,
      resourceId,
    });
  }
  return success(expectedType, { kind: 'resource', resourceId }, provenance, {
    pack: selection.pack.ref,
    descriptor,
    provenance: selection.provenance,
  });
}

function resolveTokenInternal(
  selection: ResolvedDesignSystemSelection,
  tokenId: string,
  expectedType: UiValueType | undefined,
  provenance: readonly DesignValueProvenanceEntry[],
  tokenPath: readonly string[],
): DesignValueResolutionResult {
  if (!isCanonicalDesignSystemText(tokenId)) {
    return failure({
      code: 'token-not-found',
      message: 'Design System token id must be non-blank and already trimmed.',
      path: 'request.tokenId',
      tokenId,
    });
  }
  if (tokenPath.includes(tokenId)) {
    return failure({
      code: 'token-cycle',
      message: 'Design System token aliases must not form a cycle.',
      path: 'request.tokenId',
      tokenId,
      tokenPath: [...tokenPath, tokenId],
    });
  }
  const descriptor = selection.pack.tokens?.find((candidate) => candidate.id === tokenId);
  if (descriptor === undefined) {
    return failure({
      code: 'token-not-found',
      message: 'The requested Design System token is not declared in the selected Pack.',
      path: 'request.tokenId',
      packId: selection.pack.ref.id,
      requestedVersion: selection.pack.ref.version,
      tokenId,
    });
  }
  if (expectedType !== undefined && descriptor.value.type !== expectedType) {
    return failure({
      code: 'token-type-mismatch',
      message: 'The requested Design System token type does not match the expected value type.',
      path: 'request.expectedType',
      packId: selection.pack.ref.id,
      requestedVersion: selection.pack.ref.version,
      tokenId,
    });
  }
  const selected = selectTokenSource(selection, tokenId);
  if (selected === undefined) {
    return failure({
      code: 'token-value-not-found',
      message: 'The declared Design System token has no value in the active precedence chain.',
      path: 'request.tokenId',
      packId: selection.pack.ref.id,
      requestedVersion: selection.pack.ref.version,
      tokenId,
    });
  }
  if (!isStructurallyValidUiValueSource(selected.source)) {
    return failure({
      code: 'disallowed-value-source',
      message: 'The selected Design System token value is not a declarative UiValueSource.',
      path: 'source',
      tokenId,
    });
  }
  if (selected.source.kind === 'binding' || selected.source.kind === 'expression') {
    return failure({
      code: 'unsupported-token-source-kind',
      message: 'Design System token maps cannot contain binding or expression sources.',
      path: 'source.kind',
      tokenId,
    });
  }
  if (!normalizeUiAllowedSources(descriptor.value.allowedSources).includes(selected.source.kind)) {
    return failure({
      code: 'disallowed-value-source',
      message: 'The selected source kind is not allowed by the Design System token descriptor.',
      path: 'source.kind',
      tokenId,
    });
  }

  const nextProvenance = [...provenance, selected.provenance];
  switch (selected.source.kind) {
    case 'literal':
      if (!literalMatchesType(descriptor.value.type, selected.source.value)) {
        return failure({
          code: 'literal-type-mismatch',
          message: 'The selected Design System literal does not match its token type.',
          path: 'source.value',
          tokenId,
        });
      }
      return success(descriptor.value.type, selected.source, nextProvenance);
    case 'resource':
      return resolveResource(
        selection,
        selected.source.resourceId,
        descriptor.value.type,
        nextProvenance,
      );
    case 'token':
      return resolveTokenInternal(
        selection,
        selected.source.tokenId,
        descriptor.value.type,
        nextProvenance,
        [...tokenPath, tokenId],
      );
  }
}

export class DesignTokenResolver {
  resolveToken(
    selection: ResolvedDesignSystemSelection,
    request: DesignTokenResolutionRequest,
  ): DesignValueResolutionResult {
    return resolveTokenInternal(selection, request.tokenId, request.expectedType, [], []);
  }

  resolveComponentProperty(
    selection: ResolvedDesignSystemSelection,
    request: DesignComponentPropertyResolutionRequest,
  ): DesignValueResolutionResult {
    const component = selection.pack.components.find(
      (candidate) =>
        candidate.id === request.component.id && candidate.version === request.component.version,
    );
    if (component === undefined) {
      return failure({
        code: 'component-not-found',
        message: 'The requested exact component is not declared in the selected Pack.',
        path: 'request.component',
        componentId: request.component.id,
        componentVersion: request.component.version,
      });
    }
    const property = component.properties?.find((candidate) => candidate.id === request.propertyId);
    if (property === undefined) {
      return failure({
        code: 'property-not-found',
        message: 'The requested component property is not declared.',
        path: 'request.propertyId',
        componentId: request.component.id,
        componentVersion: request.component.version,
        propertyId: request.propertyId,
      });
    }

    const sourceId = componentPropertySourceId(request.component, request.propertyId);
    const source =
      request.instanceValue === undefined
        ? property.value.defaultValue === undefined
          ? undefined
          : ({ kind: 'literal', value: property.value.defaultValue } satisfies UiValueSource)
        : request.instanceValue;
    if (source === undefined) {
      return failure({
        code: 'component-value-not-found',
        message: 'The component property has neither an instance value nor a declared fallback.',
        path: 'request.instanceValue',
        componentId: request.component.id,
        componentVersion: request.component.version,
        propertyId: request.propertyId,
      });
    }
    if (!isStructurallyValidUiValueSource(source)) {
      return failure({
        code: 'disallowed-value-source',
        message: 'The component property value is not a declarative UiValueSource.',
        path: 'request.instanceValue',
        componentId: request.component.id,
        componentVersion: request.component.version,
        propertyId: request.propertyId,
      });
    }
    const valueIssues = validateUiPropertyValue(property, source);
    if (valueIssues.length > 0) {
      return failure({
        code: 'disallowed-value-source',
        message: valueIssues[0].message,
        path: 'request.instanceValue',
        componentId: request.component.id,
        componentVersion: request.component.version,
        propertyId: request.propertyId,
      });
    }
    const provenance = [
      {
        kind: request.instanceValue === undefined ? 'component-fallback' : 'instance',
        sourceId,
      } satisfies DesignValueProvenanceEntry,
    ];
    switch (source.kind) {
      case 'literal':
        if (!literalMatchesType(property.value.type, source.value)) {
          return failure({
            code: 'literal-type-mismatch',
            message: 'The component property literal does not match its semantic value type.',
            path: 'request.instanceValue',
            componentId: request.component.id,
            componentVersion: request.component.version,
            propertyId: request.propertyId,
          });
        }
        return success(property.value.type, source, provenance);
      case 'resource':
        return resolveResource(selection, source.resourceId, property.value.type, provenance);
      case 'token':
        return resolveTokenInternal(selection, source.tokenId, property.value.type, provenance, []);
      case 'binding':
      case 'expression':
        return success(property.value.type, source, provenance);
    }
  }
}
