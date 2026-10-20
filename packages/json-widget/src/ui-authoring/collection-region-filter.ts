import {
  validateUiComponentDescriptor,
  validateUiPropertyDescriptor,
  type UiComponentCatalogContract,
  type UiComponentRef,
  type UiPropertyDescriptor,
} from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes } from '../widget/tree.js';
import { readUiDocumentNodeAuthoringV3, validateUiDocumentRootV3 } from './document-v3.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';
import { validateUiDocumentPropertySource } from './property-source-validation-v3.js';
import type {
  UiCollectionRepeatRecord,
  UiCollectionRepeatSourceNamespace,
  UiCollectionRepeatSourceSchema,
} from './collection-repeat.js';
import type { UiDocumentV3 } from './types.js';

export type UiCollectionRegionScalar = string | number | boolean;
export type UiCollectionRegionChoice =
  { readonly kind: 'all' } | { readonly kind: 'value'; readonly value: UiCollectionRegionScalar };

export interface UiCollectionRegionFilterConfig {
  readonly schemaVersion: 1;
  readonly controlId: string;
  readonly target: {
    readonly containerNodeId: string;
    readonly inputId: string;
    readonly bindingId: string;
  };
  readonly sourceNamespace: UiCollectionRepeatSourceNamespace;
  readonly expectedSchemaRevision: string;
  readonly fieldId: string;
  readonly operator: 'equals' | 'includes';
  readonly valueProviderId: string;
  readonly defaultSelection: UiCollectionRegionChoice;
}

export interface UiCollectionRegionFilterField {
  readonly id: string;
  readonly type: 'string' | 'number' | 'boolean' | 'string-array';
}

export interface UiCollectionRegionValueProvider {
  readonly id: string;
  readonly fieldId: string;
}

export interface UiCollectionRegionOption {
  readonly token: string;
  readonly value: UiCollectionRegionScalar;
}

export interface UiCollectionRegionFilterBinding {
  readonly id: string;
  readonly sourceNamespace: UiCollectionRepeatSourceNamespace;
  readonly sourceSchema: UiCollectionRepeatSourceSchema;
}

export interface UiCollectionRegionFilterScope {
  /** A view mount/reopen lease, not an ordinary document revision. */
  readonly ownerId: string;
  /** Changes only when the canonical filter configuration changes. */
  readonly configGeneration: string;
}

export interface UiCollectionRegionFilterDiagnostic {
  readonly code:
    | 'invalid-config'
    | 'limit'
    | 'invalid-admission'
    | 'invalid-snapshot'
    | 'stale-event'
    | 'unknown-option';
  readonly message: string;
}

type Invalid<T extends string> = {
  readonly status: 'invalid';
  readonly diagnostics: readonly UiCollectionRegionFilterDiagnostic[];
} & Record<T, null>;

export type UiCollectionRegionFilterParseResult =
  | {
      readonly status: 'ready';
      readonly config: UiCollectionRegionFilterConfig;
      readonly diagnostics: readonly [];
    }
  | Invalid<'config'>;

export interface UiCollectionRegionFilterAdmissionInput {
  readonly config: UiCollectionRegionFilterConfig;
  readonly document: UiDocumentV3;
  readonly controlComponent: UiComponentRef;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly binding: UiCollectionRegionFilterBinding;
  readonly filterFields: readonly UiCollectionRegionFilterField[];
  readonly valueProviders: readonly UiCollectionRegionValueProvider[];
  readonly scope: UiCollectionRegionFilterScope;
}

export interface UiCollectionRegionFilterAdmission {
  readonly config: UiCollectionRegionFilterConfig;
  readonly scopeKey: string;
  readonly ownerId: string;
  readonly documentId: string;
  readonly field: UiCollectionRegionFilterField;
  readonly provider: UiCollectionRegionValueProvider;
  readonly sourceSchema: UiCollectionRepeatSourceSchema;
}

export type UiCollectionRegionFilterAdmissionResult =
  | {
      readonly status: 'ready';
      readonly admission: UiCollectionRegionFilterAdmission;
      readonly diagnostics: readonly [];
    }
  | Invalid<'admission'>;

export type UiCollectionRegionOptionsSnapshot =
  | {
      readonly status: 'ready';
      readonly generation: string;
      readonly options: readonly UiCollectionRegionOption[];
    }
  | { readonly status: 'loading' | 'failed' | 'partial' };

