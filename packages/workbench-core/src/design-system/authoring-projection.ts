import {
  isCanonicalDesignSystemText,
  snapshotDesignSystemResolutionInput,
  type DesignSystemAuthoredDocumentSnapshot,
  type DesignSystemAuthoredResponsiveOverrideSnapshot,
  type DesignSystemContributionProvenance,
  type DesignSystemDiagnostic,
  type DesignSystemThemeRef,
  type UiComponentCatalogContract,
  type UiComponentRef,
} from '@workbench-kit/contracts';

import { ComponentResolver, type ComponentCompatibility } from './component-resolver.js';
import type { DesignSystemPackRegistrySnapshot } from './registry.js';
import { DesignSystemResolver } from './resolver.js';
import { DesignTokenResolver, type DesignValueResolutionResult } from './token-resolver.js';

export interface UiAuthoringResolutionNodeProjection {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly componentCompatibility: ComponentCompatibility;
  readonly componentProvenance: DesignSystemContributionProvenance | null;
  readonly effectiveTheme: DesignSystemThemeRef | null;
  readonly scopeChain: readonly string[];
  readonly properties: Readonly<Record<string, DesignValueResolutionResult>>;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

export interface UiAuthoringResolutionProjection {
  readonly documentId: string;
  readonly documentRevision: number;
  readonly registryRevision: number;
  readonly hostWidth?: number;
  readonly activeResponsiveVariantId?: string;
  readonly nodes: readonly UiAuthoringResolutionNodeProjection[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

function isResponsiveVariantCatalog(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const ranges: { readonly min: number; readonly max: number }[] = [];
  for (const entry of value) {
    if (
      !isPlainRecord(entry) ||
      !isCanonicalDesignSystemText(entry.id) ||
      ids.has(entry.id) ||
      !isPlainRecord(entry.hostWidth)
    ) {
      return false;
    }
    ids.add(entry.id);
    const hasMin = Object.prototype.hasOwnProperty.call(entry.hostWidth, 'minInclusive');
    const hasMax = Object.prototype.hasOwnProperty.call(entry.hostWidth, 'maxExclusive');
    const min = hasMin ? entry.hostWidth.minInclusive : 0;
    const max = hasMax ? entry.hostWidth.maxExclusive : Number.POSITIVE_INFINITY;
    if (
      (!hasMin && !hasMax) ||
      typeof min !== 'number' ||
      !Number.isFinite(min) ||
      min < 0 ||
      (hasMin && min === 0) ||
      typeof max !== 'number' ||
      (hasMax && !Number.isFinite(max)) ||
      max <= 0 ||
      min >= max
    ) {
      return false;
    }
    ranges.push({ min, max });
  }
  const canonical = [...ranges].sort((left, right) => left.min - right.min || left.max - right.max);
  return (
    ranges.every(
      (range, index) => range.min === canonical[index]?.min && range.max === canonical[index]?.max,
    ) && canonical.every((range, index) => index === 0 || range.min >= canonical[index - 1]!.max)
  );
}

function isResponsiveOverrides(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isPlainRecord(value) &&
    Object.entries(value).every(
      ([variantId, override]) =>
        isCanonicalDesignSystemText(variantId) &&
        isPlainRecord(override) &&
        (override.properties === undefined || isPlainRecord(override.properties)) &&
        (override.layout === undefined ||
          (isPlainRecord(override.layout) &&
            isCanonicalDesignSystemText(override.layout.strategyId) &&
            isPlainRecord(override.layout.values))),
    )
  );
}

function activeResponsiveVariantId(
  document: DesignSystemAuthoredDocumentSnapshot,
  hostWidth: number | undefined,
): string | undefined {
  if (hostWidth === undefined) return undefined;
  return document.responsiveVariants?.find((variant) => {
    const min = variant.hostWidth.minInclusive ?? 0;
    const max = variant.hostWidth.maxExclusive ?? Number.POSITIVE_INFINITY;
    return hostWidth >= min && hostWidth < max;
  })?.id;
}

function responsiveOverride(
  node: DesignSystemAuthoredDocumentSnapshot['nodes'][number],
  variantId: string | undefined,
): DesignSystemAuthoredResponsiveOverrideSnapshot | undefined {
  if (variantId === undefined || node.responsiveOverrides === undefined) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(node.responsiveOverrides, variantId);
  return descriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
    isPlainRecord(descriptor.value)
    ? (descriptor.value as DesignSystemAuthoredResponsiveOverrideSnapshot)
    : undefined;
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

function isProjectionDocument(value: unknown): value is DesignSystemAuthoredDocumentSnapshot {
  if (
    !isPlainRecord(value) ||
    !isCanonicalDesignSystemText(value.documentId) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !isPlainRecord(value.state) ||
    !isResponsiveVariantCatalog(value.responsiveVariants) ||
    !Array.isArray(value.nodes)
  ) {
    return false;
  }
  const responsiveVariantIds = new Set(
    (value.responsiveVariants as readonly { readonly id: string }[] | undefined)?.map(
      (variant) => variant.id,
    ) ?? [],
  );
  return value.nodes.every(
    (node) =>
      isPlainRecord(node) &&
      isCanonicalDesignSystemText(node.nodeId) &&
      isCanonicalComponentRef(node.component) &&
      isPlainRecord(node.properties) &&
      isResponsiveOverrides(node.responsiveOverrides) &&
      (node.responsiveOverrides === undefined ||
        Object.keys(node.responsiveOverrides as Readonly<Record<string, unknown>>).every(
          (variantId) => responsiveVariantIds.has(variantId),
        )) &&
      Array.isArray(node.scopeChain) &&
      node.scopeChain.every(isCanonicalDesignSystemText),
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

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  const seen = new Set<string>();
  return Object.freeze(
    diagnostics.flatMap((entry) => {
      const key = JSON.stringify(entry);
      if (seen.has(key)) return [];
      seen.add(key);
      return [Object.freeze({ ...entry })];
    }),
  );
}

function freezeComponentRef(component: UiComponentRef): UiComponentRef {
  return Object.freeze({ id: component.id, version: component.version });
}

function unsupportedComponent(component: UiComponentRef): ComponentCompatibility {
  return Object.freeze({
    kind: 'unsupported',
    source: freezeComponentRef(component),
    reason: 'source-component-not-found',
  });
}

function failureProjection(
  registryRevision: number,
  hostWidth: number | undefined,
  issue: DesignSystemDiagnostic,
): UiAuthoringResolutionProjection {
  return Object.freeze({
    documentId: '',
    documentRevision: 0,
    registryRevision,
    ...(hostWidth === undefined ? {} : { hostWidth }),
    nodes: Object.freeze([]),
    diagnostics: freezeDiagnostics([issue]),
  });
}

function propertyIdsForNode(
  componentDescriptor: ReturnType<UiComponentCatalogContract['component']>,
  authoredProperties: Readonly<Record<string, unknown>>,
): readonly string[] {
  const propertyIds = new Set<string>();
  for (const property of componentDescriptor?.properties ?? []) {
    propertyIds.add(property.id);
  }
  for (const propertyId of Object.keys(authoredProperties)) {
    propertyIds.add(propertyId);
  }
  return [...propertyIds];
}

function missingComponentDiagnostic(
  component: UiComponentRef,
  nodeId: string,
  nodeIndex: number,
  source: 'catalog' | 'pack',
): DesignSystemDiagnostic {
  return diagnostic(
    'component-not-found',
    source === 'catalog'
      ? 'The authored exact component is unavailable in the immutable component catalog.'
      : 'The authored exact component is unavailable in the resolved Design System Pack.',
    `document.nodes[${nodeIndex}].component`,
    {
      nodeId,
      componentId: component.id,
      componentVersion: component.version,
    },
  );
}

/**
 * Projects one immutable authored-document snapshot into renderer-neutral Design System data.
 * The function performs exact per-node catalog lookups and never imports or interprets JDW state.
 */
export function projectUiAuthoringResolution(
  document: DesignSystemAuthoredDocumentSnapshot,
  registry: DesignSystemPackRegistrySnapshot,
  componentCatalog: UiComponentCatalogContract,
  hostWidth?: number,
): UiAuthoringResolutionProjection {
  const registryRevision = registry.revision;
  const validHostWidth =
    hostWidth === undefined || (Number.isFinite(hostWidth) && hostWidth >= 0)
      ? hostWidth
      : undefined;
  const hostWidthIssue =
    hostWidth !== undefined && validHostWidth === undefined
      ? diagnostic(
          'invalid-pack-change-request',
          'Authoring projection host width must be a finite non-negative number.',
          'hostWidth',
        )
      : null;

  let snapshot: DesignSystemAuthoredDocumentSnapshot;
  try {
    snapshot = snapshotDesignSystemResolutionInput(document);
  } catch {
    return failureProjection(
      registryRevision,
      validHostWidth,
      diagnostic(
        'invalid-pack-change-request',
        'The authored document projection input must be plain declarative data.',
        'document',
      ),
    );
  }

  if (!isProjectionDocument(snapshot)) {
    return failureProjection(
      registryRevision,
      validHostWidth,
      diagnostic(
        'invalid-pack-change-request',
        'The authored document projection input is invalid.',
        'document',
      ),
    );
  }

  try {
    const systemResolver = new DesignSystemResolver();
    const tokenResolver = new DesignTokenResolver();
    const componentResolver = new ComponentResolver();
    const activeVariantId = activeResponsiveVariantId(snapshot, validHostWidth);
    const nodes = snapshot.nodes.map((node, nodeIndex) => {
      const override = responsiveOverride(node, activeVariantId);
      const authoredProperties = Object.freeze({
        ...node.properties,
        ...(override?.properties ?? {}),
      });
      const component = freezeComponentRef(node.component);
      const resolution = systemResolver.resolve(registry, {
        state: snapshot.state,
        scopeChain: node.scopeChain,
      });
      const catalogComponent = componentCatalog.component(component);
      const packComponent = resolution.selection?.pack.components.find(
        (candidate) => candidate.id === component.id && candidate.version === component.version,
      );
      const catalogDiagnostics =
        catalogComponent === undefined
          ? [missingComponentDiagnostic(component, node.nodeId, nodeIndex, 'catalog')]
          : [];

      let componentCompatibility = unsupportedComponent(component);
      const compatibilityDiagnostics: DesignSystemDiagnostic[] = [];
      if (resolution.selection !== undefined) {
        const compatibility = componentResolver.classify({
          sourcePack: resolution.selection.pack,
          targetPack: resolution.selection.pack,
          component,
        });
        componentCompatibility = compatibility.compatibility;
        compatibilityDiagnostics.push(...compatibility.diagnostics);
        if (catalogComponent !== undefined && compatibility.compatibility.kind === 'unsupported') {
          compatibilityDiagnostics.push(
            missingComponentDiagnostic(component, node.nodeId, nodeIndex, 'pack'),
          );
        }
      }

      const propertyResults = Object.create(null) as Record<string, DesignValueResolutionResult>;
      const propertyDiagnostics: DesignSystemDiagnostic[] = [];
      for (const propertyId of propertyIdsForNode(
        catalogComponent ?? packComponent,
        authoredProperties,
      )) {
        const hasInstanceValue = Object.prototype.hasOwnProperty.call(
          authoredProperties,
          propertyId,
        );
        const propertyResult =
          resolution.selection !== undefined
            ? tokenResolver.resolveComponentProperty(resolution.selection, {
                component,
                propertyId,
                ...(hasInstanceValue ? { instanceValue: authoredProperties[propertyId] } : {}),
              })
            : Object.freeze<DesignValueResolutionResult>({
                diagnostics: freezeDiagnostics([
                  ...resolution.diagnostics,
                  ...compatibilityDiagnostics,
                ]),
              });
        propertyResults[propertyId] = propertyResult;
        propertyDiagnostics.push(...propertyResult.diagnostics);
      }

      const diagnostics = freezeDiagnostics([
        ...resolution.diagnostics,
        ...catalogDiagnostics,
        ...compatibilityDiagnostics,
        ...propertyDiagnostics,
      ]);
      const compatible = componentCompatibility.kind !== 'unsupported';
      const effectiveTheme =
        resolution.selection === undefined
          ? null
          : Object.freeze<DesignSystemThemeRef>({
              pack: Object.freeze({ ...resolution.selection.pack.ref }),
              themeId: resolution.selection.theme.id,
            });
      const componentProvenance =
        resolution.selection === undefined || !compatible
          ? null
          : Object.freeze({ ...resolution.selection.provenance });

      return Object.freeze<UiAuthoringResolutionNodeProjection>({
        nodeId: node.nodeId,
        component,
        componentCompatibility,
        componentProvenance,
        effectiveTheme,
        scopeChain: Object.freeze([...node.scopeChain]),
        properties: Object.freeze(propertyResults),
        diagnostics,
      });
    });

    const diagnostics = freezeDiagnostics([
      ...(hostWidthIssue === null ? [] : [hostWidthIssue]),
      ...nodes.flatMap((node) => node.diagnostics),
    ]);
    return Object.freeze({
      documentId: snapshot.documentId,
      documentRevision: snapshot.revision,
      registryRevision,
      ...(validHostWidth === undefined ? {} : { hostWidth: validHostWidth }),
      ...(activeVariantId === undefined ? {} : { activeResponsiveVariantId: activeVariantId }),
      nodes: Object.freeze(nodes),
      diagnostics,
    });
  } catch {
    return failureProjection(
      registryRevision,
      validHostWidth,
      diagnostic(
        'invalid-pack-change-request',
        'The authored document projection could not be resolved from immutable inputs.',
        'document',
      ),
    );
  }
}
