import { isUiValueSourceKind, normalizeUiAllowedSources } from '../ui-authoring/validation';
import type { UiComponentDescriptor } from '../ui-authoring/component-types';
import type { NodeTypeDescriptor } from '../graph-authoring/types';
import type { AuthoringDevelopmentRequirement } from './types';

type PlainRecord = Readonly<Record<string, unknown>>;

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: PlainRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function optionalValueIs(
  record: PlainRecord,
  key: string,
  predicate: (value: unknown) => boolean,
): boolean {
  return !hasOwn(record, key) || predicate(record[key]);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isRef(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'version']) &&
    typeof value.id === 'string' &&
    typeof value.version === 'string'
  );
}

function isValueEditor(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'metadata']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'metadata', isRecord)
  );
}

function isValueSchema(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['type', 'defaultValue', 'constraints', 'editor', 'allowedSources']) &&
    typeof value.type === 'string' &&
    optionalValueIs(value, 'constraints', isRecord) &&
    optionalValueIs(value, 'editor', isValueEditor) &&
    optionalValueIs(
      value,
      'allowedSources',
      (entry) => Array.isArray(entry) && entry.every(isUiValueSourceKind),
    )
  );
}

function isProperty(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'label', 'description', 'required', 'value']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'label', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'required', (entry) => typeof entry === 'boolean') &&
    isValueSchema(value.value)
  );
}

function isEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'label', 'description', 'payload']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'label', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'payload', isValueSchema)
  );
}

function isBinding(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'label', 'description', 'direction', 'value']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'label', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    typeof value.direction === 'string' &&
    isValueSchema(value.value)
  );
}

function isChildSlot(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'cardinality', 'allowedComponents']) &&
    typeof value.id === 'string' &&
    typeof value.cardinality === 'string' &&
    optionalValueIs(
      value,
      'allowedComponents',
      (entry) => Array.isArray(entry) && entry.every(isRef),
    )
  );
}

function isLayout(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['childSlots', 'supportedStrategyIds', 'defaultStrategyId']) &&
    optionalValueIs(
      value,
      'childSlots',
      (entry) => Array.isArray(entry) && entry.every(isChildSlot),
    ) &&
    optionalValueIs(value, 'supportedStrategyIds', isStringArray) &&
    optionalValueIs(value, 'defaultStrategyId', (entry) => typeof entry === 'string')
  );
}

function isAccessibility(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'supportedRoles',
      'defaultRole',
      'accessibleNamePropertyId',
      'accessibleDescriptionPropertyId',
    ]) &&
    optionalValueIs(value, 'supportedRoles', isStringArray) &&
    optionalValueIs(value, 'defaultRole', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'accessibleNamePropertyId', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'accessibleDescriptionPropertyId', (entry) => typeof entry === 'string')
  );
}

function isDesignTime(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['label', 'description', 'category', 'icon', 'tags', 'hiddenFromPalette']) &&
    typeof value.label === 'string' &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'category', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'icon', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'tags', isStringArray) &&
    optionalValueIs(value, 'hiddenFromPalette', (entry) => typeof entry === 'boolean')
  );
}

export function isSupportedUiComponentDescriptorShape(
  value: unknown,
): value is UiComponentDescriptor {
  if (!isRecord(value) || (value.kind !== 'atomic' && value.kind !== 'composite')) return false;
  const allowedKeys = [
    'id',
    'version',
    'kind',
    'properties',
    'events',
    'bindings',
    'layout',
    'accessibility',
    'designTime',
    ...(value.kind === 'composite' ? ['compositionRef'] : []),
  ];
  return (
    hasOnlyKeys(value, allowedKeys) &&
    typeof value.id === 'string' &&
    typeof value.version === 'string' &&
    optionalValueIs(
      value,
      'properties',
      (entry) => Array.isArray(entry) && entry.every(isProperty),
    ) &&
    optionalValueIs(value, 'events', (entry) => Array.isArray(entry) && entry.every(isEvent)) &&
    optionalValueIs(value, 'bindings', (entry) => Array.isArray(entry) && entry.every(isBinding)) &&
    optionalValueIs(value, 'layout', isLayout) &&
    optionalValueIs(value, 'accessibility', isAccessibility) &&
    isDesignTime(value.designTime) &&
    (value.kind === 'atomic' || typeof value.compositionRef === 'string')
  );
}

function isNodeInput(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'label', 'description', 'required', 'value', 'propertyId']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'label', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'required', (entry) => typeof entry === 'boolean') &&
    optionalValueIs(value, 'value', isValueSchema) &&
    optionalValueIs(value, 'propertyId', (entry) => typeof entry === 'string')
  );
}