export type UiCollectionRegionSelectionEvent = {
  readonly scopeKey: string;
  readonly generation: string;
  readonly choice:
    | { readonly kind: 'all' }
    | { readonly kind: 'token'; readonly token: string }
    | { readonly kind: 'reset' };
};

export interface UiCollectionRegionSelection {
  readonly scopeKey: string;
  readonly selected: UiCollectionRegionChoice;
  readonly availability: 'offered' | 'missing' | 'blocked';
  readonly generation: string | null;
}

export interface UiCollectionRegionReconcileInput {
  readonly admission: UiCollectionRegionFilterAdmissionResult;
  readonly previous?: UiCollectionRegionSelection | null;
  readonly snapshot: UiCollectionRegionOptionsSnapshot;
  readonly event?: UiCollectionRegionSelectionEvent | null;
}

export type UiCollectionRegionSelectionResult =
  | {
      readonly status: 'ready';
      readonly selection: UiCollectionRegionSelection;
      readonly diagnostics: readonly UiCollectionRegionFilterDiagnostic[];
    }
  | Invalid<'selection'>;

export interface UiCollectionRegionFilterRow {
  readonly recordId: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface UiCollectionRegionFilterCapture {
  readonly records: {
    readonly generation: string;
    readonly items: readonly UiCollectionRepeatRecord[];
  };
  readonly filterRows: {
    readonly generation: string;
    readonly fields: readonly UiCollectionRegionFilterField[];
    readonly items: readonly UiCollectionRegionFilterRow[];
  };
  readonly options: {
    readonly generation: string;
    readonly controls: readonly {
      readonly controlId: string;
      readonly providerId: string;
      readonly items: readonly UiCollectionRegionOption[];
    }[];
  };
}

export interface UiCollectionRegionFilterInput {
  readonly admissions: readonly UiCollectionRegionFilterAdmissionResult[];
  readonly selections: readonly UiCollectionRegionSelection[];
  readonly capture: UiCollectionRegionFilterCapture;
}

export type UiCollectionRegionFilterResult =
  | {
      readonly status: 'ready';
      readonly records: readonly UiCollectionRepeatRecord[];
      readonly filteredCount: number;
      readonly diagnostics: readonly [];
    }
  | {
      readonly status: 'blocked' | 'invalid';
      readonly records: readonly [];
      readonly filteredCount: 0;
      readonly diagnostics: readonly UiCollectionRegionFilterDiagnostic[];
    };

const encoder = new TextEncoder();
const MAX_ID_BYTES = 256;
const MAX_STRING_BYTES = 16 * 1024;
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;
const MAX_CONTROLS = 32;
const MAX_OPTIONS = 1024;
const MAX_RECORDS = 10_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

class FilterFailure extends Error {
  constructor(readonly diagnostic: UiCollectionRegionFilterDiagnostic) {
    super(diagnostic.message);
  }
}

function reject(code: UiCollectionRegionFilterDiagnostic['code'], message: string): never {
  throw new FilterFailure({ code, message });
}

function diagnostic(error: unknown): UiCollectionRegionFilterDiagnostic {
  return error instanceof FilterFailure
    ? error.diagnostic
    : { code: 'invalid-snapshot', message: 'The input could not be safely inspected.' };
}

function wellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++index >= value.length) return false;
      const low = value.charCodeAt(index);
      if (low < 0xdc00 || low > 0xdfff) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function bytes(value: string, limit = MAX_CAPTURE_BYTES): number {
  if (value.length > limit) return limit + 1;
  if (!wellFormed(value)) reject('invalid-config', 'Text must have well-formed Unicode.');
  return encoder.encode(value).length;
}

function id(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && bytes(value, MAX_ID_BYTES) <= MAX_ID_BYTES
  );
}

function scopeIdentity(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    bytes(value, MAX_CONFIG_BYTES) <= MAX_CONFIG_BYTES
  );
}

