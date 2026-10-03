import {
  isStructurallyValidUiValueSource,
  validateUiComponentDescriptor,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  validateUiPropertyDescriptor,
  type UiComponentRef,
  type UiPropertyDescriptor,
} from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { isGenericWidget } from '../widget/type-guards.js';
import {
  describeUiCompositionDefinition,
  resolveUiCompositionInstances,
  uiCompositionComponentRef,
  validateUiCompositionInstance,
  type UiCompositionParameterDescriptor,
  type UiCompositionResolution,
  type UiCompositionScalar,
} from './composition.js';
import { readUiDocumentNodeAuthoringV3, validateUiDocumentRootV3 } from './document-v3.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';
import { validateUiDocumentPropertySource } from './property-source-validation-v3.js';
import type { UiDocumentCommandV3AdmissionContext } from './semantic-admission-v3.js';
import type { UiDocumentNodeV3, UiDocumentV3 } from './types.js';

export type UiCollectionRepeatSourceNamespace = readonly [
  sourceId: string,
  connectionId: string | null,
  outputId: string,
];

export interface UiCollectionRepeatIdentity {
  readonly sourceNamespace: UiCollectionRepeatSourceNamespace;
  readonly consumerDocumentId: string;
  readonly containerNodeId: string;
  readonly recordId: string;
}

export interface UiCollectionRepeatRecord {
  readonly recordId: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface UiCollectionRepeatMapping {
  readonly parameterId: string;
  readonly source:
    | { readonly kind: 'field'; readonly fieldId: string }
    | { readonly kind: 'resource'; readonly role: string };
  readonly fallback: 'template-default';
}

export interface UiCollectionRepeatOverride {
  readonly sourceNamespace: UiCollectionRepeatSourceNamespace;
  readonly recordId: string;
  readonly template: { readonly documentId: string; readonly interfaceVersion: string };
  readonly values: Readonly<Record<string, UiCompositionScalar>>;
}

export interface UiCollectionRepeatResource {
  readonly recordId: string;
  readonly role: string;
  readonly resourceKey: string;
}

export interface UiCollectionRepeatSourceSchema {
  readonly schemaRevision: string;
  readonly fields: readonly UiPropertyDescriptor[];
  readonly identityFieldIds: readonly string[];
}

export interface UiCollectionRepeatTarget {
  readonly containerNodeId: string;
  readonly sourceNamespace: UiCollectionRepeatSourceNamespace;
  readonly sourceSchema: UiCollectionRepeatSourceSchema;
  readonly expectedSchemaRevision: string;
  readonly records: readonly UiCollectionRepeatRecord[];
  readonly template: { readonly documentId: string; readonly interfaceVersion: string };
  readonly mappings: readonly UiCollectionRepeatMapping[];
  readonly overrides: readonly UiCollectionRepeatOverride[];
  readonly resources: readonly UiCollectionRepeatResource[];
  readonly instanceLayout: NonNullable<UiDocumentNodeV3['$authoring']['layout']>;
  readonly generation: string;
  readonly page: { readonly index: number; readonly size: number };
}

export interface UiCollectionRepeatInput {
  readonly document: UiDocumentV3;
  readonly generation: string;
  readonly targets: readonly UiCollectionRepeatTarget[];
}

export interface UiCollectionResourceTargetPolicyInput {
  readonly definitionDocumentId: string;
  readonly definitionNodeId: string;
  readonly component: UiComponentRef;
  readonly property: UiPropertyDescriptor;
  readonly parameterId: string;
  readonly role: string;
}

export interface UiCollectionRepeatResourceTarget {
  readonly generation: string;
  readonly instanceNodeId: string;
  readonly projectedNodeId: string;
  readonly definitionDocumentId: string;
  readonly definitionNodeId: string;
  readonly propertyId: string;
  readonly resourceKey: string;
}

export interface UiCollectionRepeatDiagnostic {
  readonly code:
    | 'invalid-record'
    | 'duplicate-record-id'
    | 'invalid-identity'
    | 'identity-collision'
    | 'snapshot-limit'
    | 'template-unavailable'
    | 'template-interface-mismatch'
    | 'template-limit'
    | 'mapping-unavailable'
    | 'mapping-type-mismatch'
    | 'mapping-value-invalid'
    | 'resource-target-denied'
    | 'resource-unavailable'
    | 'override-invalid'
    | 'nonempty-container'
    | 'invalid-page'
    | 'source-schema-mismatch'
    | 'duplicate-mapping'
    | 'duplicate-override'
    | 'duplicate-resource'
    | 'dangling-resource'
    | 'duplicate-container'
    | 'nested-repeat-target'
    | 'invalid-instance-layout';
  readonly message: string;
  readonly recordId?: string;
  readonly parameterId?: string;
  readonly nodeId?: string;
}

interface RepeatResultFields {
  readonly generation: string;
  readonly repeatProvenance: Readonly<Record<string, UiCollectionRepeatIdentity>>;
  /** Current template and mapped scalar values, before item overrides; never presentation URLs. */
  readonly baseParameterValues: Readonly<
    Record<string, Readonly<Record<string, UiCompositionScalar>>>
  >;
  readonly resourceTargets: readonly UiCollectionRepeatResourceTarget[];
  readonly diagnostics: readonly UiCollectionRepeatDiagnostic[];
  readonly pages: readonly {
    readonly containerNodeId: string;
    readonly generation: string;
    readonly totalCount: number;
    readonly pageIndex: number;
    readonly effectivePageSize: number;
  }[];
}

export type UiCollectionRepeatResult = RepeatResultFields &
  (
    | {
        readonly status: 'ready';
        readonly root: GenericWidget;
        readonly composition: UiCompositionResolution;
      }
    | { readonly status: 'invalid'; readonly root: null; readonly composition: null }
  );

const MAX_RECORDS = 10_000;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_STRING_BYTES = 16 * 1024;
const MAX_NODES = 2_000;
const RESERVED_DATA_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const encoder = new TextEncoder();
type Code = UiCollectionRepeatDiagnostic['code'];

class RepeatFailure extends Error {
  constructor(readonly diagnostic: UiCollectionRepeatDiagnostic) {
    super(diagnostic.message);
  }
}

function reject(
  code: Code,
  message: string,
  details: Omit<UiCollectionRepeatDiagnostic, 'code' | 'message'> = {},
): never {
  throw new RepeatFailure({ code, message, ...details });
}

function validUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function utf8Size(value: string): number {
  if (!validUnicode(value)) reject('invalid-record', 'Text contains malformed UTF-16.');
  return encoder.encode(value).length;
}

/** Descriptor-only bounded capture: no getter, serializer, or caller object is executed. */
function capture<T>(input: T, maxBytes = MAX_BYTES * 4): T {
  let bytes = 0;
  let entries = 0;
  const ancestors = new Set<object>();
  const add = (count: number) => {
    bytes += count;
    if (bytes > maxBytes)
      reject('snapshot-limit', 'The captured snapshot exceeds its byte budget.');
  };
  const visit = (value: unknown, depth: number): unknown => {
    if (++entries > 1_000_000 || depth > 256)
      reject('snapshot-limit', 'The captured snapshot exceeds its structural budget.');
    if (value === null) {
      add(4);
      return value;
    }
    if (typeof value === 'boolean') {
      add(5);
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      add(24);
      return value;
    }
    if (typeof value === 'string') {
      if (value.length > maxBytes)
        reject('snapshot-limit', 'The captured snapshot exceeds its byte budget.');
      add(utf8Size(value) + 2);
      return value;
    }
    if (typeof value !== 'object' || value === null || ancestors.has(value))
      reject('invalid-record', 'Snapshot values must be acyclic plain JSON data.');
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null
    )
      reject('invalid-record', 'Snapshot values must have plain prototypes.');
    const keys = Reflect.ownKeys(value);
    const length = array ? (Object.getOwnPropertyDescriptor(value, 'length')?.value as number) : 0;
    if (array && (keys.length !== length + 1 || length > 1_000_000))
      reject('invalid-record', 'Snapshot arrays must be dense and bounded.');
    ancestors.add(value);
    const copied: [string, unknown][] = [];
    add(2);
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || !validUnicode(key) || RESERVED_DATA_KEYS.has(key))
        reject('invalid-record', 'Snapshot contains an unsafe property key.');
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length))
        reject('invalid-record', 'Snapshot arrays cannot have extra properties.');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
        reject('invalid-record', 'Snapshot accessors and hidden properties are forbidden.');
      add(utf8Size(key) + 4);
      copied.push([key, visit(descriptor.value, depth + 1)]);
    }
    ancestors.delete(value);
    return array ? copied.map(([, value]) => value) : Object.fromEntries(copied);
  };
  return visit(input, 0) as T;
}