function isNodeOutput(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'label', 'description', 'value']) &&
    typeof value.id === 'string' &&
    optionalValueIs(value, 'label', (entry) => typeof entry === 'string') &&
    optionalValueIs(value, 'description', (entry) => typeof entry === 'string') &&
    isValueSchema(value.value)
  );
}

export function isSupportedNodeTypeDescriptorShape(value: unknown): value is NodeTypeDescriptor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'id',
      'version',
      'inputs',
      'outputs',
      'properties',
      'capabilities',
      'designTime',
    ]) &&
    typeof value.id === 'string' &&
    typeof value.version === 'string' &&
    Array.isArray(value.inputs) &&
    value.inputs.every(isNodeInput) &&
    Array.isArray(value.outputs) &&
    value.outputs.every(isNodeOutput) &&
    optionalValueIs(
      value,
      'properties',
      (entry) => Array.isArray(entry) && entry.every(isProperty),
    ) &&
    optionalValueIs(value, 'capabilities', isStringArray) &&
    isDesignTime(value.designTime)
  );
}

function canonical(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function collectOptionalText(
  record: PlainRecord,
  key: string,
  path: string,
  issues: string[],
): void {
  if (hasOwn(record, key) && !canonical(record[key])) issues.push(`${path}.${key}`);
}

function collectValueSchemaText(value: PlainRecord, path: string, issues: string[]): void {
  if (!canonical(value.type)) issues.push(`${path}.type`);
  if (hasOwn(value, 'allowedSources')) {
    (value.allowedSources as readonly unknown[]).forEach((entry, index) => {
      if (!canonical(entry)) issues.push(`${path}.allowedSources[${index}]`);
    });
  }
  if (hasOwn(value, 'editor')) {
    const editor = value.editor as PlainRecord;
    if (!canonical(editor.id)) issues.push(`${path}.editor.id`);
  }
}

function collectPropertyText(value: PlainRecord, path: string, issues: string[]): void {
  if (!canonical(value.id)) issues.push(`${path}.id`);
  collectOptionalText(value, 'label', path, issues);
  collectOptionalText(value, 'description', path, issues);
  collectValueSchemaText(value.value as PlainRecord, `${path}.value`, issues);
}

function collectDesignTimeText(value: PlainRecord, path: string, issues: string[]): void {
  if (!canonical(value.label)) issues.push(`${path}.label`);
  collectOptionalText(value, 'description', path, issues);
  collectOptionalText(value, 'category', path, issues);
  collectOptionalText(value, 'icon', path, issues);
  if (hasOwn(value, 'tags')) {
    (value.tags as readonly unknown[]).forEach((entry, index) => {
      if (!canonical(entry)) issues.push(`${path}.tags[${index}]`);
    });
  }
}

export function collectNoncanonicalComponentDescriptorText(
  descriptor: UiComponentDescriptor,
): readonly string[] {
  const record = descriptor as unknown as PlainRecord;
  const issues: string[] = [];
  if (!canonical(record.id)) issues.push('id');
  if (!canonical(record.version)) issues.push('version');
  if (record.kind === 'composite' && !canonical(record.compositionRef))
    issues.push('compositionRef');
  ((record.properties as readonly PlainRecord[] | undefined) ?? []).forEach((entry, index) =>
    collectPropertyText(entry, `properties[${index}]`, issues),
  );
  ((record.events as readonly PlainRecord[] | undefined) ?? []).forEach((entry, index) => {
    if (!canonical(entry.id)) issues.push(`events[${index}].id`);
    collectOptionalText(entry, 'label', `events[${index}]`, issues);
    collectOptionalText(entry, 'description', `events[${index}]`, issues);
    if (hasOwn(entry, 'payload')) {
      collectValueSchemaText(entry.payload as PlainRecord, `events[${index}].payload`, issues);
    }
  });
  ((record.bindings as readonly PlainRecord[] | undefined) ?? []).forEach((entry, index) => {
    if (!canonical(entry.id)) issues.push(`bindings[${index}].id`);
    if (!canonical(entry.direction)) issues.push(`bindings[${index}].direction`);
    collectOptionalText(entry, 'label', `bindings[${index}]`, issues);
    collectOptionalText(entry, 'description', `bindings[${index}]`, issues);
    collectValueSchemaText(entry.value as PlainRecord, `bindings[${index}].value`, issues);
  });
  const layout = record.layout as PlainRecord | undefined;
  if (layout !== undefined) {
    ((layout.childSlots as readonly PlainRecord[] | undefined) ?? []).forEach((entry, index) => {
      if (!canonical(entry.id)) issues.push(`layout.childSlots[${index}].id`);
      if (!canonical(entry.cardinality)) issues.push(`layout.childSlots[${index}].cardinality`);
      ((entry.allowedComponents as readonly PlainRecord[] | undefined) ?? []).forEach(
        (ref, refIndex) => {
          if (!canonical(ref.id)) {
            issues.push(`layout.childSlots[${index}].allowedComponents[${refIndex}].id`);
          }
          if (!canonical(ref.version)) {
            issues.push(`layout.childSlots[${index}].allowedComponents[${refIndex}].version`);
          }
        },
      );
    });
    ((layout.supportedStrategyIds as readonly unknown[] | undefined) ?? []).forEach(
      (entry, index) => {
        if (!canonical(entry)) issues.push(`layout.supportedStrategyIds[${index}]`);
      },
    );
    collectOptionalText(layout, 'defaultStrategyId', 'layout', issues);
  }
  const accessibility = record.accessibility as PlainRecord | undefined;
  if (accessibility !== undefined) {
    ((accessibility.supportedRoles as readonly unknown[] | undefined) ?? []).forEach(
      (entry, index) => {
        if (!canonical(entry)) issues.push(`accessibility.supportedRoles[${index}]`);
      },
    );
    collectOptionalText(accessibility, 'defaultRole', 'accessibility', issues);
    collectOptionalText(accessibility, 'accessibleNamePropertyId', 'accessibility', issues);
    collectOptionalText(accessibility, 'accessibleDescriptionPropertyId', 'accessibility', issues);
  }
  collectDesignTimeText(record.designTime as PlainRecord, 'designTime', issues);
  return issues;
}

export function collectNoncanonicalNodeTypeDescriptorText(
  descriptor: NodeTypeDescriptor,
): readonly string[] {
  const record = descriptor as unknown as PlainRecord;
  const issues: string[] = [];
  if (!canonical(record.id)) issues.push('id');
  if (!canonical(record.version)) issues.push('version');
  ((record.properties as readonly PlainRecord[] | undefined) ?? []).forEach((entry, index) =>
    collectPropertyText(entry, `properties[${index}]`, issues),
  );
  (record.inputs as readonly PlainRecord[]).forEach((entry, index) => {
    if (!canonical(entry.id)) issues.push(`inputs[${index}].id`);
    collectOptionalText(entry, 'label', `inputs[${index}]`, issues);
    collectOptionalText(entry, 'description', `inputs[${index}]`, issues);
    if (hasOwn(entry, 'propertyId') && !canonical(entry.propertyId)) {
      issues.push(`inputs[${index}].propertyId`);
    }
    if (hasOwn(entry, 'value')) {
      collectValueSchemaText(entry.value as PlainRecord, `inputs[${index}].value`, issues);
    }
  });
  (record.outputs as readonly PlainRecord[]).forEach((entry, index) => {
    if (!canonical(entry.id)) issues.push(`outputs[${index}].id`);
    collectOptionalText(entry, 'label', `outputs[${index}]`, issues);
    collectOptionalText(entry, 'description', `outputs[${index}]`, issues);
    collectValueSchemaText(entry.value as PlainRecord, `outputs[${index}].value`, issues);
  });
  ((record.capabilities as readonly unknown[] | undefined) ?? []).forEach((entry, index) => {
    if (!canonical(entry)) issues.push(`capabilities[${index}]`);
  });
  collectDesignTimeText(record.designTime as PlainRecord, 'designTime', issues);
  return issues;
}

function optionalProjection(
  record: PlainRecord,
  key: string,
  project: (value: unknown) => unknown = (value) => value,
): readonly [false] | readonly [true, unknown] {
  return hasOwn(record, key) ? ([true, project(record[key])] as const) : ([false] as const);
}

function sortedStrings(value: unknown): readonly string[] {
  return Object.freeze([...(value as readonly string[])].sort());
}

function valueSchemaProjection(value: unknown): unknown {
  const record = value as PlainRecord;
  return {
    type: record.type,
    defaultValue: optionalProjection(record, 'defaultValue'),
    constraints: optionalProjection(record, 'constraints'),
    editor: optionalProjection(record, 'editor', (editorValue) => {
      const editor = editorValue as PlainRecord;
      return {
        id: editor.id,
        metadata: optionalProjection(editor, 'metadata'),
      };
    }),
    allowedSources: sortedStrings(normalizeUiAllowedSources(record.allowedSources as never)),
  };
}

function propertyProjection(value: unknown): unknown {
  const record = value as PlainRecord;
  return {
    id: record.id,
    required: optionalProjection(record, 'required'),
    value: valueSchemaProjection(record.value),
  };
}

function optionalArrayProjection(
  record: PlainRecord,
  key: string,
  project: (value: unknown) => unknown,
): unknown {
  return optionalProjection(record, key, (value) => (value as readonly unknown[]).map(project));
}

function sortedRefs(value: unknown): readonly unknown[] {
  return Object.freeze(
    (value as readonly PlainRecord[])
      .map((ref) => ({ id: ref.id, version: ref.version }))
      .sort((left, right) => {
        const leftKey = JSON.stringify([left.id, left.version]);
        const rightKey = JSON.stringify([right.id, right.version]);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      }),
  );
}

function componentProjection(descriptor: UiComponentDescriptor): unknown {
  const record = descriptor as unknown as PlainRecord;
  return {
    id: record.id,
    version: record.version,
    kind: record.kind,
    properties: optionalArrayProjection(record, 'properties', propertyProjection),
    events: optionalArrayProjection(record, 'events', (value) => {
      const event = value as PlainRecord;
      return {
        id: event.id,
        payload: optionalProjection(event, 'payload', valueSchemaProjection),
      };
    }),
    bindings: optionalArrayProjection(record, 'bindings', (value) => {
      const binding = value as PlainRecord;
      return {
        id: binding.id,
        direction: binding.direction,
        value: valueSchemaProjection(binding.value),
      };
    }),
    layout: optionalProjection(record, 'layout', (value) => {
      const layout = value as PlainRecord;
      return {
        childSlots: optionalArrayProjection(layout, 'childSlots', (slotValue) => {
          const slot = slotValue as PlainRecord;
          return {
            id: slot.id,
            cardinality: slot.cardinality,
            allowedComponents: optionalProjection(slot, 'allowedComponents', sortedRefs),
          };
        }),
        supportedStrategyIds: optionalProjection(layout, 'supportedStrategyIds', sortedStrings),
        defaultStrategyId: optionalProjection(layout, 'defaultStrategyId'),
      };
    }),
    accessibility: optionalProjection(record, 'accessibility', (value) => {
      const accessibility = value as PlainRecord;
      return {
        supportedRoles: optionalProjection(accessibility, 'supportedRoles', sortedStrings),
        defaultRole: optionalProjection(accessibility, 'defaultRole'),
        accessibleNamePropertyId: optionalProjection(accessibility, 'accessibleNamePropertyId'),
        accessibleDescriptionPropertyId: optionalProjection(
          accessibility,
          'accessibleDescriptionPropertyId',
        ),
      };
    }),
    hiddenFromPalette: (record.designTime as PlainRecord).hiddenFromPalette === true,
  };
}

function nodeTypeProjection(descriptor: NodeTypeDescriptor): unknown {
  const record = descriptor as unknown as PlainRecord;
  return {
    id: record.id,
    version: record.version,
    properties: optionalArrayProjection(record, 'properties', propertyProjection),
    inputs: (record.inputs as readonly PlainRecord[]).map((input) => ({
      id: input.id,
      required: optionalProjection(input, 'required'),
      source: hasOwn(input, 'propertyId')
        ? { kind: 'property', propertyId: input.propertyId }
        : { kind: 'value', value: valueSchemaProjection(input.value) },
    })),
    outputs: (record.outputs as readonly PlainRecord[]).map((output) => ({
      id: output.id,
      value: valueSchemaProjection(output.value),
    })),
    capabilities: optionalProjection(record, 'capabilities', sortedStrings),
    hiddenFromPalette: (record.designTime as PlainRecord).hiddenFromPalette === true,
  };
}

export function areUiComponentDescriptorsSemanticallyEquivalent(
  left: UiComponentDescriptor,
  right: UiComponentDescriptor,
): boolean {
  return areAuthoringDevelopmentSnapshotsEqual(
    componentProjection(left),
    componentProjection(right),
  );
}

export function areNodeTypeDescriptorsSemanticallyEquivalent(
  left: NodeTypeDescriptor,
  right: NodeTypeDescriptor,
): boolean {
  return areAuthoringDevelopmentSnapshotsEqual(nodeTypeProjection(left), nodeTypeProjection(right));
}

export function areAuthoringDevelopmentSnapshotsEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => areAuthoringDevelopmentSnapshotsEqual(entry, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && areAuthoringDevelopmentSnapshotsEqual(left[key], right[key]),
    )
  );
}

export function areAuthoringDevelopmentRequirementsEqual(
  left: AuthoringDevelopmentRequirement,
  right: AuthoringDevelopmentRequirement,
): boolean {
  return areAuthoringDevelopmentSnapshotsEqual(left, right);
}
