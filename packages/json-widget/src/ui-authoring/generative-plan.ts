import type {
  UiComponentCatalogContract,
  UiComponentBindingDescriptor,
  UiComponentDescriptor,
  UiComponentRef,
  UiDesignSystemState,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
  UiPropertyDescriptor,
  UiValueSource,
} from '@workbench-kit/contracts';
import {
  validateUiComponentDescriptor,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  validateUiPropertyDescriptor,
  validateUiPropertyValue,
  validateUiDesignSystemState,
} from '@workbench-kit/contracts';

import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV3WithReplayObserver } from './commands-v3.js';
import { createUiDocumentV3FromRoot, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import {
  cloneUiAuthoringJsonValue,
  deepFreezeUiAuthoringValue,
  uiAuthoringDeclarativeEqual,
} from './immutability.js';
import type {
  AdmitUiGenerativeUiRequestInput,
  CreateUiGenerativeUiPlanInput,
  UiAuthoringDesignSystemInputSnapshot,
  UiDocumentAtomicCommandV3,
  UiDocumentCommandV3Context,
  UiDocumentNodeAuthoringV3,
  UiDocumentV3,
  UiGenerativeAuthoringContextV1,
  UiGenerativeUiBlockedPlan,
  UiGenerativeUiDiagnostic,
  UiGenerativeUiDiagnosticCode,
  UiGenerativeUiPlan,
  UiGenerativeUiPlanBase,
  UiGenerativeUiPlanFinalizeContext,
  UiGenerativeUiPlanFinalizeResult,
  UiGenerativeUiPlanPreview,
  UiGenerativeUiProposal,
  UiGenerativeUiRequest,
  UiGenerativeUiRequestAdmissionResult,
} from './types.js';

type SafeClone<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

interface CurrentRequestOperands {
  readonly state: AdmitUiGenerativeUiRequestInput['state'];
  readonly projectionContext: AdmitUiGenerativeUiRequestInput['projectionContext'];
  readonly componentCatalog: UiComponentCatalogContract;
  readonly layoutStrategies: readonly UiLayoutStrategyDescriptor[];
  readonly layoutProperties: readonly UiLayoutPropertyDescriptor[];
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
}

type RequestVerification =
  | { readonly request: UiGenerativeUiRequest; readonly diagnostic: null }
  | {
      readonly request: UiGenerativeUiRequest | null;
      readonly diagnostic: UiGenerativeUiDiagnostic;
    };

interface ReferenceSets {
  readonly componentRefs: Set<string>;
  readonly layoutStrategyIds: Set<string>;
  readonly layoutPropertyIds: Set<string>;
}

type ReferenceCollectionResult = 'ok' | 'invalid' | 'unsupported';

interface RequestOperandMaps {
  readonly components: ReadonlyMap<string, UiComponentDescriptor>;
  readonly componentLayoutStrategies: ReadonlyMap<string, ReadonlySet<string>>;
  readonly componentBindings: ReadonlyMap<
    string,
    ReadonlyMap<string, UiComponentBindingDescriptor | null>
  >;
  readonly componentProperties: ReadonlyMap<
    string,
    ReadonlyMap<string, UiPropertyDescriptor | null>
  >;
  readonly strategies: ReadonlyMap<string, UiLayoutStrategyDescriptor>;
  readonly strategyContainerProperties: ReadonlyMap<string, ReadonlySet<string>>;
  readonly strategyProperties: ReadonlyMap<string, readonly string[]>;
  readonly properties: ReadonlyMap<string, UiLayoutPropertyDescriptor>;
}

interface ReferenceDocumentIndex {
  readonly authoringByNodeId: Map<string, UiDocumentNodeAuthoringV3>;
  readonly childrenByNodeId: Map<string, Set<string>>;
  readonly parentByNodeId: Map<string, string | null>;
}

const ATOMIC_COMMAND_KEYS = Object.freeze({
  'insert-node': Object.freeze(['type', 'commandId', 'parentId', 'index', 'node']),
  'remove-node': Object.freeze(['type', 'commandId', 'nodeId']),
  'replace-node': Object.freeze(['type', 'commandId', 'nodeId', 'node']),
  'move-node': Object.freeze(['type', 'commandId', 'nodeId', 'targetParentId', 'index']),
  'set-property': Object.freeze(['type', 'commandId', 'nodeId', 'propertyId', 'value']),
  'set-layout': Object.freeze(['type', 'commandId', 'nodeId', 'strategyId', 'values']),
  'set-input-binding': Object.freeze(['type', 'commandId', 'nodeId', 'inputId', 'bindingId']),
  'clear-input-binding': Object.freeze(['type', 'commandId', 'nodeId', 'inputId']),
  'upsert-responsive-variant': Object.freeze(['type', 'commandId', 'variant']),
  'remove-responsive-variant': Object.freeze(['type', 'commandId', 'variantId']),
  'set-responsive-property': Object.freeze([
    'type',
    'commandId',
    'nodeId',
    'variantId',
    'propertyId',
    'value',
  ]),
  'clear-responsive-property': Object.freeze([
    'type',
    'commandId',
    'nodeId',
    'variantId',
    'propertyId',
  ]),
  'set-responsive-layout': Object.freeze([
    'type',
    'commandId',
    'nodeId',
    'variantId',
    'strategyId',
    'values',
  ]),
  'clear-responsive-layout': Object.freeze(['type', 'commandId', 'nodeId', 'variantId']),
} satisfies Readonly<Record<UiDocumentAtomicCommandV3['type'], readonly string[]>>);

const FALLBACK_DOCUMENT = createUiDocumentV3FromRoot('invalid-generative-plan', 0, {
  type: 'invalid-generative-root',
  id: 'invalid-generative-root',
  $authoring: {
    component: { id: 'invalid:generative-root', version: '1' },
    properties: {},
  },
}).document!;

const FALLBACK_REQUEST = deepFreezeUiAuthoringValue({
  schemaVersion: 1,
  requestId: 'invalid-request',
  intent: '',
  context: {
    document: FALLBACK_DOCUMENT,
    selectedNodeIds: Object.freeze([]),
    projectionContext: Object.freeze({
      previewHostWidth: 0,
      editingTarget: Object.freeze({ kind: 'base' as const }),
    }),
    componentDescriptors: Object.freeze([]),
    layoutStrategies: Object.freeze([]),
    layoutProperties: Object.freeze([]),
    designSystemInput: Object.freeze({ state: null, registryRevision: 0 }),
  },
} satisfies UiGenerativeUiRequest);

function safeClone<T>(value: T): SafeClone<T> {
  try {
    return { ok: true, value: cloneUiAuthoringJsonValue(value) };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function diagnostic(
  code: UiGenerativeUiDiagnosticCode,
  message: string,
  path: string,
  context: Pick<
    UiGenerativeUiDiagnostic,
    'commandId' | 'nodeId' | 'propertyId' | 'inputId' | 'variantId'
  > = {},
): UiGenerativeUiDiagnostic {
  return Object.freeze({ code, message, path, ...context });
}

function invalidRequest(path = 'request'): UiGenerativeUiDiagnostic {
  return diagnostic(
    'invalid-request',
    'The generative UI request is not canonical safe data.',
    path,
  );
}

function invalidProposal(path = 'proposal'): UiGenerativeUiDiagnostic {
  return diagnostic(
    'invalid-proposal',
    'The generative UI proposal is not canonical safe data.',
    path,
  );
}

function commandDiagnostic(
  path: string,
  command?: Readonly<Record<string, unknown>>,
): UiGenerativeUiDiagnostic {
  return diagnostic(
    'proposal-command-invalid',
    'The proposal command is invalid or does not produce a material document change.',
    path,
    {
      ...(typeof command?.commandId === 'string' ? { commandId: command.commandId } : {}),
      ...(typeof command?.nodeId === 'string' ? { nodeId: command.nodeId } : {}),
      ...(typeof command?.propertyId === 'string' ? { propertyId: command.propertyId } : {}),
      ...(typeof command?.inputId === 'string' ? { inputId: command.inputId } : {}),
      ...(typeof command?.variantId === 'string' ? { variantId: command.variantId } : {}),
    },
  );
}

function componentKey(ref: UiComponentRef): string {
  return JSON.stringify([ref.id, ref.version]);
}

function uniqueIdMap<T extends { readonly id: string }>(
  values: readonly T[],
): ReadonlyMap<string, T | null> {
  const result = new Map<string, T | null>();
  for (const value of values) {
    result.set(value.id, result.has(value.id) ? null : value);
  }
  return result;
}

function validProjectionContext(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ['previewHostWidth', 'editingTarget'])) return false;
  if (typeof value.previewHostWidth !== 'number' || !Number.isFinite(value.previewHostWidth)) {
    return false;
  }
  const target = value.editingTarget;
  if (!isRecord(target) || typeof target.kind !== 'string') return false;
  return target.kind === 'base'
    ? hasExactKeys(target, ['kind'])
    : target.kind === 'variant' &&
        hasExactKeys(target, ['kind', 'variantId']) &&
        isCanonicalText(target.variantId);
}

function validDesignSystemInput(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['state', 'registryRevision'], ['hostWidth']) ||
    !Number.isInteger(value.registryRevision) ||
    (value.registryRevision as number) < 0
  ) {
    return false;
  }
  if (
    value.state !== null &&
    (!isRecord(value.state) ||
      validateUiDesignSystemState(value.state as unknown as UiDesignSystemState).length > 0)
  ) {
    return false;
  }
  return (
    value.hostWidth === undefined ||
    (typeof value.hostWidth === 'number' && Number.isFinite(value.hostWidth) && value.hostWidth > 0)
  );
}

