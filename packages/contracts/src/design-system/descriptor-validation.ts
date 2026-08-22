import {
  isUiBindingDirection,
  isUiChildSlotCardinality,
  type UiComponentDescriptor,
  type UiComponentRef,
} from '../ui-authoring/component-types';
import { uiComponentRefKey } from '../ui-authoring/component-validation';
import { isUiValueSourceKind, normalizeUiAllowedSources } from '../ui-authoring/validation';
import type { UiValueSourceKind } from '../ui-authoring/types';
import {
  type DesignSystemComponentRoleMapping,
  type DesignSystemComponentRoleRequirements,
  type DesignSystemDiagnostic,
  type DesignSystemPackDescriptor,
} from './types';

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalDesignSystemText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): boolean {
  const allowedKeys = new Set(allowed);
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowedKeys.has(key));
}

function diagnostic(
  descriptor: DesignSystemPackDescriptor,
  issue: Omit<DesignSystemDiagnostic, 'packId' | 'requestedVersion'>,
): DesignSystemDiagnostic {
  return {
    ...issue,
    packId: descriptor.ref?.id,
    requestedVersion: descriptor.ref?.version,
  };
}

function refKey(ref: UiComponentRef): string {
  return uiComponentRefKey(ref);
}

export function designSystemComponentRoleRefKey(ref: {
  readonly id: string;
  readonly version: string;
}): string {
  return JSON.stringify([ref.id, ref.version]);
}

function normalizedSources(sources?: readonly UiValueSourceKind[]): readonly UiValueSourceKind[] {
  return [...normalizeUiAllowedSources(sources)].sort();
}

export function designSystemComponentRoleRequirementsKey(
  requirements: DesignSystemComponentRoleRequirements,
): string {
  const byId = <T extends { readonly id: string }>(values: readonly T[] | undefined) =>
    [...(values ?? [])].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  return JSON.stringify({
    properties: byId(requirements.properties).map((property) => ({
      id: property.id,
      type: property.type,
      allowedSources: normalizedSources(property.allowedSources),
    })),
    events: byId(requirements.events).map((event) => ({
      id: event.id,
      ...(event.payloadType === undefined ? {} : { payloadType: event.payloadType }),
    })),
    bindings: byId(requirements.bindings).map((binding) => ({
      id: binding.id,
      direction: binding.direction,
      type: binding.type,
    })),
    childSlots: byId(requirements.childSlots).map((slot) => ({
      id: slot.id,
      cardinality: slot.cardinality,
    })),
    supportedStrategyIds: [...(requirements.supportedStrategyIds ?? [])].sort(),
    accessibilityRoles: [...(requirements.accessibilityRoles ?? [])].sort(),
  });
}

function invalidRole(
  descriptor: DesignSystemPackDescriptor,
  path: string,
  message: string,
  mapping?: Partial<DesignSystemComponentRoleMapping>,
): DesignSystemDiagnostic {
  return diagnostic(descriptor, {
    code: 'invalid-component-role',
    message,
    path,
    roleId: mapping?.role?.id,
    roleVersion: mapping?.role?.version,
    componentId: mapping?.component?.id,
    componentVersion: mapping?.component?.version,
  });
}

function validateRequirementList(
  descriptor: DesignSystemPackDescriptor,
  mapping: DesignSystemComponentRoleMapping,
  values: unknown,
  path: string,
  validate: (value: Readonly<Record<string, unknown>>) => boolean,
): readonly DesignSystemDiagnostic[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    return [invalidRole(descriptor, path, 'Component role requirement must be an array.', mapping)];
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainRecord(value) || !isCanonicalDesignSystemText(value.id) || !validate(value)) {
      diagnostics.push(
        invalidRole(
          descriptor,
          itemPath,
          'Component role requirement must declare a canonical supported capability.',
          mapping,
        ),
      );
      return;
    }
    if (seen.has(value.id)) {
      diagnostics.push(
        invalidRole(
          descriptor,
          itemPath,
          `Component role requirement id "${value.id}" must not be duplicated.`,
          mapping,
        ),
      );
      return;
    }
    seen.add(value.id);
  });
  return diagnostics;
}