function scalar(value: unknown): value is UiCollectionRegionScalar {
  return (
    (typeof value === 'string' && bytes(value, MAX_STRING_BYTES) <= MAX_STRING_BYTES) ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact<T>(
  value: T,
  keys: readonly string[],
  code: UiCollectionRegionFilterDiagnostic['code'],
): asserts value is T & Record<string, unknown> {
  if (
    !record(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    reject(code, 'The record has an invalid shape.');
}

/** Descriptor-only bounded capture; never reads an accessor value. */
function capture<T>(value: T, limit: number, code: UiCollectionRegionFilterDiagnostic['code']): T {
  let size = 0;
  let entries = 0;
  const ancestors = new Set<object>();
  const add = (count: number) => {
    size += count;
    if (size > limit) reject('limit', 'The captured input exceeds its byte limit.');
  };
  const visit = (input: unknown, depth: number): unknown => {
    if (++entries > 1_000_000 || depth > 128)
      reject('limit', 'The captured input exceeds its structural limit.');
    if (input === null) {
      add(4);
      return null;
    }
    if (typeof input === 'string') {
      add(bytes(input, limit) + 2);
      return input;
    }
    if (typeof input === 'number' && Number.isFinite(input)) {
      add(24);
      return input;
    }
    if (typeof input === 'boolean') {
      add(5);
      return input;
    }
    if (typeof input !== 'object') reject(code, 'The input must be plain JSON data.');
    if (ancestors.has(input)) reject(code, 'Cyclic input is not supported.');
    const array = Array.isArray(input);
    const prototype = Object.getPrototypeOf(input);
    if (
      array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null
    )
      reject(code, 'The input must have a plain prototype.');
    const length = array ? (Object.getOwnPropertyDescriptor(input, 'length')?.value as number) : 0;
    if (array && length > 1_000_000) reject('limit', 'Arrays exceed the structural limit.');
    const keys = Reflect.ownKeys(input);
    if (array && keys.length !== length + 1) reject(code, 'Arrays must be dense and bounded.');
    ancestors.add(input);
    const output: [string, unknown][] = [];
    add(2);
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || FORBIDDEN_KEYS.has(key))
        reject(code, 'The input contains an unsafe key.');
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length))
        reject(code, 'Arrays must not contain extra keys.');
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
        reject(code, 'Accessors and hidden properties are not supported.');
      add(bytes(key, limit) + 4);
      output.push([key, visit(descriptor.value, depth + 1)]);
    }
    ancestors.delete(input);
    return array ? output.map(([, entry]) => entry) : Object.fromEntries(output);
  };
  const copied = visit(value, 0) as T;
  if (encoder.encode(JSON.stringify(copied)).length > limit)
    reject('limit', 'The captured input exceeds its byte limit.');
  return copied;
}

function namespace(value: unknown): value is UiCollectionRepeatSourceNamespace {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    id(value[0]) &&
    (value[1] === null || id(value[1])) &&
    id(value[2])
  );
}

function sameNamespace(
  left: UiCollectionRepeatSourceNamespace,
  right: UiCollectionRepeatSourceNamespace,
): boolean {
  return left.every((part, index) => part === right[index]);
}

function choice(value: unknown): value is UiCollectionRegionChoice {
  if (!record(value)) return false;
  if (value.kind === 'all') return Object.keys(value).length === 1;
  return (
    value.kind === 'value' &&
    Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, 'value') &&
    scalar(value.value)
  );
}

function compatible(
  field: UiCollectionRegionFilterField,
  value: unknown,
): value is UiCollectionRegionScalar {
  return scalar(value) && typeof value === (field.type === 'string-array' ? 'string' : field.type);
}

function valueKey(value: UiCollectionRegionScalar): string {
  return JSON.stringify([typeof value, value]);
}

function validIdentityValue(field: UiPropertyDescriptor, value: unknown): boolean {
  if (!scalar(value)) return false;
  const component = {
    id: 'collection-region-identity',
    version: '1',
    kind: 'atomic' as const,
    properties: [field],
    designTime: { label: 'Collection identity' },
  };
  return (
    validateUiDocumentPropertySource(
      component,
      'collection-region-identity',
      field,
      { kind: 'literal', value },
      undefined,
      'composition-target',
    ) === null
  );
}

function validOptions(
  options: readonly UiCollectionRegionOption[],
  field: UiCollectionRegionFilterField,
): void {
  if (options.length > MAX_OPTIONS) reject('limit', 'A control has too many options.');
  const tokens = new Set<string>();
  const values = new Set<string>();
  for (const option of options) {
    exact(option, ['token', 'value'], 'invalid-snapshot');
    if (
      !id(option.token) ||
      !compatible(field, option.value) ||
      tokens.has(option.token) ||
      values.has(valueKey(option.value))
    )
      reject('invalid-snapshot', 'Option tokens and typed values must be valid and unambiguous.');
    tokens.add(option.token);
    values.add(valueKey(option.value));
  }
}