function validSelection(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every(isCanonicalText) && new Set(value).size === value.length
  );
}

function parseRequestValue(value: unknown): UiGenerativeUiRequest | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['schemaVersion', 'requestId', 'intent', 'context']) ||
    value.schemaVersion !== 1 ||
    !isCanonicalText(value.requestId) ||
    typeof value.intent !== 'string' ||
    !isRecord(value.context)
  ) {
    return null;
  }
  const context = value.context;
  if (
    !hasExactKeys(context, [
      'document',
      'selectedNodeIds',
      'projectionContext',
      'componentDescriptors',
      'layoutStrategies',
      'layoutProperties',
      'designSystemInput',
    ]) ||
    !isRecord(context.document) ||
    !hasExactKeys(context.document, ['documentId', 'revision', 'source', 'root', 'designSystem']) ||
    !isCanonicalText(context.document.documentId) ||
    !Number.isInteger(context.document.revision) ||
    (context.document.revision as number) < 0 ||
    typeof context.document.source !== 'string' ||
    !isRecord(context.document.root) ||
    (context.document.designSystem !== null && !isRecord(context.document.designSystem)) ||
    !validSelection(context.selectedNodeIds) ||
    !validProjectionContext(context.projectionContext) ||
    !Array.isArray(context.componentDescriptors) ||
    !Array.isArray(context.layoutStrategies) ||
    !Array.isArray(context.layoutProperties) ||
    !validDesignSystemInput(context.designSystemInput)
  ) {
    return null;
  }
  const canonicalDocument = createUiDocumentV3FromRoot(
    context.document.documentId,
    context.document.revision as number,
    context.document.root as GenericWidget,
  );
  if (
    canonicalDocument.document === null ||
    !uiAuthoringDeclarativeEqual(canonicalDocument.document, context.document)
  ) {
    return null;
  }
  const componentKeys = new Set<string>();
  for (const descriptor of context.componentDescriptors) {
    if (
      !isRecord(descriptor) ||
      !isCanonicalText(descriptor.id) ||
      !isCanonicalText(descriptor.version)
    ) {
      return null;
    }
    if (validateUiComponentDescriptor(descriptor as unknown as UiComponentDescriptor).length > 0) {
      return null;
    }
    const key = componentKey(descriptor as unknown as UiComponentDescriptor);
    if (componentKeys.has(key)) return null;
    componentKeys.add(key);
  }
  for (const descriptors of [context.layoutStrategies, context.layoutProperties]) {
    const ids = new Set<string>();
    for (const descriptor of descriptors) {
      if (!isRecord(descriptor) || !isCanonicalText(descriptor.id) || ids.has(descriptor.id)) {
        return null;
      }
      ids.add(descriptor.id);
    }
  }
  const layoutProperties =
    context.layoutProperties as unknown as readonly UiLayoutPropertyDescriptor[];
  for (const property of layoutProperties) {
    if (
      !isRecord(property) ||
      !isCanonicalText(property.group) ||
      (property.scope !== 'container' && property.scope !== 'child') ||
      !Array.isArray(property.strategyKinds) ||
      !property.strategyKinds.every(isCanonicalText) ||
      new Set(property.strategyKinds).size !== property.strategyKinds.length ||
      validateUiPropertyDescriptor(property).length > 0
    ) {
      return null;
    }
  }
  const layoutStrategies =
    context.layoutStrategies as unknown as readonly UiLayoutStrategyDescriptor[];
  const layoutPropertyMap = uniqueIdMap(layoutProperties);
  for (const strategy of layoutStrategies) {
    const referencedProperties: UiLayoutPropertyDescriptor[] = [];
    for (const propertyId of [
      ...strategy.supportedContainerProperties,
      ...strategy.supportedChildProperties,
    ]) {
      const property = layoutPropertyMap.get(propertyId);
      if (property === undefined || property === null) return null;
      referencedProperties.push(property);
    }
    if (validateUiLayoutStrategyDescriptor(strategy, referencedProperties).length > 0) return null;
  }
  return value as unknown as UiGenerativeUiRequest;
}