function object<T>(value: T): value is T & Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact<T>(
  value: T,
  keys: readonly string[],
  code: Code,
): asserts value is T & Record<string, unknown> {
  if (
    !object(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    reject(code, 'The captured record has an invalid shape.');
}

function textId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && validUnicode(value);
}

function identityPart(value: unknown): asserts value is string {
  if (!textId(value) || utf8Size(value) > 256)
    reject(
      'invalid-identity',
      'Identity components must be nonempty well-formed text of at most 256 UTF-8 bytes.',
    );
}

function namespace(value: unknown): asserts value is UiCollectionRepeatSourceNamespace {
  if (!Array.isArray(value) || value.length !== 3)
    reject('invalid-identity', 'The source namespace must be an exact three-part tuple.');
  identityPart(value[0]);
  if (value[1] !== null) identityPart(value[1]);
  identityPart(value[2]);
}

function checkIdentity(identity: UiCollectionRepeatIdentity): void {
  namespace(identity.sourceNamespace);
  identityPart(identity.consumerDocumentId);
  identityPart(identity.containerNodeId);
  identityPart(identity.recordId);
  const parts = [
    ...identity.sourceNamespace,
    identity.consumerDocumentId,
    identity.containerNodeId,
    identity.recordId,
  ];
  if (parts.reduce<number>((sum, part) => sum + (part === null ? 0 : utf8Size(part)), 0) > 1024)
    reject('invalid-identity', 'The complete identity exceeds 1 KiB.');
}

function instanceId(identity: UiCollectionRepeatIdentity): string {
  const bytes = encoder.encode(
    JSON.stringify([
      ...identity.sourceNamespace,
      identity.consumerDocumentId,
      identity.containerNodeId,
      identity.recordId,
    ]),
  );
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    encoded += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    if (b !== undefined) encoded += alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    if (c !== undefined) encoded += alphabet[c & 63]!;
  }
  return `ui-repeat:${encoded}`;
}