export function parseUiCollectionRegionFilterConfig(
  value: unknown,
): UiCollectionRegionFilterParseResult {
  try {
    const config = capture(value, MAX_CONFIG_BYTES, 'invalid-config');
    exact(
      config,
      [
        'schemaVersion',
        'controlId',
        'target',
        'sourceNamespace',
        'expectedSchemaRevision',
        'fieldId',
        'operator',
        'valueProviderId',
        'defaultSelection',
      ],
      'invalid-config',
    );
    exact(config.target, ['containerNodeId', 'inputId', 'bindingId'], 'invalid-config');
    if (
      config.schemaVersion !== 1 ||
      !id(config.controlId) ||
      !id(config.target.containerNodeId) ||
      !id(config.target.inputId) ||
      !id(config.target.bindingId) ||
      !namespace(config.sourceNamespace) ||
      !id(config.expectedSchemaRevision) ||
      !id(config.fieldId) ||
      !id(config.valueProviderId) ||
      (config.operator !== 'equals' && config.operator !== 'includes') ||
      !choice(config.defaultSelection)
    )
      reject('invalid-config', 'The filter configuration is invalid.');
    return {
      status: 'ready',
      config: config as unknown as UiCollectionRegionFilterConfig,
      diagnostics: [],
    };
  } catch (error) {
    return { status: 'invalid', config: null, diagnostics: [diagnostic(error)] };
  }
}

function validField(field: unknown): field is UiCollectionRegionFilterField {
  if (!record(field)) return false;
  return (
    Object.keys(field).length === 2 &&
    id(field.id) &&
    (field.type === 'string' ||
      field.type === 'number' ||
      field.type === 'boolean' ||
      field.type === 'string-array')
  );
}

function validProvider(provider: unknown): provider is UiCollectionRegionValueProvider {
  if (!record(provider)) return false;
  return Object.keys(provider).length === 2 && id(provider.id) && id(provider.fieldId);
}