function parseRequest(value: unknown): UiGenerativeUiRequest | null {
  try {
    return parseRequestValue(value);
  } catch {
    return null;
  }
}

function verifyRequest(rawRequest: unknown, current: CurrentRequestOperands): RequestVerification {
  const cloned = safeClone(rawRequest);
  if (!cloned.ok) return { request: null, diagnostic: invalidRequest() };
  const request = parseRequest(cloned.value);
  if (request === null) return { request: null, diagnostic: invalidRequest() };

  const currentDocument = safeClone(current.state.document);
  if (
    !currentDocument.ok ||
    request.context.document.documentId !== currentDocument.value.documentId ||
    request.context.document.revision !== currentDocument.value.revision ||
    request.context.document.source !== currentDocument.value.source ||
    !uiAuthoringDeclarativeEqual(request.context.document, currentDocument.value)
  ) {
    return {
      request,
      diagnostic: diagnostic(
        'stale-document',
        'The request document does not match the current document.',
        'request.context.document',
      ),
    };
  }

  const selection = safeClone(current.state.selectedNodeIds);
  if (
    !selection.ok ||
    !uiAuthoringDeclarativeEqual(request.context.selectedNodeIds, selection.value)
  ) {
    return {
      request,
      diagnostic: diagnostic(
        'stale-selection-context',
        'The request selection does not match the current ordered selection.',
        'request.context.selectedNodeIds',
      ),
    };
  }

  const projection = safeClone(current.projectionContext);
  if (
    !projection.ok ||
    !uiAuthoringDeclarativeEqual(request.context.projectionContext, projection.value)
  ) {
    return {
      request,
      diagnostic: diagnostic(
        'stale-projection-context',
        'The request projection context changed.',
        'request.context.projectionContext',
      ),
    };
  }

  for (let index = 0; index < request.context.componentDescriptors.length; index += 1) {
    const descriptor = request.context.componentDescriptors[index]!;
    let currentDescriptor: UiComponentDescriptor | undefined;
    try {
      currentDescriptor = current.componentCatalog.component({
        id: descriptor.id,
        version: descriptor.version,
      });
    } catch {
      currentDescriptor = undefined;
    }
    const captured = safeClone(currentDescriptor);
    if (
      !captured.ok ||
      currentDescriptor === undefined ||
      !uiAuthoringDeclarativeEqual(descriptor, captured.value)
    ) {
      return {
        request,
        diagnostic: diagnostic(
          'stale-component-descriptor',
          'A request component descriptor is unavailable or changed.',
          `request.context.componentDescriptors[${index}]`,
        ),
      };
    }
  }

  const currentStrategies = safeClone(current.layoutStrategies);
  const currentProperties = safeClone(current.layoutProperties);
  if (!currentStrategies.ok || !currentProperties.ok) {
    return {
      request,
      diagnostic: diagnostic(
        'stale-layout-descriptor',
        'The current layout descriptors are not canonical safe data.',
        'request.context.layoutStrategies',
      ),
    };
  }
  const layoutGroups = [
    {
      requested: request.context.layoutStrategies,
      current: uniqueIdMap(currentStrategies.value),
      path: 'layoutStrategies',
    },
    {
      requested: request.context.layoutProperties,
      current: uniqueIdMap(currentProperties.value),
      path: 'layoutProperties',
    },
  ] as const;
  for (const group of layoutGroups) {
    for (let index = 0; index < group.requested.length; index += 1) {
      const descriptor = group.requested[index]!;
      const currentDescriptor = group.current.get(descriptor.id);
      if (
        currentDescriptor === undefined ||
        currentDescriptor === null ||
        !uiAuthoringDeclarativeEqual(descriptor, currentDescriptor)
      ) {
        return {
          request,
          diagnostic: diagnostic(
            'stale-layout-descriptor',
            'A request layout descriptor is unavailable or changed.',
            `request.context.${group.path}[${index}]`,
          ),
        };
      }
    }
  }

  const designSystem = safeClone(current.designSystemInput);
  if (
    !designSystem.ok ||
    !uiAuthoringDeclarativeEqual(request.context.designSystemInput, designSystem.value)
  ) {
    return {
      request,
      diagnostic: diagnostic(
        'stale-design-system',
        'The request Design System input changed.',
        'request.context.designSystemInput',
      ),
    };
  }

  return { request: deepFreezeUiAuthoringValue(request), diagnostic: null };
}