function checkTemplate(value: unknown): asserts value is UiCollectionRepeatTarget['template'] {
  exact(value, ['documentId', 'interfaceVersion'], 'template-unavailable');
  if (
    !textId(value.documentId) ||
    !textId(value.interfaceVersion) ||
    value.documentId !== value.documentId.trim() ||
    value.interfaceVersion !== value.interfaceVersion.trim()
  )
    reject('template-unavailable', 'An exact canonical template reference is required.');
}

function scalar(value: unknown): value is UiCompositionScalar {
  return (
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && utf8Size(value) <= MAX_STRING_BYTES)
  );
}

function stringBounds(value: unknown): void {
  if (typeof value === 'string' && utf8Size(value) > MAX_STRING_BYTES)
    reject('snapshot-limit', 'A selected scalar string exceeds 16 KiB.');
  if (Array.isArray(value)) value.forEach(stringBounds);
  else if (object(value)) Object.values(value).forEach(stringBounds);
}

/** Count JSON escaping incrementally before allocating a serialized snapshot. */
function serializedBytes(value: unknown): number {
  let bytes = 0;
  const add = (count: number) => {
    bytes += count;
    if (bytes > MAX_BYTES)
      reject(
        'snapshot-limit',
        'Selected fields and retained overrides each permit at most 8 MiB of UTF-8 JSON.',
      );
  };
  const string = (text: string) => {
    add(2);
    for (let index = 0; index < text.length; index += 1) {
      const point = text.codePointAt(index)!;
      if (point === 34 || point === 92 || [8, 9, 10, 12, 13].includes(point)) add(2);
      else if (point < 32) add(6);
      else if (point < 128) add(1);
      else if (point < 2048) add(2);
      else if (point <= 65535) add(3);
      else {
        add(4);
        index += 1;
      }
    }
  };
  const visit = (entry: unknown): void => {
    if (typeof entry === 'string') string(entry);
    else if (entry === null) add(4);
    else if (typeof entry === 'boolean') add(entry ? 4 : 5);
    else if (typeof entry === 'number') add(String(entry).length);
    else if (Array.isArray(entry)) {
      add(2 + Math.max(0, entry.length - 1));
      entry.forEach(visit);
    } else if (object(entry)) {
      const entries = Object.entries(entry);
      add(2 + Math.max(0, entries.length - 1));
      for (const [key, child] of entries) {
        string(key);
        add(1);
        visit(child);
      }
    }
  };
  visit(value);
  return bytes;
}

function enumValues(property: UiPropertyDescriptor): readonly string[] | null {
  const constraints = property.value.constraints;
  const values = constraints?.values;
  const options = constraints?.options;
  if (
    Array.isArray(values) &&
    options === undefined &&
    values.length > 0 &&
    values.every(textId) &&
    new Set(values).size === values.length
  )
    return values;
  if (
    Array.isArray(options) &&
    values === undefined &&
    options.length > 0 &&
    options.every((option) => object(option) && textId(option.value))
  ) {
    const result = options.map((option) => (option as { value: string }).value);
    if (new Set(result).size === result.length) return result;
  }
  return null;
}

function compatible(source: UiPropertyDescriptor, target: UiPropertyDescriptor): boolean {
  const sourceType = source.value.type === 'enum' ? 'string' : source.value.type;
  const targetType = target.value.type === 'enum' ? 'string' : target.value.type;
  return ['string', 'number', 'boolean'].includes(sourceType) && sourceType === targetType;
}

function validSourceValue(field: UiPropertyDescriptor, value: unknown): boolean {
  if (!scalar(value)) return false;
  if (field.value.type === 'enum')
    return typeof value === 'string' && enumValues(field)?.includes(value) === true;
  if (typeof value !== field.value.type) return false;
  const component = {
    id: 'collection-field',
    version: '1',
    kind: 'atomic' as const,
    properties: [field],
    designTime: { label: 'Collection field' },
  };
  return (
    validateUiDocumentPropertySource(
      component,
      'collection-field',
      field,
      { kind: 'literal', value },
      undefined,
      'composition-target',
    ) === null
  );
}

function validTargetValue(
  parameter: UiCompositionParameterDescriptor,
  value: unknown,
  context: UiDocumentCommandV3AdmissionContext,
): value is UiCompositionScalar {
  if (!scalar(value)) return false;
  if (
    parameter.property.value.type === 'enum' &&
    enumValues(parameter.property)?.includes(String(value)) !== true
  )
    return false;
  return (
    validateUiDocumentPropertySource(
      parameter.component,
      parameter.target.nodeId,
      parameter.property,
      { kind: 'literal', value },
      context.validateLiteral,
      'composition-target',
    ) === null
  );
}

function checkLayout(
  layout: UiCollectionRepeatTarget['instanceLayout'],
  context: UiDocumentCommandV3AdmissionContext,
): void {
  exact(layout, ['strategyId', 'values'], 'invalid-instance-layout');
  if (!textId(layout.strategyId) || !object(layout.values))
    reject('invalid-instance-layout', 'A declared instance layout is required.');
  const strategies = context.layoutStrategies.filter(
    (strategy) => strategy.id === layout.strategyId && strategy.kind === 'canvas',
  );
  const strategy = strategies.length === 1 ? strategies[0] : undefined;
  if (
    !strategy ||
    validateUiLayoutStrategyDescriptor(strategy, context.layoutProperties).length > 0
  )
    reject('invalid-instance-layout', 'The instance canvas strategy is unavailable.');
  for (const [id, value] of Object.entries(layout.values)) {
    const properties = context.layoutProperties.filter(
      (property) =>
        property.id === id &&
        property.scope === 'child' &&
        property.strategyKinds.includes(strategy.kind),
    );
    const property = properties.length === 1 ? properties[0] : undefined;
    if (
      !property ||
      !strategy.supportedChildProperties.includes(id) ||
      !isStructurallyValidUiValueSource(value) ||
      validateUiLayoutPropertyValue(property, value).length > 0
    )
      reject('invalid-instance-layout', 'The instance layout property is unavailable or invalid.');
  }
}