export function admitUiCollectionRegionFilter(
  input: UiCollectionRegionFilterAdmissionInput,
): UiCollectionRegionFilterAdmissionResult {
  try {
    const parsed = parseUiCollectionRegionFilterConfig(input.config);
    if (parsed.status !== 'ready')
      reject('invalid-admission', 'The filter configuration is invalid.');
    const config = parsed.config;
    const document = capture(input.document, MAX_CAPTURE_BYTES, 'invalid-admission');
    const binding = capture(input.binding, MAX_CAPTURE_BYTES, 'invalid-admission');
    const fields = capture(input.filterFields, MAX_CAPTURE_BYTES, 'invalid-admission');
    const providers = capture(input.valueProviders, MAX_CAPTURE_BYTES, 'invalid-admission');
    const scope = capture(input.scope, MAX_CONFIG_BYTES, 'invalid-admission');
    const controlComponent = capture(input.controlComponent, MAX_CONFIG_BYTES, 'invalid-admission');
    exact(binding, ['id', 'sourceNamespace', 'sourceSchema'], 'invalid-admission');
    exact(
      binding.sourceSchema,
      ['schemaRevision', 'fields', 'identityFieldIds'],
      'invalid-admission',
    );
    exact(scope, ['ownerId', 'configGeneration'], 'invalid-admission');
    exact(controlComponent, ['id', 'version'], 'invalid-admission');
    if (
      !id(scope.ownerId) ||
      !id(scope.configGeneration) ||
      !id(controlComponent.id) ||
      !id(controlComponent.version) ||
      !id(binding.id) ||
      !namespace(binding.sourceNamespace) ||
      !record(binding.sourceSchema) ||
      !id(binding.sourceSchema.schemaRevision) ||
      !Array.isArray(binding.sourceSchema.fields) ||
      !Array.isArray(binding.sourceSchema.identityFieldIds) ||
      binding.sourceSchema.fields.some(
        (field) => !id(field.id) || validateUiPropertyDescriptor(field).length > 0,
      ) ||
      new Set(binding.sourceSchema.fields.map((field) => field.id)).size !==
        binding.sourceSchema.fields.length ||
      binding.sourceSchema.identityFieldIds.length === 0 ||
      binding.sourceSchema.identityFieldIds.some(
        (fieldId) =>
          !id(fieldId) || !binding.sourceSchema.fields.some((field) => field.id === fieldId),
      ) ||
      new Set(binding.sourceSchema.identityFieldIds).size !==
        binding.sourceSchema.identityFieldIds.length ||
      !Array.isArray(fields) ||
      !Array.isArray(providers) ||
      fields.length > 1024 ||
      providers.length > 1024 ||
      fields.some((field) => !validField(field)) ||
      providers.some((provider) => !validProvider(provider)) ||
      new Set(fields.map((field) => field.id)).size !== fields.length ||
      new Set(providers.map((provider) => provider.id)).size !== providers.length
    )
      reject('invalid-admission', 'The source binding, descriptors or scope are invalid.');
    if (
      binding.id !== config.target.bindingId ||
      !sameNamespace(binding.sourceNamespace, config.sourceNamespace) ||
      binding.sourceSchema.schemaRevision !== config.expectedSchemaRevision
    )
      reject('invalid-admission', 'The actual binding does not match the filter configuration.');
    const field = fields.find((candidate) => candidate.id === config.fieldId);
    const provider = providers.find((candidate) => candidate.id === config.valueProviderId);
    if (
      !field ||
      !provider ||
      provider.fieldId !== field.id ||
      (config.operator === 'equals' && field.type === 'string-array') ||
      (config.operator === 'includes' && field.type !== 'string-array') ||
      (config.defaultSelection.kind === 'value' &&
        !compatible(field, config.defaultSelection.value))
    )
      reject(
        'invalid-admission',
        'The field, provider, operator or default selection is incompatible.',
      );
    if (
      !id(document.documentId) ||
      validateUiDocumentRootV3(document.root).length > 0 ||
      formatWidgetDocumentJson(document.root) !== document.source
    )
      reject('invalid-admission', 'The filter requires a canonical authored document.');
    const nodes = collectWidgetNodes(document.root);
    if (nodes.length > 2000) reject('limit', 'The authored document exceeds 2,000 nodes.');
    if (
      nodes.filter(({ widget }) => {
        const component = readUiDocumentNodeAuthoringV3(widget)?.component;
        return component?.id === controlComponent.id;
      }).length > MAX_CONTROLS
    )
      reject('limit', 'An authored document exceeds 32 controls of this component.');
    const control = nodes.find(({ widget }) => widget.id === config.controlId)?.widget;
    const target = nodes.find(({ widget }) => widget.id === config.target.containerNodeId)?.widget;
    if (
      !control ||
      !target ||
      control === target ||
      target.type === 'composition-instance' ||
      (Array.isArray(target.children) && target.children.length > 0) ||
      target.child !== undefined
    )
      reject('invalid-admission', 'The exact distinct empty control and target are required.');
    const controlAuthoring = readUiDocumentNodeAuthoringV3(control);
    const targetAuthoring = readUiDocumentNodeAuthoringV3(target);
    if (
      !controlAuthoring ||
      !targetAuthoring ||
      controlAuthoring.component.id !== controlComponent.id ||
      controlAuthoring.component.version !== controlComponent.version ||
      targetAuthoring.bindings?.[config.target.inputId] !== binding.id
    )
      reject('invalid-admission', 'The authored control or target input does not match.');
    const actualControl = input.componentCatalog.component(controlComponent);
    const actualTarget = input.componentCatalog.component(targetAuthoring.component);
    if (
      !actualControl ||
      !actualTarget ||
      actualControl.id !== controlComponent.id ||
      actualControl.version !== controlComponent.version ||
      actualTarget.id !== targetAuthoring.component.id ||
      actualTarget.version !== targetAuthoring.component.version
    )
      reject(
        'invalid-admission',
        'The component catalog does not contain the authored components.',
      );
    const safeControl = capture(actualControl, MAX_CAPTURE_BYTES, 'invalid-admission');
    const safeTarget = capture(actualTarget, MAX_CAPTURE_BYTES, 'invalid-admission');
    if (
      validateUiComponentDescriptor(safeControl).length > 0 ||
      validateUiComponentDescriptor(safeTarget).length > 0 ||
      safeTarget.layout?.childSlots?.filter(
        (slot) => slot.id === 'children' && slot.cardinality === 'many',
      ).length !== 1 ||
      safeTarget.bindings?.filter((candidate) => candidate.id === config.target.inputId).length !==
        1 ||
      safeTarget.bindings?.find((candidate) => candidate.id === config.target.inputId)
        ?.direction !== 'input' ||
      safeTarget.bindings?.find((candidate) => candidate.id === config.target.inputId)?.value
        .type !== 'collection' ||
      safeTarget.bindings
        ?.find((candidate) => candidate.id === config.target.inputId)
        ?.value.allowedSources?.includes('binding') !== true
    )
      reject('invalid-admission', 'The target descriptor must declare the exact collection input.');
    const scopeKey = JSON.stringify([
      scope.ownerId,
      document.documentId,
      config.controlId,
      config.target.containerNodeId,
      config.target.inputId,
      binding.id,
      binding.sourceNamespace,
      binding.sourceSchema.schemaRevision,
      scope.configGeneration,
    ]);
    return {
      status: 'ready',
      admission: deepFreezeUiAuthoringValue({
        config,
        scopeKey,
        ownerId: scope.ownerId,
        documentId: document.documentId,
        field,
        provider,
        sourceSchema: binding.sourceSchema,
      }),
      diagnostics: [],
    };
  } catch (error) {
    return { status: 'invalid', admission: null, diagnostics: [diagnostic(error)] };
  }
}