function validateCanonicalStringList(
  descriptor: DesignSystemPackDescriptor,
  mapping: DesignSystemComponentRoleMapping,
  values: unknown,
  path: string,
): readonly DesignSystemDiagnostic[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    return [
      invalidRole(
        descriptor,
        path,
        'Component role string requirements must be an array.',
        mapping,
      ),
    ];
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!isCanonicalDesignSystemText(value)) {
      diagnostics.push(
        invalidRole(
          descriptor,
          `${path}[${index}]`,
          'Component role string requirement must be non-blank and already trimmed.',
          mapping,
        ),
      );
      return;
    }
    if (seen.has(value)) {
      diagnostics.push(
        invalidRole(
          descriptor,
          `${path}[${index}]`,
          `Component role string requirement "${value}" must not be duplicated.`,
          mapping,
        ),
      );
      return;
    }
    seen.add(value);
  });
  return diagnostics;
}

function validateRoleRequirements(
  descriptor: DesignSystemPackDescriptor,
  mapping: DesignSystemComponentRoleMapping,
  path: string,
): readonly DesignSystemDiagnostic[] {
  if (!isPlainRecord(mapping.requirements)) {
    return [
      invalidRole(
        descriptor,
        path,
        'Component role requirements must be a plain data object.',
        mapping,
      ),
    ];
  }
  const requirements = mapping.requirements as unknown as Readonly<Record<string, unknown>>;
  const diagnostics: DesignSystemDiagnostic[] = [
    ...validateRequirementList(
      descriptor,
      mapping,
      requirements.properties,
      `${path}.properties`,
      (value) => {
        if (!isCanonicalDesignSystemText(value.type)) return false;
        if (value.allowedSources === undefined) return true;
        return (
          Array.isArray(value.allowedSources) &&
          value.allowedSources.every((source) => isUiValueSourceKind(source))
        );
      },
    ),
    ...validateRequirementList(
      descriptor,
      mapping,
      requirements.events,
      `${path}.events`,
      (value) => value.payloadType === undefined || isCanonicalDesignSystemText(value.payloadType),
    ),
    ...validateRequirementList(
      descriptor,
      mapping,
      requirements.bindings,
      `${path}.bindings`,
      (value) => isUiBindingDirection(value.direction) && isCanonicalDesignSystemText(value.type),
    ),
    ...validateRequirementList(
      descriptor,
      mapping,
      requirements.childSlots,
      `${path}.childSlots`,
      (value) => isUiChildSlotCardinality(value.cardinality),
    ),
    ...validateCanonicalStringList(
      descriptor,
      mapping,
      requirements.supportedStrategyIds,
      `${path}.supportedStrategyIds`,
    ),
    ...validateCanonicalStringList(
      descriptor,
      mapping,
      requirements.accessibilityRoles,
      `${path}.accessibilityRoles`,
    ),
  ];
  const atomCount =
    (Array.isArray(requirements.properties) ? requirements.properties.length : 0) +
    (Array.isArray(requirements.events) ? requirements.events.length : 0) +
    (Array.isArray(requirements.bindings) ? requirements.bindings.length : 0) +
    (Array.isArray(requirements.childSlots) ? requirements.childSlots.length : 0) +
    (Array.isArray(requirements.supportedStrategyIds)
      ? requirements.supportedStrategyIds.length
      : 0) +
    (Array.isArray(requirements.accessibilityRoles) ? requirements.accessibilityRoles.length : 0);
  if (atomCount === 0) {
    diagnostics.push(
      invalidRole(
        descriptor,
        path,
        'Component role requirements must declare at least one capability.',
        mapping,
      ),
    );
  }
  return diagnostics;
}

function capabilityMismatch(
  descriptor: DesignSystemPackDescriptor,
  mapping: DesignSystemComponentRoleMapping,
  path: string,
  message: string,
): DesignSystemDiagnostic {
  return diagnostic(descriptor, {
    code: 'component-role-capability-mismatch',
    message,
    path,
    roleId: mapping.role.id,
    roleVersion: mapping.role.version,
    componentId: mapping.component.id,
    componentVersion: mapping.component.version,
  });
}

