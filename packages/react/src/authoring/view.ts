import type { UiValueSource } from '@workbench-kit/contracts';
import type {
  UiAuthoringDocumentNodeProjectionV3,
  UiAuthoringDocumentProjectionV3,
  UiAuthoringResponsiveLayoutProjection,
  UiAuthoringResponsiveValueProjection,
  UiResponsiveEditingTarget,
} from '@workbench-kit/jdw';
import type { DesignValueResolutionResult } from '@workbench-kit/workbench-core/design-system';

export function activeEditingTarget(
  document: UiAuthoringDocumentProjectionV3,
): UiResponsiveEditingTarget {
  return document.activeResponsiveVariantId === undefined
    ? { kind: 'base' }
    : { kind: 'variant', variantId: document.activeResponsiveVariantId };
}

export function isSameEditingTarget(
  first: UiResponsiveEditingTarget,
  second: UiResponsiveEditingTarget,
): boolean {
  return (
    first.kind === second.kind &&
    (first.kind === 'base' || (second.kind === 'variant' && first.variantId === second.variantId))
  );
}

export function formatEditingTarget(target: UiResponsiveEditingTarget): string {
  return target.kind === 'base' ? 'Base' : `Variant ${target.variantId}`;
}

export function editingTargetControlValue(target: UiResponsiveEditingTarget): string {
  return target.kind === 'base'
    ? 'target:base'
    : `target:variant:${encodeURIComponent(target.variantId)}`;
}

export function editingTargetFromControlValue(value: string): UiResponsiveEditingTarget {
  if (value === 'target:base') return { kind: 'base' };
  const prefix = 'target:variant:';
  if (!value.startsWith(prefix)) {
    throw new TypeError('Unknown responsive editing target control value.');
  }
  return { kind: 'variant', variantId: decodeURIComponent(value.slice(prefix.length)) };
}

export function selectedAuthoringNode(
  document: UiAuthoringDocumentProjectionV3,
): UiAuthoringDocumentNodeProjectionV3 | undefined {
  return document.nodes.find((node) => node.selected);
}

export function formatUiValueSource(value: UiValueSource): string {
  switch (value.kind) {
    case 'literal': {
      if (typeof value.value === 'string') return value.value;
      const serialized = JSON.stringify(value.value);
      return serialized ?? String(value.value);
    }
    case 'token':
      return `Token: ${value.tokenId}`;
    case 'resource':
      return `Resource: ${value.resourceId}`;
    case 'binding':
      return `Binding: ${value.bindingId}`;
    case 'expression':
      return `Expression: ${value.expressionId}`;
  }
}

export function formatResolvedValue(result: DesignValueResolutionResult | undefined): string {
  const resolved = result?.value;
  if (resolved === undefined) return 'Unresolved';
  return formatUiValueSource(resolved.source);
}

export function formatResolvedProvenance(result: DesignValueResolutionResult | undefined): string {
  const chain = result?.value?.provenance;
  if (chain === undefined || chain.length === 0) return 'No Design System provenance';
  return chain.map((entry) => `${entry.kind}: ${entry.sourceId}`).join(' → ');
}

export function hasPropertyOverride(
  node: UiAuthoringDocumentNodeProjectionV3,
  target: UiResponsiveEditingTarget,
  propertyId: string,
): boolean {
  if (target.kind === 'base') {
    return Object.prototype.hasOwnProperty.call(node.baseProperties, propertyId);
  }
  return node.responsiveOverrides[target.variantId]?.properties?.[propertyId] !== undefined;
}

export function hasLayoutOverride(
  node: UiAuthoringDocumentNodeProjectionV3,
  target: UiResponsiveEditingTarget,
): boolean {
  if (target.kind === 'base') return node.baseLayout !== undefined;
  return node.responsiveOverrides[target.variantId]?.layout !== undefined;
}

export function propertiesForEditingTarget(
  node: UiAuthoringDocumentNodeProjectionV3,
  target: UiResponsiveEditingTarget,
): Readonly<Record<string, UiAuthoringResponsiveValueProjection>> {
  const projected = Object.fromEntries(
    Object.entries(node.baseProperties).map(([propertyId, value]) => [
      propertyId,
      { value, provenance: { kind: 'base' as const } },
    ]),
  ) as Record<string, UiAuthoringResponsiveValueProjection>;
  if (target.kind === 'variant') {
    for (const [propertyId, value] of Object.entries(
      node.responsiveOverrides[target.variantId]?.properties ?? {},
    )) {
      projected[propertyId] = {
        value,
        provenance: { kind: 'responsive-override', variantId: target.variantId },
      };
    }
  }
  return projected;
}

export function layoutForEditingTarget(
  node: UiAuthoringDocumentNodeProjectionV3,
  target: UiResponsiveEditingTarget,
): UiAuthoringResponsiveLayoutProjection | undefined {
  const override =
    target.kind === 'variant' ? node.responsiveOverrides[target.variantId]?.layout : undefined;
  const layout = override ?? node.baseLayout;
  if (layout === undefined) return undefined;
  const provenance =
    override === undefined || target.kind === 'base'
      ? ({ kind: 'base' } as const)
      : ({ kind: 'responsive-override', variantId: target.variantId } as const);
  return {
    strategyId: layout.strategyId,
    values: Object.fromEntries(
      Object.entries(layout.values).map(([propertyId, value]) => [
        propertyId,
        { value, provenance },
      ]),
    ),
    provenance,
  };
}