export function reconcileUiCollectionRegionSelection(
  input: UiCollectionRegionReconcileInput,
): UiCollectionRegionSelectionResult {
  try {
    if (input.admission.status !== 'ready')
      reject('invalid-admission', 'A valid filter admission is required.');
    const admission = input.admission.admission;
    const previous =
      input.previous === undefined || input.previous === null
        ? null
        : capture(input.previous, MAX_CONFIG_BYTES, 'invalid-snapshot');
    if (
      previous !== null &&
      (!scopeIdentity(previous.scopeKey) ||
        !choice(previous.selected) ||
        !['offered', 'missing', 'blocked'].includes(previous.availability) ||
        (previous.generation !== null && !id(previous.generation)))
    )
      reject('invalid-snapshot', 'The prior selection is invalid.');
    const snapshot = capture(input.snapshot, MAX_CAPTURE_BYTES, 'invalid-snapshot');
    let options: readonly UiCollectionRegionOption[] = [];
    let generation: string | null = null;
    if (snapshot.status === 'ready') {
      exact(snapshot, ['status', 'generation', 'options'], 'invalid-snapshot');
      if (!id(snapshot.generation) || !Array.isArray(snapshot.options))
        reject('invalid-snapshot', 'A complete successful option snapshot is required.');
      validOptions(snapshot.options, admission.field);
      options = snapshot.options;
      generation = snapshot.generation;
    } else {
      exact(snapshot, ['status'], 'invalid-snapshot');
      if (
        snapshot.status !== 'loading' &&
        snapshot.status !== 'failed' &&
        snapshot.status !== 'partial'
      )
        reject('invalid-snapshot', 'Only an explicit incomplete snapshot may block selection.');
    }
    const sameScope = previous?.scopeKey === admission.scopeKey;
    let selected = sameScope ? previous.selected : admission.config.defaultSelection;
    const diagnostics: UiCollectionRegionFilterDiagnostic[] = [];
    if (input.event !== undefined && input.event !== null) {
      const event = capture(input.event, MAX_CONFIG_BYTES, 'invalid-snapshot');
      exact(event, ['scopeKey', 'generation', 'choice'], 'invalid-snapshot');
      if (!scopeIdentity(event.scopeKey) || !id(event.generation))
        reject(
          'invalid-snapshot',
          'An event must carry its exact scope and successful generation.',
        );
      if (
        generation === null ||
        event.scopeKey !== admission.scopeKey ||
        event.generation !== generation
      ) {
        diagnostics.push({
          code: 'stale-event',
          message: 'The event belongs to a retired or incomplete capture.',
        });
      } else {
        const eventChoice = event.choice;
        if (
          record(eventChoice) &&
          eventChoice.kind === 'all' &&
          Object.keys(eventChoice).length === 1
        )
          selected = { kind: 'all' };
        else if (
          record(eventChoice) &&
          eventChoice.kind === 'reset' &&
          Object.keys(eventChoice).length === 1
        )
          selected = admission.config.defaultSelection;
        else if (
          record(eventChoice) &&
          eventChoice.kind === 'token' &&
          Object.keys(eventChoice).length === 2 &&
          id(eventChoice.token)
        ) {
          const option = options.find((candidate) => candidate.token === eventChoice.token);
          if (option) selected = { kind: 'value', value: option.value };
          else
            diagnostics.push({
              code: 'unknown-option',
              message: 'The selected token is not offered by this capture.',
            });
        } else reject('invalid-snapshot', 'The event choice is invalid.');
      }
    }
    const availability =
      generation === null
        ? 'blocked'
        : selected.kind === 'all' ||
            options.some((option) => valueKey(option.value) === valueKey(selected.value))
          ? 'offered'
          : 'missing';
    return {
      status: 'ready',
      selection: deepFreezeUiAuthoringValue({
        scopeKey: admission.scopeKey,
        selected,
        availability,
        generation,
      }),
      diagnostics,
    };
  } catch (error) {
    return { status: 'invalid', selection: null, diagnostics: [diagnostic(error)] };
  }
}