function planBase(planId: string, request: UiGenerativeUiRequest): UiGenerativeUiPlanBase {
  return {
    schemaVersion: 1,
    planId: isCanonicalText(planId) ? planId : 'invalid-plan',
    requestId: request.requestId,
    documentId: request.context.document.documentId,
    documentRevision: request.context.document.revision,
    sourceDocument: request.context.document,
    selectedNodeIds: request.context.selectedNodeIds,
    projectionContext: request.context.projectionContext,
    designSystemInput: request.context.designSystemInput,
  };
}

function blockedPlan(
  base: UiGenerativeUiPlanBase,
  failure: UiGenerativeUiDiagnostic,
  proposalId?: string,
): UiGenerativeUiBlockedPlan {
  return deepFreezeUiAuthoringValue({
    ...base,
    blocked: true,
    ...(proposalId === undefined ? {} : { proposalId }),
    commands: Object.freeze([]),
    referencedComponentSnapshots: Object.freeze([]),
    referencedLayoutStrategySnapshots: Object.freeze([]),
    referencedLayoutPropertySnapshots: Object.freeze([]),
    diagnostics: Object.freeze([failure]),
  });
}

function isKnownAtomicType(value: string): value is UiDocumentAtomicCommandV3['type'] {
  return Object.prototype.hasOwnProperty.call(ATOMIC_COMMAND_KEYS, value);
}

function commandHasExactKeys(command: Readonly<Record<string, unknown>>): boolean {
  if (typeof command.type !== 'string' || !isKnownAtomicType(command.type)) return false;
  const keys = ATOMIC_COMMAND_KEYS[command.type];
  const required = command.type === 'set-property' ? keys.filter((key) => key !== 'value') : keys;
  const optional = command.type === 'set-property' ? ['value'] : [];
  return hasExactKeys(command, required, optional);
}

function commandHasSafeShape(command: Readonly<Record<string, unknown>>): boolean {
  if (typeof command.type !== 'string' || !isKnownAtomicType(command.type)) return false;
  switch (command.type) {
    case 'insert-node':
      return (
        typeof command.parentId === 'string' &&
        Number.isInteger(command.index) &&
        isRecord(command.node) &&
        typeof command.node.type === 'string'
      );
    case 'remove-node':
      return typeof command.nodeId === 'string';
    case 'replace-node':
      return (
        typeof command.nodeId === 'string' &&
        isRecord(command.node) &&
        typeof command.node.type === 'string'
      );
    case 'move-node':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.targetParentId === 'string' &&
        Number.isInteger(command.index)
      );
    case 'set-property':
      return typeof command.nodeId === 'string' && typeof command.propertyId === 'string';
    case 'set-layout':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.strategyId === 'string' &&
        isRecord(command.values)
      );
    case 'set-input-binding':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.inputId === 'string' &&
        typeof command.bindingId === 'string'
      );
    case 'clear-input-binding':
      return typeof command.nodeId === 'string' && typeof command.inputId === 'string';
    case 'upsert-responsive-variant':
      return isRecord(command.variant);
    case 'remove-responsive-variant':
      return typeof command.variantId === 'string';
    case 'set-responsive-property':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.variantId === 'string' &&
        typeof command.propertyId === 'string' &&
        isRecord(command.value)
      );
    case 'clear-responsive-property':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.variantId === 'string' &&
        typeof command.propertyId === 'string'
      );
    case 'set-responsive-layout':
      return (
        typeof command.nodeId === 'string' &&
        typeof command.variantId === 'string' &&
        typeof command.strategyId === 'string' &&
        isRecord(command.values)
      );
    case 'clear-responsive-layout':
      return typeof command.nodeId === 'string' && typeof command.variantId === 'string';
  }
}

function parseProposal(raw: unknown): SafeClone<UiGenerativeUiProposal> {
  const cloned = safeClone(raw);
  if (!cloned.ok) return cloned;
  const value = cloned.value;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['schemaVersion', 'proposalId', 'requestId', 'commands']) ||
    value.schemaVersion !== 1 ||
    !isCanonicalText(value.proposalId) ||
    !isCanonicalText(value.requestId) ||
    !Array.isArray(value.commands) ||
    value.commands.length === 0
  ) {
    return { ok: false };
  }
  return { ok: true, value: value as unknown as UiGenerativeUiProposal };
}

function requestMaps(context: UiGenerativeAuthoringContextV1): RequestOperandMaps {
  const components = new Map(
    context.componentDescriptors.map((entry) => [componentKey(entry), entry]),
  );
  const strategies = new Map(context.layoutStrategies.map((entry) => [entry.id, entry]));
  return {
    components,
    componentLayoutStrategies: new Map(
      [...components].map(([key, descriptor]) => [
        key,
        new Set(descriptor.layout?.supportedStrategyIds ?? []),
      ]),
    ),
    componentBindings: new Map(
      [...components].map(([key, descriptor]) => [key, uniqueIdMap(descriptor.bindings ?? [])]),
    ),
    componentProperties: new Map(
      [...components].map(([key, descriptor]) => [key, uniqueIdMap(descriptor.properties ?? [])]),
    ),
    strategies,
    strategyContainerProperties: new Map(
      [...strategies].map(([key, strategy]) => [
        key,
        new Set(strategy.supportedContainerProperties),
      ]),
    ),
    strategyProperties: new Map(
      [...strategies].map(([key, strategy]) => [
        key,
        [
          ...new Set([
            ...strategy.supportedContainerProperties,
            ...strategy.supportedChildProperties,
          ]),
        ],
      ]),
    ),
    properties: new Map(context.layoutProperties.map((entry) => [entry.id, entry])),
  };
}

