import type {
  UiLayoutPropertyDescriptor,
  UiLayoutPropertyGroup,
  UiLayoutPropertyScope,
  UiLayoutStrategyDescriptor,
} from './layout-types';
import {
  validateUiLayoutStrategyDescriptor,
  type UiLayoutValidationIssue,
} from './layout-validation';

export interface UiResolvedLayoutInspectorGroup<TLiteral = unknown> {
  readonly group: UiLayoutPropertyGroup;
  readonly properties: readonly UiLayoutPropertyDescriptor<TLiteral>[];
}

export interface UiLayoutInspectorGroupResolution<TLiteral = unknown> {
  readonly groups: readonly UiResolvedLayoutInspectorGroup<TLiteral>[];
  readonly issues: readonly UiLayoutValidationIssue[];
}

export function resolveUiLayoutInspectorGroups<TLiteral>(
  strategy: UiLayoutStrategyDescriptor,
  properties: readonly UiLayoutPropertyDescriptor<TLiteral>[],
  scope: UiLayoutPropertyScope,
): UiLayoutInspectorGroupResolution<TLiteral> {
  const issues = validateUiLayoutStrategyDescriptor(strategy, properties);
  if (issues.length > 0) {
    return { groups: Object.freeze([]), issues };
  }

  const byId = new Map(properties.map((property) => [property.id, property] as const));
  const supportedIds =
    scope === 'container'
      ? strategy.supportedContainerProperties
      : strategy.supportedChildProperties;
  const groups = new Map<UiLayoutPropertyGroup, UiLayoutPropertyDescriptor<TLiteral>[]>();

  supportedIds.forEach((id) => {
    const property = byId.get(id);
    if (property === undefined) return;
    const group = groups.get(property.group) ?? [];
    group.push(property);
    if (!groups.has(property.group)) groups.set(property.group, group);
  });

  return {
    groups: Object.freeze(
      [...groups].map(([group, groupedProperties]) => ({
        group,
        properties: Object.freeze(groupedProperties),
      })),
    ),
    issues,
  };
}