function validRowValue(field: UiCollectionRegionFilterField, value: unknown): boolean {
  if (field.type === 'string-array')
    return (
      Array.isArray(value) &&
      value.length <= MAX_OPTIONS &&
      value.every((item) => typeof item === 'string' && bytes(item) <= MAX_STRING_BYTES)
    );
  return compatible(field, value);
}

export function filterUiCollectionRegionRecords(
  input: UiCollectionRegionFilterInput,
): UiCollectionRegionFilterResult {
  try {
    if (
      !Array.isArray(input.admissions) ||
      !Array.isArray(input.selections) ||
      input.admissions.length === 0 ||
      input.admissions.length > MAX_CONTROLS ||
      input.admissions.length !== input.selections.length
    )
      reject('limit', 'A target requires between one and 32 paired controls.');
    const admissions = input.admissions.map((result) => {
      if (result.status !== 'ready')
        reject('invalid-admission', 'Every control must have a valid admission.');
      return result.admission;
    });
    const selections = capture(input.selections, MAX_CAPTURE_BYTES, 'invalid-snapshot');
    const captureData = capture(input.capture, MAX_CAPTURE_BYTES, 'invalid-snapshot');
    exact(captureData, ['records', 'filterRows', 'options'], 'invalid-snapshot');
    exact(captureData.records, ['generation', 'items'], 'invalid-snapshot');
    exact(captureData.filterRows, ['generation', 'fields', 'items'], 'invalid-snapshot');
    exact(captureData.options, ['generation', 'controls'], 'invalid-snapshot');
    const { records, filterRows, options } = captureData;
    if (
      !id(records.generation) ||
      records.generation !== filterRows.generation ||
      records.generation !== options.generation ||
      !Array.isArray(records.items) ||
      !Array.isArray(filterRows.items) ||
      !Array.isArray(filterRows.fields) ||
      !Array.isArray(options.controls) ||
      records.items.length > MAX_RECORDS ||
      records.items.length !== filterRows.items.length ||
      options.controls.length !== admissions.length
    )
      reject('invalid-snapshot', 'The complete capture envelopes must match.');
    const fields = new Map<string, UiCollectionRegionFilterField>();
    for (const field of filterRows.fields) {
      if (!validField(field) || fields.has(field.id))
        reject('invalid-snapshot', 'The filter field descriptors are invalid or duplicated.');
      fields.set(field.id, field);
    }
    const controls = new Map<string, (typeof options.controls)[number]>();
    for (const control of options.controls) {
      exact(control, ['controlId', 'providerId', 'items'], 'invalid-snapshot');
      if (
        !id(control.controlId) ||
        !id(control.providerId) ||
        !Array.isArray(control.items) ||
        controls.has(control.controlId)
      )
        reject('invalid-snapshot', 'The option envelope is invalid or duplicated.');
      controls.set(control.controlId, control);
    }
    const first = admissions[0]!;
    const admissionIds = new Set<string>();
    let blocked = false;
    for (let index = 0; index < admissions.length; index += 1) {
      const admission = admissions[index]!;
      const selection = selections[index]!;
      const config = admission.config;
      if (
        admissionIds.has(config.controlId) ||
        admission.ownerId !== first.ownerId ||
        admission.documentId !== first.documentId ||
        config.target.containerNodeId !== first.config.target.containerNodeId ||
        config.target.bindingId !== first.config.target.bindingId ||
        config.target.inputId !== first.config.target.inputId ||
        !sameNamespace(config.sourceNamespace, first.config.sourceNamespace) ||
        config.expectedSchemaRevision !== first.config.expectedSchemaRevision ||
        JSON.stringify(admission.sourceSchema) !== JSON.stringify(first.sourceSchema) ||
        !scopeIdentity(selection.scopeKey) ||
        selection.scopeKey !== admission.scopeKey ||
        !choice(selection.selected) ||
        (selection.availability !== 'blocked' && selection.generation !== records.generation) ||
        (selection.availability === 'blocked' && selection.generation !== null) ||
        !['offered', 'missing', 'blocked'].includes(selection.availability)
      )
        reject(
          'invalid-snapshot',
          'Controls, scope or generation do not describe one target capture.',
        );
      admissionIds.add(config.controlId);
      const field = fields.get(config.fieldId);
      const optionEnvelope = controls.get(config.controlId);
      if (
        !field ||
        field.type !== admission.field.type ||
        !optionEnvelope ||
        optionEnvelope.providerId !== admission.provider.id
      )
        reject('invalid-snapshot', 'The captured field or provider does not match admission.');
      validOptions(optionEnvelope.items, field);
      if (selection.availability === 'blocked') blocked = true;
      else {
        const offered =
          selection.selected.kind === 'all' ||
          optionEnvelope.items.some(
            (option: UiCollectionRegionOption) =>
              valueKey(option.value) === valueKey(selection.selected.value),
          );
        if (selection.availability !== (offered ? 'offered' : 'missing'))
          reject('invalid-snapshot', 'The selected value availability is inconsistent.');
      }
    }
    const ids = new Set<string>();
    for (let index = 0; index < records.items.length; index += 1) {
      const source: UiCollectionRepeatRecord = records.items[index]!;
      const row: UiCollectionRegionFilterRow = filterRows.items[index]!;
      exact(source, ['recordId', 'values'], 'invalid-snapshot');
      exact(row, ['recordId', 'values'], 'invalid-snapshot');
      if (
        !id(source.recordId) ||
        ids.has(source.recordId) ||
        row.recordId !== source.recordId ||
        !record(source.values) ||
        !record(row.values) ||
        Object.keys(source.values).some(
          (fieldId) =>
            !first.sourceSchema.fields.some((field: UiPropertyDescriptor) => field.id === fieldId),
        ) ||
        first.sourceSchema.fields.some((field: UiPropertyDescriptor) => {
          if (!Object.prototype.hasOwnProperty.call(source.values, field.id))
            return (
              field.required === true || first.sourceSchema.identityFieldIds.includes(field.id)
            );
          return !validIdentityValue(field, source.values[field.id]);
        }) ||
        Object.keys(row.values).length !== fields.size ||
        [...fields.values()].some(
          (field) =>
            !Object.prototype.hasOwnProperty.call(row.values, field.id) ||
            !validRowValue(field, row.values[field.id]),
        )
      )
        reject(
          'invalid-snapshot',
          'Every paired row must have one valid identity and complete typed values.',
        );
      ids.add(source.recordId);
    }
    if (blocked) return { status: 'blocked', records: [], filteredCount: 0, diagnostics: [] };
    const retainedIndices = records.items.flatMap((_, index) =>
      admissions.every((admission, controlIndex) => {
        const selected = selections[controlIndex]!.selected;
        if (selected.kind === 'all') return true;
        if (selections[controlIndex]!.availability === 'missing') return false;
        const value = filterRows.items[index]!.values[admission.config.fieldId];
        return admission.config.operator === 'equals'
          ? value === selected.value
          : Array.isArray(value) && value.includes(selected.value);
      })
        ? [index]
        : [],
    );
    // Retain the exact scalar record objects and their order for existing pagination.
    return {
      status: 'ready',
      records: retainedIndices.map((index) => input.capture.records.items[index]!),
      filteredCount: retainedIndices.length,
      diagnostics: [],
    };
  } catch (error) {
    return { status: 'invalid', records: [], filteredCount: 0, diagnostics: [diagnostic(error)] };
  }
}