function addLayoutReference(
  strategyId: string,
  values: Readonly<Record<string, UiValueSource>>,
  componentRefKey: string,
  refs: ReferenceSets,
  maps: RequestOperandMaps,
): ReferenceCollectionResult {
  const strategy = maps.strategies.get(strategyId);
  if (strategy === undefined) return 'unsupported';
  if (maps.componentLayoutStrategies.get(componentRefKey)?.has(strategyId) !== true) {
    return 'unsupported';
  }
  const firstStrategyReference = !refs.layoutStrategyIds.has(strategyId);
  refs.layoutStrategyIds.add(strategyId);
  if (firstStrategyReference) {
    for (const propertyId of maps.strategyProperties.get(strategyId) ?? []) {
      if (!maps.properties.has(propertyId)) return 'unsupported';
      refs.layoutPropertyIds.add(propertyId);
    }
  }
  const supported = maps.strategyContainerProperties.get(strategyId)!;
  for (const propertyId of Object.keys(values)) {
    const property = maps.properties.get(propertyId);
    if (
      property === undefined ||
      !supported.has(propertyId) ||
      !property.strategyKinds.includes(strategy.kind)
    ) {
      return 'unsupported';
    }
    refs.layoutPropertyIds.add(propertyId);
  }
  for (const [propertyId, value] of Object.entries(values)) {
    if (validateUiLayoutPropertyValue(maps.properties.get(propertyId)!, value).length > 0) {
      return 'invalid';
    }
  }
  return 'ok';
}

function validateComponentAuthoring(
  authoring: NonNullable<ReturnType<typeof readUiDocumentNodeAuthoringV3>>,
  componentRefKey: string,
  maps: RequestOperandMaps,
): ReferenceCollectionResult {
  let hasInvalidComponentValue = false;
  const propertyDescriptors = maps.componentProperties.get(componentRefKey)!;
  const propertyEntries = [
    ...Object.entries(authoring.properties),
    ...Object.values(authoring.responsiveOverrides ?? {}).flatMap((override) =>
      Object.entries(override.properties ?? {}),
    ),
  ];
  if (
    propertyEntries.some(([propertyId]) => {
      const property = propertyDescriptors.get(propertyId);
      return property === undefined || property === null;
    })
  ) {
    return 'unsupported';
  }
  if (
    propertyEntries.some(
      ([propertyId, value]) =>
        validateUiPropertyValue(propertyDescriptors.get(propertyId)!, value).length > 0,
    )
  ) {
    hasInvalidComponentValue = true;
  }
  const bindingDescriptors = maps.componentBindings.get(componentRefKey)!;
  const bindingEntries = Object.entries(authoring.bindings ?? {});
  for (const [inputId] of bindingEntries) {
    const binding = bindingDescriptors.get(inputId);
    if (binding === undefined || binding === null || binding.direction === 'output') {
      return 'unsupported';
    }
  }
  if (bindingEntries.some(([, bindingId]) => !isCanonicalText(bindingId))) {
    hasInvalidComponentValue = true;
  }
  return hasInvalidComponentValue ? 'invalid' : 'ok';
}

function addNodeAuthoringReferences(
  widget: GenericWidget,
  refs: ReferenceSets,
  maps: RequestOperandMaps,
): ReferenceCollectionResult {
  let entries: ReturnType<typeof collectWidgetNodes>;
  try {
    entries = collectWidgetNodes(widget);
  } catch {
    return 'invalid';
  }
  let hasInvalidOperand = false;
  for (const entry of entries) {
    const authoring = readUiDocumentNodeAuthoringV3(entry.widget);
    if (authoring === null) {
      hasInvalidOperand = true;
      continue;
    }
    const key = componentKey(authoring.component);
    const descriptor = maps.components.get(key);
    if (descriptor === undefined) return 'unsupported';
    refs.componentRefs.add(key);
    const componentResult = validateComponentAuthoring(authoring, key, maps);
    if (componentResult === 'unsupported') return componentResult;
    if (componentResult === 'invalid') hasInvalidOperand = true;
    const layouts = [
      authoring.layout,
      ...Object.values(authoring.responsiveOverrides ?? {}).map((override) => override.layout),
    ].filter((layout) => layout !== undefined);
    let hasInvalidLayout = false;
    for (const layout of layouts) {
      const layoutResult = addLayoutReference(layout.strategyId, layout.values, key, refs, maps);
      if (layoutResult === 'unsupported') return layoutResult;
      if (layoutResult === 'invalid') hasInvalidLayout = true;
    }
    if (hasInvalidLayout) hasInvalidOperand = true;
  }
  return hasInvalidOperand ? 'invalid' : 'ok';
}

function indexReferenceSubtree(
  index: ReferenceDocumentIndex,
  widget: GenericWidget,
  rootParentId: string | null,
): void {
  for (const entry of collectWidgetNodes(widget)) {
    const nodeId = entry.widget.id;
    if (typeof nodeId !== 'string') continue;
    const parentId =
      entry.parent === null
        ? rootParentId
        : typeof entry.parent.id === 'string'
          ? entry.parent.id
          : null;
    const authoring = readUiDocumentNodeAuthoringV3(entry.widget);
    if (authoring !== null) index.authoringByNodeId.set(nodeId, authoring);
    index.parentByNodeId.set(nodeId, parentId);
    if (!index.childrenByNodeId.has(nodeId)) index.childrenByNodeId.set(nodeId, new Set());
    if (parentId !== null) {
      const children = index.childrenByNodeId.get(parentId) ?? new Set<string>();
      children.add(nodeId);
      index.childrenByNodeId.set(parentId, children);
    }
  }
}

function createReferenceDocumentIndex(document: UiDocumentV3): ReferenceDocumentIndex {
  const index: ReferenceDocumentIndex = {
    authoringByNodeId: new Map(),
    childrenByNodeId: new Map(),
    parentByNodeId: new Map(),
  };
  indexReferenceSubtree(index, document.root, null);
  return index;
}