interface ResourcePlan {
  readonly generation: string;
  readonly instanceNodeId: string;
  readonly definitionDocumentId: string;
  readonly definitionNodeId: string;
  readonly propertyId: string;
  readonly resourceKey: string;
}

interface PreparedTarget {
  readonly target: UiCollectionRepeatTarget;
  readonly parameters: readonly UiCompositionParameterDescriptor[];
  readonly fields: ReadonlyMap<string, UiPropertyDescriptor>;
  readonly activeOverrides: ReadonlyMap<string, UiCollectionRepeatOverride>;
  readonly resources: ReadonlyMap<string, UiCollectionRepeatResource>;
  readonly pageIndex: number;
  readonly effectivePageSize: number;
  readonly templateNodes: number;
}

function resourceTuple(recordId: string, role: string): string {
  return JSON.stringify([recordId, role]);
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function prepareTarget(
  target: UiCollectionRepeatTarget,
  document: UiDocumentV3,
  context: UiDocumentCommandV3AdmissionContext,
  resourceTargetPolicy: (input: UiCollectionResourceTargetPolicyInput) => boolean,
  resourceOwners: Map<string, string>,
): PreparedTarget {
  exact(
    target,
    [
      'containerNodeId',
      'sourceNamespace',
      'sourceSchema',
      'expectedSchemaRevision',
      'records',
      'template',
      'mappings',
      'overrides',
      'resources',
      'instanceLayout',
      'generation',
      'page',
    ],
    'invalid-record',
  );
  namespace(target.sourceNamespace);
  identityPart(target.containerNodeId);
  if (!textId(target.generation)) reject('invalid-record', 'A target generation is required.');
  if (
    !Array.isArray(target.records) ||
    !Array.isArray(target.mappings) ||
    !Array.isArray(target.overrides) ||
    !Array.isArray(target.resources)
  )
    reject('invalid-record', 'Repeat records, mappings, overrides, and resources must be arrays.');
  if (target.records.length > MAX_RECORDS || target.overrides.length > MAX_RECORDS)
    reject('snapshot-limit', 'Records and retained overrides are limited to 10,000 each.');
  if (target.mappings.length > 32)
    reject('snapshot-limit', 'A repeat target permits at most 32 mappings.');
  exact(
    target.sourceSchema,
    ['schemaRevision', 'fields', 'identityFieldIds'],
    'source-schema-mismatch',
  );
  const schema = target.sourceSchema;
  if (
    !textId(schema.schemaRevision) ||
    schema.schemaRevision !== target.expectedSchemaRevision ||
    !Array.isArray(schema.fields) ||
    !Array.isArray(schema.identityFieldIds) ||
    schema.identityFieldIds.length === 0
  )
    reject(
      'source-schema-mismatch',
      'The exact source schema and declared identities are required.',
    );
  const fields = new Map<string, UiPropertyDescriptor>();
  for (const field of schema.fields) {
    if (
      !object(field) ||
      !textId(field.id) ||
      !object(field.value) ||
      !textId(field.value.type) ||
      fields.has(field.id) ||
      validateUiPropertyDescriptor(field).length > 0 ||
      (field.value.type === 'enum' && enumValues(field) === null)
    )
      reject(
        'source-schema-mismatch',
        'Source fields must have unique valid descriptors and bounded enum vocabularies.',
      );
    fields.set(field.id, field);
  }
  if (
    new Set(schema.identityFieldIds).size !== schema.identityFieldIds.length ||
    schema.identityFieldIds.some((id) => !textId(id) || !fields.has(id))
  )
    reject(
      'source-schema-mismatch',
      'Every identity field must occur exactly once in the source schema.',
    );
  const recordIds = new Set<string>();
  for (const record of target.records) {
    exact(record, ['recordId', 'values'], 'invalid-record');
    checkIdentity({
      sourceNamespace: target.sourceNamespace,
      consumerDocumentId: document.documentId,
      containerNodeId: target.containerNodeId,
      recordId: record.recordId,
    });
    if (recordIds.has(record.recordId))
      reject(
        'duplicate-record-id',
        'Record identities must be unique across the entire snapshot.',
        { recordId: record.recordId },
      );
    recordIds.add(record.recordId);
    if (!object(record.values) || Object.keys(record.values).some((id) => !fields.has(id)))
      reject('invalid-record', 'Record values must be a plain map of declared source fields.', {
        recordId: record.recordId,
      });
    stringBounds(record.values);
    if (
      schema.identityFieldIds.some(
        (id) =>
          !Object.prototype.hasOwnProperty.call(record.values, id) ||
          !validSourceValue(fields.get(id)!, record.values[id]),
      )
    )
      reject('invalid-identity', 'Every record requires valid declared identity fields.', {
        recordId: record.recordId,
      });
  }
  if (
    serializedBytes(target.records.map((record) => record.values)) > MAX_BYTES ||
    serializedBytes(target.overrides) > MAX_BYTES
  )
    reject(
      'snapshot-limit',
      'Selected fields and retained overrides each permit at most 8 MiB of UTF-8 JSON.',
    );
  checkTemplate(target.template);
  const definitions =
    context.compositionDefinitions?.filter(
      (entry) => entry.document.documentId === target.template.documentId,
    ) ?? [];
  const definition = definitions.length === 1 ? definitions[0] : undefined;
  if (!definition || !/^[a-f0-9]{64}$/.test(definition.sourceHash))
    reject('template-unavailable', 'The exact canonical template source is unavailable.');
  const declaration = readUiDocumentNodeAuthoringV3(
    definition.document.root,
  )?.compositionDefinition;
  if (declaration && declaration.interfaceVersion !== target.template.interfaceVersion)
    reject('template-interface-mismatch', 'The template interface no longer matches the binding.');
  const templateNodes = collectWidgetNodes(definition.document.root).length;
  if (templateNodes > 256)
    reject('template-limit', 'A repeated definition permits at most 256 nodes.');
  const description = describeUiCompositionDefinition(definition.document, context);
  if (!description.descriptor)
    reject('template-unavailable', 'The requested template is unavailable or invalid.');
  if (description.parameters.some((parameter) => RESERVED_DATA_KEYS.has(parameter.id)))
    reject(
      'template-unavailable',
      'Exposed parameter identifiers cannot use reserved data-map keys.',
    );
  const parameters = new Map(description.parameters.map((parameter) => [parameter.id, parameter]));
  const mappingIds = new Set<string>();
  for (const mapping of target.mappings) {
    exact(mapping, ['parameterId', 'source', 'fallback'], 'mapping-unavailable');
    if (RESERVED_DATA_KEYS.has(mapping.parameterId))
      reject(
        'mapping-unavailable',
        'Mapped parameter identifiers cannot use reserved data-map keys.',
      );
    if (mappingIds.has(mapping.parameterId))
      reject('duplicate-mapping', 'A template parameter can be mapped only once.', {
        parameterId: mapping.parameterId,
      });
    mappingIds.add(mapping.parameterId);
    const parameter = parameters.get(mapping.parameterId);
    if (!parameter || mapping.fallback !== 'template-default' || !object(mapping.source))
      reject(
        'mapping-unavailable',
        'A mapping must select an exposed parameter and explicit template fallback.',
      );
    if (mapping.source.kind === 'field') {
      exact(mapping.source, ['kind', 'fieldId'], 'mapping-unavailable');
      const field = fields.get(mapping.source.fieldId);
      if (!field)
        reject('mapping-unavailable', 'The mapped source field is unavailable.', {
          parameterId: parameter.id,
        });
      // Managed-asset references cannot be supplied through ordinary scalar data.
      if (parameter.property.id === 'assetRef' || !compatible(field, parameter.property))
        reject('mapping-type-mismatch', 'Source and target scalar descriptors are incompatible.', {
          parameterId: parameter.id,
        });
    } else if (mapping.source.kind === 'resource') {
      exact(mapping.source, ['kind', 'role'], 'mapping-unavailable');
      if (!textId(mapping.source.role))
        reject('mapping-unavailable', 'A resource mapping requires an opaque role.');
      let allowed = false;
      try {
        allowed =
          resourceTargetPolicy(
            deepFreezeUiAuthoringValue({
              definitionDocumentId: target.template.documentId,
              definitionNodeId: parameter.target.nodeId,
              component: { id: parameter.component.id, version: parameter.component.version },
              property: parameter.property,
              parameterId: parameter.id,
              role: mapping.source.role,
            }),
          ) === true;
      } catch {
        /* A throwing policy denies the resource target. */
      }
      if (!allowed)
        reject(
          'resource-target-denied',
          'The host did not admit this exact exposed resource target.',
          { parameterId: parameter.id },
        );
    } else reject('mapping-unavailable', 'Unknown mapping source kind.');
  }
  const activeOverrides = new Map<string, UiCollectionRepeatOverride>();
  const overrideTuples = new Set<string>();
  for (const override of target.overrides) {
    exact(override, ['sourceNamespace', 'recordId', 'template', 'values'], 'override-invalid');
    namespace(override.sourceNamespace);
    identityPart(override.recordId);
    checkTemplate(override.template);
    if (
      !object(override.values) ||
      Object.entries(override.values).some(([id, value]) => !textId(id) || !scalar(value))
    )
      reject('override-invalid', 'Retained overrides must contain only bounded scalar values.');
    const tuple = JSON.stringify([
      override.sourceNamespace,
      override.recordId,
      override.template.documentId,
      override.template.interfaceVersion,
    ]);
    if (overrideTuples.has(tuple))
      reject('duplicate-override', 'An override tuple can occur only once.');
    overrideTuples.add(tuple);
    // Dormant source/template overrides are preserved by the host and never executed here.
    if (
      !recordIds.has(override.recordId) ||
      !same(override.sourceNamespace, target.sourceNamespace) ||
      override.template.documentId !== target.template.documentId ||
      override.template.interfaceVersion !== target.template.interfaceVersion
    )
      continue;
    for (const [id, value] of Object.entries(override.values)) {
      const parameter = parameters.get(id);
      if (!parameter || !validTargetValue(parameter, value, context))
        reject(
          'override-invalid',
          'An active override is unavailable or violates the target literal policy.',
          { recordId: override.recordId, parameterId: id },
        );
    }
    activeOverrides.set(override.recordId, override);
  }
  const resources = new Map<string, UiCollectionRepeatResource>();
  for (const resource of target.resources) {
    exact(resource, ['recordId', 'role', 'resourceKey'], 'resource-unavailable');
    identityPart(resource.recordId);
    if (
      !textId(resource.role) ||
      !textId(resource.resourceKey) ||
      /\s|:\/\/|^(?:data|blob|file|javascript):|^\/\//i.test(resource.resourceKey)
    )
      reject('resource-unavailable', 'Resources require opaque keys, never presentation URLs.');
    if (!recordIds.has(resource.recordId))
      reject(
        'dangling-resource',
        'A resource must belong to a record in this same captured snapshot.',
      );
    const tuple = resourceTuple(resource.recordId, resource.role);
    if (resources.has(tuple))
      reject('duplicate-resource', 'A record and resource role can occur only once.');
    const owner = JSON.stringify([target.sourceNamespace, resource.recordId, resource.role]);
    if (
      resourceOwners.has(resource.resourceKey) &&
      resourceOwners.get(resource.resourceKey) !== owner
    )
      reject(
        'duplicate-resource',
        'An opaque resource key cannot identify different source records or roles.',
      );
    resourceOwners.set(resource.resourceKey, owner);
    resources.set(tuple, resource);
  }
  checkLayout(target.instanceLayout, context);
  exact(target.page, ['index', 'size'], 'invalid-page');
  if (
    !Number.isSafeInteger(target.page.index) ||
    target.page.index < 0 ||
    ![20, 50, 100, 200].includes(target.page.size)
  )
    reject(
      'invalid-page',
      'Page index must be a nonnegative safe integer and size must be 20, 50, 100, or 200.',
    );
  const effectivePageSize = Math.min(
    target.page.size,
    200,
    Math.floor(MAX_NODES / (templateNodes + 1)),
  );
  const pageIndex = Math.min(
    target.page.index,
    Math.max(0, Math.ceil(target.records.length / effectivePageSize) - 1),
  );
  return {
    target,
    parameters: description.parameters,
    fields,
    activeOverrides,
    resources,
    pageIndex,
    effectivePageSize,
    templateNodes,
  };
}

/** Pure, atomic batch projection. The returned root is ephemeral and is never a save document. */
export function projectUiCollectionInstances(
  input: UiCollectionRepeatInput,
  context: UiDocumentCommandV3AdmissionContext,
  resourceTargetPolicy: (input: UiCollectionResourceTargetPolicyInput) => boolean,
): UiCollectionRepeatResult {
  let generation = '';
  const diagnostics: UiCollectionRepeatDiagnostic[] = [];
  try {
    // Preserve a safe generation even when a later data member fails capture.
    const generationDescriptor =
      typeof input === 'object' && input !== null
        ? Object.getOwnPropertyDescriptor(input, 'generation')
        : undefined;
    if (
      generationDescriptor &&
      'value' in generationDescriptor &&
      textId(generationDescriptor.value)
    )
      generation = generationDescriptor.value;
    const snapshot = deepFreezeUiAuthoringValue(capture(input));
    exact(snapshot, ['document', 'generation', 'targets'], 'invalid-record');
    if (!textId(snapshot.generation) || !Array.isArray(snapshot.targets))
      reject('invalid-record', 'A batch generation and target array are required.');
    generation = snapshot.generation;
    const document = snapshot.document;
    if (
      !object(document) ||
      !textId(document.documentId) ||
      validateUiDocumentRootV3(document.root).length > 0 ||
      formatWidgetDocumentJson(document.root) !== document.source
    )
      reject('invalid-record', 'The consumer must be a canonical authored document.');
    identityPart(document.documentId);
    const nodes = collectWidgetNodes(document.root);
    if (nodes.length > MAX_NODES)
      reject('snapshot-limit', 'The authored tree already exceeds 2,000 nodes.');
    const nodeById = new Map(nodes.map((entry) => [entry.widget.id, entry]));
    const targetIds = new Set<string>();
    for (const target of snapshot.targets) {
      if (!object(target)) reject('invalid-record', 'Repeat targets must be plain records.');
      identityPart(target.containerNodeId);
      if (targetIds.has(target.containerNodeId))
        reject('duplicate-container', 'A container can be repeated only once per batch.', {
          nodeId: target.containerNodeId,
        });
      targetIds.add(target.containerNodeId);
    }
    for (const target of snapshot.targets) {
      const entry = nodeById.get(target.containerNodeId);
      if (!entry)
        reject('nonempty-container', 'The requested repeat container does not exist.', {
          nodeId: target.containerNodeId,
        });
      let ancestor = entry.parent;
      while (ancestor) {
        if (targetIds.has(ancestor.id as string))
          reject('nested-repeat-target', 'Repeat targets cannot overlap or nest.');
        ancestor = nodeById.get(ancestor.id)?.parent ?? null;
      }
    }
    for (const target of snapshot.targets) {
      const entry = nodeById.get(target.containerNodeId)!;
      if (
        entry.widget.type === 'composition-instance' ||
        (Array.isArray(entry.widget.children) && entry.widget.children.length > 0) ||
        entry.widget.child !== undefined
      )
        reject('nonempty-container', 'A repeat target must be an empty authored container.', {
          nodeId: target.containerNodeId,
        });
    }
    // Snapshot trusted context data separately, and memoize catalogue reads for this generation.
    const components = new Map<string, ReturnType<typeof context.componentCatalog.component>>();
    const safeContext: UiDocumentCommandV3AdmissionContext = {
      ...context,
      layoutProperties: deepFreezeUiAuthoringValue(capture(context.layoutProperties)),
      layoutStrategies: deepFreezeUiAuthoringValue(capture(context.layoutStrategies)),
      compositionDefinitions: deepFreezeUiAuthoringValue(
        capture(context.compositionDefinitions ?? []),
      ),
      componentCatalog: {
        component: (ref) => {
          const key = JSON.stringify([ref.id, ref.version]);
          if (!components.has(key)) {
            const resolved = context.componentCatalog.component(ref);
            components.set(
              key,
              resolved === undefined ? undefined : deepFreezeUiAuthoringValue(capture(resolved)),
            );
          }
          return components.get(key);
        },
        components: () => context.componentCatalog.components(),
      },
    };
    for (const target of snapshot.targets) {
      const entry = nodeById.get(target.containerNodeId)!;
      const authoring = readUiDocumentNodeAuthoringV3(entry.widget)!;
      const descriptor = safeContext.componentCatalog.component(authoring.component);
      if (
        descriptor === undefined ||
        descriptor.id !== authoring.component.id ||
        descriptor.version !== authoring.component.version ||
        validateUiComponentDescriptor(descriptor).some((issue) =>
          issue.path.startsWith('layout.childSlots['),
        )
      )
        reject(
          'nonempty-container',
          'The exact repeat container descriptor or child-slot declaration is unavailable or invalid.',
          {
            nodeId: target.containerNodeId,
          },
        );
      const slots = descriptor.layout?.childSlots?.filter((slot) => slot.id === 'children') ?? [];
      if (slots.length !== 1 || slots[0]!.cardinality !== 'many')
        reject('nonempty-container', 'A repeat target must declare a many-child children slot.', {
          nodeId: target.containerNodeId,
        });
    }
    const resourceOwners = new Map<string, string>();
    const prepared = [...snapshot.targets]
      .sort((left, right) =>
        left.containerNodeId < right.containerNodeId
          ? -1
          : left.containerNodeId > right.containerNodeId
            ? 1
            : 0,
      )
      .map((target) =>
        prepareTarget(target, document, safeContext, resourceTargetPolicy, resourceOwners),
      );
    let projectedCount = nodes.length;
    for (const { widget } of nodes) {
      if (widget.type !== 'composition-instance') continue;
      const ordinary = validateUiCompositionInstance(widget, safeContext);
      if (ordinary.diagnostics.length === 0 && ordinary.definition)
        projectedCount += collectWidgetNodes(ordinary.definition.document.root).length;
    }
    for (const item of prepared) {
      const visibleCount = Math.max(
        0,
        Math.min(
          item.effectivePageSize,
          item.target.records.length - item.pageIndex * item.effectivePageSize,
        ),
      );
      projectedCount += visibleCount * (item.templateNodes + 1);
    }
    if (projectedCount > MAX_NODES)
      reject(
        'snapshot-limit',
        'All authored and expanded nodes must fit the 2,000-node budget; choose a lower page size.',
      );
    const usedIds = new Set(nodes.map(({ widget }) => widget.id));
    const repeatProvenance: Record<string, UiCollectionRepeatIdentity> = {};
    const baseParameterValues: Record<string, Readonly<Record<string, UiCompositionScalar>>> = {};
    const children = new Map<string, GenericWidget[]>();
    const plans: ResourcePlan[] = [];
    const pages: RepeatResultFields['pages'][number][] = [];
    for (const item of prepared) {
      const { target } = item;
      const instances: GenericWidget[] = [];
      const visible = target.records.slice(
        item.pageIndex * item.effectivePageSize,
        (item.pageIndex + 1) * item.effectivePageSize,
      );
      pages.push({
        containerNodeId: target.containerNodeId,
        generation: target.generation,
        totalCount: target.records.length,
        pageIndex: item.pageIndex,
        effectivePageSize: item.effectivePageSize,
      });
      for (const record of visible) {
        const identity = {
          sourceNamespace: target.sourceNamespace,
          consumerDocumentId: document.documentId,
          containerNodeId: target.containerNodeId,
          recordId: record.recordId,
        };
        const id = instanceId(identity);
        if (usedIds.has(id))
          reject(
            'identity-collision',
            'A derived instance identity collides with an authored or generated node.',
            { recordId: record.recordId },
          );
        usedIds.add(id);
        repeatProvenance[id] = identity;
        const values: Record<string, { kind: 'literal'; value: UiCompositionScalar }> =
          Object.create(null) as Record<string, { kind: 'literal'; value: UiCompositionScalar }>;
        const baseValues: Record<string, UiCompositionScalar> = Object.fromEntries(
          item.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
        );
        const override = item.activeOverrides.get(record.recordId);
        for (const mapping of target.mappings) {
          const parameter = item.parameters.find(
            (parameter) => parameter.id === mapping.parameterId,
          )!;
          const overridden =
            override !== undefined &&
            Object.prototype.hasOwnProperty.call(override.values, parameter.id);
          if (mapping.source.kind === 'field') {
            const value = record.values[mapping.source.fieldId];
            if (
              validSourceValue(item.fields.get(mapping.source.fieldId)!, value) &&
              validTargetValue(parameter, value, safeContext)
            ) {
              baseValues[parameter.id] = value;
              values[parameter.id] = { kind: 'literal', value };
            } else if (!overridden)
              diagnostics.push({
                code: 'mapping-value-invalid',
                message:
                  'The source value is missing or invalid; the authored template default is used.',
                recordId: record.recordId,
                parameterId: parameter.id,
                nodeId: target.containerNodeId,
              });
          } else {
            if (overridden) continue;
            const resource = item.resources.get(
              resourceTuple(record.recordId, mapping.source.role),
            );
            if (resource)
              plans.push({
                generation: target.generation,
                instanceNodeId: id,
                definitionDocumentId: target.template.documentId,
                definitionNodeId: parameter.target.nodeId,
                propertyId: parameter.target.propertyId,
                resourceKey: resource.resourceKey,
              });
            else
              diagnostics.push({
                code: 'resource-unavailable',
                message:
                  'The same-snapshot resource is unavailable; the authored template default is used.',
                recordId: record.recordId,
                parameterId: parameter.id,
                nodeId: target.containerNodeId,
              });
          }
        }
        baseParameterValues[id] = baseValues;
        if (override)
          for (const [key, value] of Object.entries(override.values))
            values[key] = { kind: 'literal', value };
        instances.push({
          type: 'composition-instance',
          id,
          $authoring: {
            component: uiCompositionComponentRef(
              target.template.documentId,
              target.template.interfaceVersion,
            ),
            properties: values,
            layout: target.instanceLayout,
          },
        });
      }
      children.set(target.containerNodeId, instances);
    }
    if (plans.length > MAX_NODES)
      reject('snapshot-limit', 'The resource target plan exceeds 2,000 targets.');
    const expand = (node: GenericWidget): GenericWidget => ({
      ...node,
      ...(children.has(node.id as string)
        ? { children: children.get(node.id as string)! }
        : Array.isArray(node.children)
          ? {
              children: node.children.map((child) =>
                isGenericWidget(child) ? expand(child) : child,
              ),
            }
          : {}),
      ...(isGenericWidget(node.child) ? { child: expand(node.child) } : {}),
    });
    const root = expand(document.root) as UiDocumentNodeV3;
    // This is the only composition pass, including ordinary authored instances.
    const resolved = resolveUiCompositionInstances(
      { ...document, root, source: formatWidgetDocumentJson(root) },
      safeContext,
    );
    if (
      resolved.diagnostics.some(
        (issue) =>
          issue.nodeId !== undefined &&
          Object.prototype.hasOwnProperty.call(repeatProvenance, issue.nodeId),
      )
    )
      reject(
        'template-unavailable',
        'A repeated template could not be expanded under the current composition policy.',
      );
    const expandedNodes = collectWidgetNodes(resolved.root);
    if (expandedNodes.length > MAX_NODES)
      reject('snapshot-limit', 'The complete projection exceeds 2,000 nodes.');
    const expandedIds = new Set<unknown>();
    for (const { widget } of expandedNodes) {
      if (expandedIds.has(widget.id))
        reject(
          'identity-collision',
          'An expanded composition node collides with another projected identity.',
        );
      expandedIds.add(widget.id);
    }
    const descendants = new Map(
      Object.entries(resolved.provenance).map(([id, provenance]) => [
        JSON.stringify([
          provenance.instanceNodeId,
          provenance.definitionDocumentId,
          provenance.definitionNodeId,
        ]),
        id,
      ]),
    );
    const resourceTargets = plans.map((plan): UiCollectionRepeatResourceTarget => {
      const projectedNodeId = descendants.get(
        JSON.stringify([plan.instanceNodeId, plan.definitionDocumentId, plan.definitionNodeId]),
      );
      if (!projectedNodeId)
        reject(
          'resource-target-denied',
          'The exact resolved descendant resource target is unavailable.',
        );
      return { ...plan, projectedNodeId };
    });
    // Empty pages still depend on the exact template; no second evaluation is necessary.
    const dependencies = new Map(
      resolved.dependencies.map((dependency) => [
        JSON.stringify([dependency.documentId, dependency.interfaceVersion]),
        dependency,
      ]),
    );
    for (const { target } of prepared) {
      const definition = safeContext.compositionDefinitions!.find(
        (entry) => entry.document.documentId === target.template.documentId,
      )!;
      dependencies.set(
        JSON.stringify([target.template.documentId, target.template.interfaceVersion]),
        { ...target.template, sourceHash: definition.sourceHash },
      );
    }
    const composition = {
      ...resolved,
      dependencies: [...dependencies.values()].sort((left, right) =>
        left.documentId < right.documentId
          ? -1
          : left.documentId > right.documentId
            ? 1
            : left.interfaceVersion < right.interfaceVersion
              ? -1
              : left.interfaceVersion > right.interfaceVersion
                ? 1
                : 0,
      ),
    };
    return deepFreezeUiAuthoringValue({
      status: 'ready',
      generation,
      root: resolved.root,
      composition,
      repeatProvenance,
      baseParameterValues,
      resourceTargets,
      diagnostics,
      pages,
    });
  } catch (error) {
    diagnostics.push(
      error instanceof RepeatFailure
        ? error.diagnostic
        : {
            code: 'invalid-record',
            message:
              'The captured input or trusted projection context could not be safely resolved.',
          },
    );
    return deepFreezeUiAuthoringValue({
      status: 'invalid',
      generation,
      root: null,
      composition: null,
      repeatProvenance: {},
      baseParameterValues: {},
      resourceTargets: [],
      diagnostics,
      pages: [],
    });
  }
}