function validateComponentCapabilities(
  descriptor: DesignSystemPackDescriptor,
  mapping: DesignSystemComponentRoleMapping,
  component: UiComponentDescriptor,
  path: string,
): readonly DesignSystemDiagnostic[] {
  const diagnostics: DesignSystemDiagnostic[] = [];
  for (const required of mapping.requirements.properties ?? []) {
    const property = component.properties?.find((candidate) => candidate.id === required.id);
    const requiredSources = normalizeUiAllowedSources(required.allowedSources);
    const supportedSources = normalizeUiAllowedSources(property?.value.allowedSources);
    if (
      property === undefined ||
      property.value.type !== required.type ||
      requiredSources.some((source) => !supportedSources.includes(source))
    ) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.properties`,
          `Component does not satisfy required property capability "${required.id}".`,
        ),
      );
    }
  }
  for (const required of mapping.requirements.events ?? []) {
    const event = component.events?.find((candidate) => candidate.id === required.id);
    if (
      event === undefined ||
      (required.payloadType !== undefined && event.payload?.type !== required.payloadType)
    ) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.events`,
          `Component does not satisfy required event capability "${required.id}".`,
        ),
      );
    }
  }
  for (const required of mapping.requirements.bindings ?? []) {
    const binding = component.bindings?.find((candidate) => candidate.id === required.id);
    if (
      binding === undefined ||
      binding.direction !== required.direction ||
      binding.value.type !== required.type
    ) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.bindings`,
          `Component does not satisfy required binding capability "${required.id}".`,
        ),
      );
    }
  }
  for (const required of mapping.requirements.childSlots ?? []) {
    const slot = component.layout?.childSlots?.find((candidate) => candidate.id === required.id);
    if (slot === undefined || slot.cardinality !== required.cardinality) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.childSlots`,
          `Component does not satisfy required child-slot capability "${required.id}".`,
        ),
      );
    }
  }
  for (const strategyId of mapping.requirements.supportedStrategyIds ?? []) {
    if (!component.layout?.supportedStrategyIds?.includes(strategyId)) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.supportedStrategyIds`,
          `Component does not support required layout strategy "${strategyId}".`,
        ),
      );
    }
  }
  for (const role of mapping.requirements.accessibilityRoles ?? []) {
    if (!component.accessibility?.supportedRoles?.includes(role)) {
      diagnostics.push(
        capabilityMismatch(
          descriptor,
          mapping,
          `${path}.accessibilityRoles`,
          `Component does not support required accessibility role "${role}".`,
        ),
      );
    }
  }
  return diagnostics;
}

function validateTokenDescriptors(
  descriptor: DesignSystemPackDescriptor,
  path: string,
): readonly DesignSystemDiagnostic[] {
  if (descriptor.tokens === undefined) return [];
  if (!Array.isArray(descriptor.tokens)) {
    return [
      diagnostic(descriptor, {
        code: 'invalid-token-descriptor',
        message: 'Design System Pack tokens must be an array.',
        path,
      }),
    ];
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const seen = new Set<string>();
  descriptor.tokens.forEach((token, index) => {
    const tokenPath = `${path}[${index}]`;
    if (!isPlainRecord(token) || !isCanonicalDesignSystemText(token.id)) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'invalid-token-descriptor',
          message: 'Design System token descriptor requires a canonical id.',
          path: tokenPath,
          tokenId: isPlainRecord(token) && typeof token.id === 'string' ? token.id : undefined,
        }),
      );
      return;
    }
    if (seen.has(token.id)) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'duplicate-token-id',
          message: `Design System token id "${token.id}" must not be duplicated.`,
          path: `${tokenPath}.id`,
          tokenId: token.id,
        }),
      );
    }
    seen.add(token.id);
    if (
      !isPlainRecord(token.value) ||
      !isCanonicalDesignSystemText(token.value.type) ||
      Object.prototype.hasOwnProperty.call(token.value, 'defaultValue')
    ) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'invalid-token-descriptor',
          message: 'Design System token value must reuse UiValueSchema without defaultValue.',
          path: `${tokenPath}.value`,
          tokenId: token.id,
        }),
      );
      return;
    }
    const allowedSources = token.value.allowedSources;
    if (
      allowedSources !== undefined &&
      (!Array.isArray(allowedSources) ||
        allowedSources.some(
          (source) =>
            !isUiValueSourceKind(source) || source === 'binding' || source === 'expression',
        ))
    ) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'invalid-token-descriptor',
          message: 'Design System token sources may include only literal, token and resource.',
          path: `${tokenPath}.value.allowedSources`,
          tokenId: token.id,
        }),
      );
    }
  });
  return diagnostics;
}

function validateResourceDescriptors(
  descriptor: DesignSystemPackDescriptor,
  path: string,
): readonly DesignSystemDiagnostic[] {
  if (descriptor.resources === undefined) return [];
  if (!Array.isArray(descriptor.resources)) {
    return [
      diagnostic(descriptor, {
        code: 'invalid-resource-descriptor',
        message: 'Design System Pack resources must be an array.',
        path,
      }),
    ];
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const seen = new Set<string>();
  descriptor.resources.forEach((resource, index) => {
    const resourcePath = `${path}[${index}]`;
    if (!isPlainRecord(resource) || !isCanonicalDesignSystemText(resource.id)) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'invalid-resource-descriptor',
          message: 'Design System resource descriptor requires a canonical id.',
          path: resourcePath,
          resourceId:
            isPlainRecord(resource) && typeof resource.id === 'string' ? resource.id : undefined,
        }),
      );
      return;
    }
    if (seen.has(resource.id)) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'duplicate-resource-id',
          message: `Design System resource id "${resource.id}" must not be duplicated.`,
          path: `${resourcePath}.id`,
          resourceId: resource.id,
        }),
      );
    }
    seen.add(resource.id);
    if (
      !hasOnlyKeys(resource, ['id', 'value', 'mediaType', 'trust', 'loading']) ||
      !isPlainRecord(resource.value) ||
      !hasOnlyKeys(resource.value, ['type']) ||
      !isCanonicalDesignSystemText(resource.value.type) ||
      (resource.mediaType !== undefined && !isCanonicalDesignSystemText(resource.mediaType)) ||
      resource.trust !== 'authorized-pack' ||
      resource.loading !== 'renderer-resolved'
    ) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'invalid-resource-descriptor',
          message:
            'Design System resource requires a semantic type and authorized-pack/renderer-resolved requirements.',
          path: resourcePath,
          resourceId: resource.id,
        }),
      );
    }
  });
  return diagnostics;
}

function validateComponentRoles(
  descriptor: DesignSystemPackDescriptor,
  path: string,
): readonly DesignSystemDiagnostic[] {
  if (descriptor.componentRoles === undefined) return [];
  if (!Array.isArray(descriptor.componentRoles)) {
    return [invalidRole(descriptor, path, 'Design System componentRoles must be an array.')];
  }
  const diagnostics: DesignSystemDiagnostic[] = [];
  const mappingKeys = new Set<string>();
  const roleContracts = new Map<string, Map<string, number[]>>();
  const componentValues = Array.isArray(descriptor.components) ? descriptor.components : [];
  const components = new Map(
    componentValues.flatMap((component) =>
      isPlainRecord(component) &&
      isCanonicalDesignSystemText(component.id) &&
      isCanonicalDesignSystemText(component.version)
        ? [
            [
              refKey(component as unknown as UiComponentRef),
              component as unknown as UiComponentDescriptor,
            ] as const,
          ]
        : [],
    ),
  );

  descriptor.componentRoles.forEach((mapping, index) => {
    const mappingPath = `${path}[${index}]`;
    if (
      !isPlainRecord(mapping) ||
      !isPlainRecord(mapping.role) ||
      !isCanonicalDesignSystemText(mapping.role.id) ||
      !isCanonicalDesignSystemText(mapping.role.version) ||
      !isPlainRecord(mapping.component) ||
      !isCanonicalDesignSystemText(mapping.component.id) ||
      !isCanonicalDesignSystemText(mapping.component.version)
    ) {
      diagnostics.push(
        invalidRole(
          descriptor,
          mappingPath,
          'Component role mapping requires canonical role and component refs.',
          isPlainRecord(mapping)
            ? (mapping as unknown as Partial<DesignSystemComponentRoleMapping>)
            : undefined,
        ),
      );
      return;
    }

    const normalizedMapping = mapping as unknown as DesignSystemComponentRoleMapping;
    const requirementDiagnostics = validateRoleRequirements(
      descriptor,
      normalizedMapping,
      `${mappingPath}.requirements`,
    );
    diagnostics.push(...requirementDiagnostics);
    const mappingKey = JSON.stringify([
      designSystemComponentRoleRefKey(normalizedMapping.role),
      refKey(normalizedMapping.component),
    ]);
    if (mappingKeys.has(mappingKey)) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'duplicate-component-role-mapping',
          message: 'Exact role-to-component mapping must not be duplicated.',
          path: mappingPath,
          roleId: normalizedMapping.role.id,
          roleVersion: normalizedMapping.role.version,
          componentId: normalizedMapping.component.id,
          componentVersion: normalizedMapping.component.version,
        }),
      );
    }
    mappingKeys.add(mappingKey);

    const component = components.get(refKey(normalizedMapping.component));
    if (component === undefined) {
      diagnostics.push(
        diagnostic(descriptor, {
          code: 'component-role-target-not-found',
          message: 'Component role mapping must reference an exact component in the same Pack.',
          path: `${mappingPath}.component`,
          roleId: normalizedMapping.role.id,
          roleVersion: normalizedMapping.role.version,
          componentId: normalizedMapping.component.id,
          componentVersion: normalizedMapping.component.version,
        }),
      );
    } else if (requirementDiagnostics.length === 0) {
      diagnostics.push(
        ...validateComponentCapabilities(
          descriptor,
          normalizedMapping,
          component,
          `${mappingPath}.requirements`,
        ),
      );
    }

    if (requirementDiagnostics.length === 0) {
      const roleKey = designSystemComponentRoleRefKey(normalizedMapping.role);
      const contractKey = designSystemComponentRoleRequirementsKey(normalizedMapping.requirements);
      const contracts = roleContracts.get(roleKey) ?? new Map<string, number[]>();
      const indexes = contracts.get(contractKey) ?? [];
      indexes.push(index);
      contracts.set(contractKey, indexes);
      roleContracts.set(roleKey, contracts);
    }
  });

  for (const contracts of roleContracts.values()) {
    if (contracts.size < 2) continue;
    for (const indexes of contracts.values()) {
      for (const index of indexes) {
        const mapping = descriptor.componentRoles[index];
        diagnostics.push(
          diagnostic(descriptor, {
            code: 'conflicting-component-role-contract',
            message: 'One exact component role must use one normalized requirement contract.',
            path: `${path}[${index}].requirements`,
            roleId: mapping.role.id,
            roleVersion: mapping.role.version,
            componentId: mapping.component.id,
            componentVersion: mapping.component.version,
          }),
        );
      }
    }
  }
  return diagnostics;
}

export function validateDesignSystemDescriptorExtensions(
  descriptor: DesignSystemPackDescriptor,
  path = 'pack',
): readonly DesignSystemDiagnostic[] {
  return [
    ...validateTokenDescriptors(descriptor, `${path}.tokens`),
    ...validateResourceDescriptors(descriptor, `${path}.resources`),
    ...validateComponentRoles(descriptor, `${path}.componentRoles`),
  ];
}

export function isSameDesignSystemComponentRoleRequirements(
  left: DesignSystemComponentRoleRequirements,
  right: DesignSystemComponentRoleRequirements,
): boolean {
  return (
    designSystemComponentRoleRequirementsKey(left) ===
    designSystemComponentRoleRequirementsKey(right)
  );
}