function removeReferenceSubtree(index: ReferenceDocumentIndex, nodeId: string): void {
  for (const childId of [...(index.childrenByNodeId.get(nodeId) ?? [])]) {
    removeReferenceSubtree(index, childId);
  }
  const parentId = index.parentByNodeId.get(nodeId);
  if (parentId !== undefined && parentId !== null) {
    index.childrenByNodeId.get(parentId)?.delete(nodeId);
  }
  index.authoringByNodeId.delete(nodeId);
  index.childrenByNodeId.delete(nodeId);
  index.parentByNodeId.delete(nodeId);
}

function updateReferenceDocumentIndex(
  index: ReferenceDocumentIndex,
  command: UiDocumentAtomicCommandV3,
): void {
  if (command.type === 'insert-node') {
    indexReferenceSubtree(index, command.node, command.parentId);
    return;
  }
  if (command.type === 'replace-node') {
    const parentId = index.parentByNodeId.get(command.nodeId) ?? null;
    removeReferenceSubtree(index, command.nodeId);
    indexReferenceSubtree(index, command.node, parentId);
    return;
  }
  if (command.type === 'remove-node') {
    removeReferenceSubtree(index, command.nodeId);
    return;
  }
  if (command.type === 'move-node') {
    const previousParentId = index.parentByNodeId.get(command.nodeId);
    if (previousParentId !== undefined && previousParentId !== null) {
      index.childrenByNodeId.get(previousParentId)?.delete(command.nodeId);
    }
    const children = index.childrenByNodeId.get(command.targetParentId) ?? new Set<string>();
    children.add(command.nodeId);
    index.childrenByNodeId.set(command.targetParentId, children);
    index.parentByNodeId.set(command.nodeId, command.targetParentId);
    return;
  }
  if (command.type !== 'set-responsive-layout' && command.type !== 'clear-responsive-layout') {
    return;
  }
  const authoring = index.authoringByNodeId.get(command.nodeId);
  if (authoring === undefined) return;
  const overrides = { ...authoring.responsiveOverrides };
  const current = { ...overrides[command.variantId] };
  if (command.type === 'set-responsive-layout') {
    current.layout = { strategyId: command.strategyId, values: command.values };
    overrides[command.variantId] = current;
  } else {
    delete current.layout;
    if (current.properties === undefined || Object.keys(current.properties).length === 0) {
      delete overrides[command.variantId];
    } else {
      overrides[command.variantId] = current;
    }
  }
  const nextAuthoring = { ...authoring } as {
    -readonly [Key in keyof UiDocumentNodeAuthoringV3]: UiDocumentNodeAuthoringV3[Key];
  };
  if (Object.keys(overrides).length === 0) delete nextAuthoring.responsiveOverrides;
  else nextAuthoring.responsiveOverrides = overrides;
  index.authoringByNodeId.set(command.nodeId, nextAuthoring);
}

function collectCommandReferences(
  documentIndex: ReferenceDocumentIndex,
  command: UiDocumentAtomicCommandV3,
  refs: ReferenceSets,
  maps: RequestOperandMaps,
): ReferenceCollectionResult {
  if (command.type === 'insert-node' || command.type === 'replace-node') {
    return addNodeAuthoringReferences(command.node, refs, maps);
  }
  if (
    command.type === 'set-property' ||
    command.type === 'set-input-binding' ||
    command.type === 'clear-input-binding' ||
    command.type === 'set-responsive-property' ||
    command.type === 'clear-responsive-property' ||
    command.type === 'set-layout' ||
    command.type === 'set-responsive-layout' ||
    command.type === 'clear-responsive-layout'
  ) {
    const authoring = documentIndex.authoringByNodeId.get(command.nodeId);
    if (authoring === undefined) return 'ok';
    const key = componentKey(authoring.component);
    const descriptor = maps.components.get(key);
    if (descriptor === undefined) return 'unsupported';
    refs.componentRefs.add(key);
    if (command.type === 'set-property') {
      const property = maps.componentProperties.get(key)!.get(command.propertyId);
      if (property === undefined || property === null) return 'unsupported';
      if (
        command.value !== undefined &&
        validateUiPropertyValue(property, command.value).length > 0
      ) {
        return 'invalid';
      }
    }
    if (command.type === 'set-input-binding' || command.type === 'clear-input-binding') {
      const binding = maps.componentBindings.get(key)!.get(command.inputId);
      if (binding === undefined || binding === null || binding.direction === 'output') {
        return 'unsupported';
      }
      if (command.type === 'set-input-binding' && !isCanonicalText(command.bindingId)) {
        return 'invalid';
      }
    }
    if (
      command.type === 'set-responsive-property' ||
      command.type === 'clear-responsive-property'
    ) {
      const property = maps.componentProperties.get(key)!.get(command.propertyId);
      if (property === undefined || property === null) return 'unsupported';
      if (
        command.type === 'set-responsive-property' &&
        validateUiPropertyValue(property, command.value).length > 0
      ) {
        return 'invalid';
      }
    }
    if (command.type === 'set-layout' || command.type === 'set-responsive-layout') {
      return addLayoutReference(command.strategyId, command.values, key, refs, maps);
    }
    if (command.type === 'clear-responsive-layout') {
      const layout = authoring.responsiveOverrides?.[command.variantId]?.layout;
      return layout === undefined
        ? 'ok'
        : addLayoutReference(layout.strategyId, layout.values, key, refs, maps);
    }
  }
  return 'ok';
}

function approvedContext(
  context: UiGenerativeAuthoringContextV1,
  maps: RequestOperandMaps,
): UiDocumentCommandV3Context {
  return Object.freeze({
    componentCatalog: Object.freeze({
      component(ref: UiComponentRef) {
        return maps.components.get(componentKey(ref));
      },
      components() {
        throw new Error('Generative UI replay cannot enumerate the component catalog.');
      },
    }),
    layoutStrategies: context.layoutStrategies,
    layoutProperties: context.layoutProperties,
  });
}

function admitUiGenerativeUiRequestInternal(
  input: AdmitUiGenerativeUiRequestInput,
): UiGenerativeUiRequestAdmissionResult {
  const verified = verifyRequest(input.request, input);
  return verified.diagnostic === null
    ? deepFreezeUiAuthoringValue({
        status: 'admitted',
        request: verified.request,
        diagnostics: Object.freeze([]),
      })
    : Object.freeze({
        status: 'rejected',
        diagnostics: Object.freeze([verified.diagnostic] as const),
      });
}

export function admitUiGenerativeUiRequest(
  input: AdmitUiGenerativeUiRequestInput,
): UiGenerativeUiRequestAdmissionResult {
  try {
    return admitUiGenerativeUiRequestInternal(input);
  } catch {
    return Object.freeze({
      status: 'rejected',
      diagnostics: Object.freeze([invalidRequest()] as const),
    });
  }
}

function createUiGenerativeUiPlanInternal(
  input: CreateUiGenerativeUiPlanInput,
): UiGenerativeUiPlan {
  const verified = verifyRequest(input.request, input);
  const request = verified.request ?? FALLBACK_REQUEST;
  const base = planBase(input.planId, request);
  if (verified.diagnostic !== null) return blockedPlan(base, verified.diagnostic);

  const proposalResult = parseProposal(input.proposal);
  if (!proposalResult.ok) return blockedPlan(base, invalidProposal());
  const proposal = proposalResult.value;
  for (let index = 0; index < proposal.commands.length; index += 1) {
    const command = proposal.commands[index] as unknown;
    if (!isRecord(command) || typeof command.type !== 'string') {
      return blockedPlan(base, invalidProposal(`proposal.commands[${index}]`), proposal.proposalId);
    }
    if (command.type === 'batch' || !isKnownAtomicType(command.type)) {
      return blockedPlan(
        base,
        invalidProposal(`proposal.commands[${index}].type`),
        proposal.proposalId,
      );
    }
  }

  if (proposal.requestId !== request.requestId) {
    return blockedPlan(
      base,
      diagnostic(
        'request-mismatch',
        'The proposal request id does not match the admitted request.',
        'proposal.requestId',
      ),
      proposal.proposalId,
    );
  }

  const commands = proposal.commands as readonly [
    UiDocumentAtomicCommandV3,
    ...UiDocumentAtomicCommandV3[],
  ];
  const refs: ReferenceSets = {
    componentRefs: new Set(),
    layoutStrategyIds: new Set(),
    layoutPropertyIds: new Set(),
  };
  const maps = requestMaps(request.context);
  const documentIndex = createReferenceDocumentIndex(request.context.document);
  const replayContext = approvedContext(request.context, maps);
  const planIdValid = isCanonicalText(input.planId);
  let replayPlanId = planIdValid ? input.planId : 'generative-plan-validation';
  const proposedCommandIds = new Set(commands.map((command) => command.commandId));
  let replayPlanIdSuffix = 1;
  while (proposedCommandIds.has(replayPlanId)) {
    replayPlanId = `generative-plan-validation-${replayPlanIdSuffix}`;
    replayPlanIdSuffix += 1;
  }
  const seenCommandIds = new Set(planIdValid ? [input.planId] : []);
  const batch = {
    type: 'batch' as const,
    commandId: replayPlanId,
    commands,
  };
  let referenceFailure:
    | {
        readonly result: Exclude<ReferenceCollectionResult, 'ok'>;
        readonly index: number;
        readonly command: UiDocumentAtomicCommandV3;
      }
    | undefined;
  let lastObserved:
    { readonly index: number; readonly command: UiDocumentAtomicCommandV3 } | undefined;
  let previousCommand: UiDocumentAtomicCommandV3 | undefined;
  const applied = applyUiDocumentCommandV3WithReplayObserver(
    request.context.document,
    batch,
    replayContext,
    (_working, command, index) => {
      if (previousCommand !== undefined)
        updateReferenceDocumentIndex(documentIndex, previousCommand);
      lastObserved = { index, command };
      const rawCommand = command as unknown as Readonly<Record<string, unknown>>;
      if (!commandHasExactKeys(rawCommand) || !commandHasSafeShape(rawCommand)) {
        referenceFailure = { result: 'invalid', index, command };
        return false;
      }
      const result = collectCommandReferences(documentIndex, command, refs, maps);
      if (result !== 'ok') {
        referenceFailure = { result, index, command };
        return false;
      }
      if (!isCanonicalText(command.commandId) || seenCommandIds.has(command.commandId)) {
        referenceFailure = { result: 'invalid', index, command };
        return false;
      }
      seenCommandIds.add(command.commandId);
      previousCommand = command;
      return true;
    },
  );
  if (referenceFailure !== undefined) {
    const failure = referenceFailure;
    return blockedPlan(
      base,
      failure.result === 'invalid'
        ? commandDiagnostic(`proposal.commands[${failure.index}]`, failure.command)
        : diagnostic(
            'unsupported',
            'The proposal references an operand outside the approved request context.',
            `proposal.commands[${failure.index}]`,
            {
              commandId: failure.command.commandId,
              ...('nodeId' in failure.command ? { nodeId: failure.command.nodeId } : {}),
            },
          ),
      proposal.proposalId,
    );
  }
  if (!planIdValid) return blockedPlan(base, commandDiagnostic('planId'), proposal.proposalId);
  if (applied.issues.length > 0 || !applied.changed || applied.transaction === null) {
    return blockedPlan(
      base,
      commandDiagnostic(
        lastObserved === undefined
          ? 'proposal.commands'
          : `proposal.commands[${lastObserved.index}]`,
        lastObserved?.command,
      ),
      proposal.proposalId,
    );
  }

  return deepFreezeUiAuthoringValue({
    ...base,
    blocked: false,
    proposalId: proposal.proposalId,
    commands,
    referencedComponentSnapshots: request.context.componentDescriptors.filter((descriptor) =>
      refs.componentRefs.has(componentKey(descriptor)),
    ),
    referencedLayoutStrategySnapshots: request.context.layoutStrategies.filter((descriptor) =>
      refs.layoutStrategyIds.has(descriptor.id),
    ),
    referencedLayoutPropertySnapshots: request.context.layoutProperties.filter((descriptor) =>
      refs.layoutPropertyIds.has(descriptor.id),
    ),
    candidateDocument: applied.document,
    diagnostics: Object.freeze([]),
  });
}

export function createUiGenerativeUiPlan(input: CreateUiGenerativeUiPlanInput): UiGenerativeUiPlan {
  try {
    return createUiGenerativeUiPlanInternal(input);
  } catch {
    return blockedPlan(planBase('invalid-plan', FALLBACK_REQUEST), invalidRequest());
  }
}

export function previewUiGenerativeUiPlan(plan: UiGenerativeUiPlan): UiGenerativeUiPlanPreview {
  return deepFreezeUiAuthoringValue(
    cloneUiAuthoringJsonValue(
      plan.blocked
        ? {
            blocked: true,
            planId: plan.planId,
            commands: [],
            diagnostics: plan.diagnostics,
          }
        : {
            blocked: false,
            planId: plan.planId,
            candidateDocument: plan.candidateDocument,
            commands: plan.commands,
            diagnostics: [],
          },
    ),
  ) as UiGenerativeUiPlanPreview;
}

function finalizeFailure(failure: UiGenerativeUiDiagnostic): UiGenerativeUiPlanFinalizeResult {
  return Object.freeze({ diagnostics: Object.freeze([failure] as const) });
}

export function finalizeUiGenerativeUiPlan(
  plan: UiGenerativeUiPlan,
  context: UiGenerativeUiPlanFinalizeContext,
): UiGenerativeUiPlanFinalizeResult {
  if (!context.acceptAuthorized) {
    return finalizeFailure(
      diagnostic(
        'finalize-not-authorized',
        'Explicit authorization is required before finalizing a generative UI plan.',
        'acceptAuthorized',
      ),
    );
  }
  if (plan.blocked) {
    return finalizeFailure(
      diagnostic('finalize-blocked', 'A blocked generative UI plan cannot be finalized.', 'plan'),
    );
  }
  const currentDocument = safeClone(context.state.document);
  if (
    !currentDocument.ok ||
    currentDocument.value.documentId !== plan.documentId ||
    currentDocument.value.revision !== plan.documentRevision ||
    currentDocument.value.source !== plan.sourceDocument.source ||
    !uiAuthoringDeclarativeEqual(currentDocument.value, plan.sourceDocument)
  ) {
    return finalizeFailure(
      diagnostic('stale-document', 'The document changed after Preview.', 'document'),
    );
  }
  const selection = safeClone(context.state.selectedNodeIds);
  if (!selection.ok || !uiAuthoringDeclarativeEqual(selection.value, plan.selectedNodeIds)) {
    return finalizeFailure(
      diagnostic(
        'stale-selection-context',
        'The ordered selection changed after Preview.',
        'selectedNodeIds',
      ),
    );
  }
  const projection = safeClone(context.projectionContext);
  if (!projection.ok || !uiAuthoringDeclarativeEqual(projection.value, plan.projectionContext)) {
    return finalizeFailure(
      diagnostic(
        'stale-projection-context',
        'The projection context changed after Preview.',
        'projectionContext',
      ),
    );
  }
  for (let index = 0; index < plan.referencedComponentSnapshots.length; index += 1) {
    const snapshot = plan.referencedComponentSnapshots[index]!;
    let current: UiComponentDescriptor | undefined;
    try {
      current = context.componentCatalog.component({ id: snapshot.id, version: snapshot.version });
    } catch {
      current = undefined;
    }
    const captured = safeClone(current);
    if (
      !captured.ok ||
      current === undefined ||
      !uiAuthoringDeclarativeEqual(captured.value, snapshot)
    ) {
      return finalizeFailure(
        diagnostic(
          'stale-component-descriptor',
          'A referenced component descriptor changed after Preview.',
          `referencedComponentSnapshots[${index}]`,
        ),
      );
    }
  }
  const currentStrategies = safeClone(context.layoutStrategies);
  const currentProperties = safeClone(context.layoutProperties);
  if (!currentStrategies.ok || !currentProperties.ok) {
    return finalizeFailure(
      diagnostic(
        'stale-layout-descriptor',
        'The current layout descriptors are not canonical safe data.',
        'layoutStrategies',
      ),
    );
  }
  const layoutGroups = [
    {
      snapshots: plan.referencedLayoutStrategySnapshots,
      current: uniqueIdMap(currentStrategies.value),
      path: 'referencedLayoutStrategySnapshots',
    },
    {
      snapshots: plan.referencedLayoutPropertySnapshots,
      current: uniqueIdMap(currentProperties.value),
      path: 'referencedLayoutPropertySnapshots',
    },
  ] as const;
  for (const group of layoutGroups) {
    for (let index = 0; index < group.snapshots.length; index += 1) {
      const snapshot = group.snapshots[index]!;
      const currentDescriptor = group.current.get(snapshot.id);
      if (
        currentDescriptor === undefined ||
        currentDescriptor === null ||
        !uiAuthoringDeclarativeEqual(currentDescriptor, snapshot)
      ) {
        return finalizeFailure(
          diagnostic(
            'stale-layout-descriptor',
            'A referenced layout descriptor changed after Preview.',
            `${group.path}[${index}]`,
          ),
        );
      }
    }
  }
  const designSystem = safeClone(context.designSystemInput);
  if (
    !designSystem.ok ||
    !uiAuthoringDeclarativeEqual(designSystem.value, plan.designSystemInput)
  ) {
    return finalizeFailure(
      diagnostic(
        'stale-design-system',
        'The Design System input changed after Preview.',
        'designSystemInput',
      ),
    );
  }
  return deepFreezeUiAuthoringValue({
    command: {
      type: 'batch',
      commandId: plan.planId,
      commands: cloneUiAuthoringJsonValue(plan.commands),
    },
    diagnostics: Object.freeze([]),
  });
}
