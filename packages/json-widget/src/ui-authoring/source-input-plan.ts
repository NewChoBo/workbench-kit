import {
  isDesignSystemContributionSource,
  validateUiDesignSystemState,
  validateUiComponentDescriptor,
  type UiComponentDescriptor,
  type UiComponentCatalogContract,
  type UiComponentRef,
} from '@workbench-kit/contracts';
import {
  UI_SOURCE_INPUT_LIMITS,
  resolveUiSourceInputCandidates,
  type UiExactSourceInputCandidate,
  type UiSourceBindingAssignment,
  type UiSourceInputAdmissionIssue,
  type UiSourceInputCandidate,
  type UiSourceInputCandidateSetResult,
  type UiSourceInputIssue,
  type UiSourceInputPlanIssue,
  type UiSourceInputResolution,
  type UiSourceInputStaleIssue,
  type UiSourceInputTargetDescriptor,
  type UiSourceValueDescriptor,
  type UiValueConversionEvidence,
} from '@workbench-kit/contracts/source-input-compatibility';

import { collectWidgetNodes } from '../widget/tree.js';
import { createUiAuthoringDetachedPlan, finalizeUiAuthoringDetachedPlan } from './detached-plan.js';
import { deepFreezeUiAuthoringValue, uiAuthoringDeclarativeEqual } from './immutability.js';
import { readUiDocumentNodeAuthoring, validateUiDocumentRoot } from './document.js';
import type {
  UiAuthoringDesignSystemInputSnapshot,
  UiAuthoringDetachedPlan,
  UiAuthoringRecipeRef,
  UiAuthoringSessionStateV2,
  UiDocumentCommandV2,
} from './types.js';

export interface UiSourceInputComponentLookup {
  readonly component: (ref: UiComponentRef) => unknown;
}

export interface UiAuthoringSourceInputCandidateRequestV1 {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiSourceInputComponentLookup;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence?: readonly UiValueConversionEvidence[];
}

export interface UiAuthoringSourceInputSelection {
  readonly sourceId: string;
  readonly nodeId: string;
  readonly inputId: string;
}

export interface UiAuthoringSourceInputPlanRequestV1 extends UiAuthoringSourceInputCandidateRequestV1 {
  readonly selections: readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
}

export interface UiAuthoringSourceInputRequestSnapshotV1 {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly targets: readonly UiSourceInputTargetDescriptor[];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence: readonly UiValueConversionEvidence[];
  readonly selections?: readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
}

export type UiAuthoringSourceInputCandidateResult =
  | {
      readonly status: 'ready';
      readonly requestSnapshot: UiAuthoringSourceInputRequestSnapshotV1;
      readonly candidates: readonly UiSourceInputCandidate[];
      readonly resolutions: readonly UiSourceInputResolution[];
    }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputAdmissionIssue, ...UiSourceInputAdmissionIssue[]];
      readonly requestSnapshot?: never;
      readonly candidates?: never;
      readonly resolutions?: never;
    };

export interface UiAuthoringSourceInputPlan {
  readonly requestSnapshot: UiAuthoringSourceInputRequestSnapshotV1 & {
    readonly selections: readonly [
      UiAuthoringSourceInputSelection,
      ...UiAuthoringSourceInputSelection[],
    ];
  };
  readonly candidates: readonly UiSourceInputCandidate[];
  readonly resolutions: readonly UiSourceInputResolution[];
  readonly selected: readonly [UiExactSourceInputCandidate, ...UiExactSourceInputCandidate[]];
  readonly detachedPlan: UiAuthoringDetachedPlan & { readonly blocked: false };
}

export type CreateUiAuthoringSourceInputPlanResult =
  | { readonly status: 'ready'; readonly plan: UiAuthoringSourceInputPlan }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]];
      readonly plan?: never;
    };

export interface UiAuthoringSourceInputPlanPreview {
  readonly requestSnapshot: UiAuthoringSourceInputPlan['requestSnapshot'];
  readonly candidates: readonly UiSourceInputCandidate[];
  readonly resolutions: readonly UiSourceInputResolution[];
  readonly selected: UiAuthoringSourceInputPlan['selected'];
  readonly commands: UiAuthoringDetachedPlan['commands'];
}

export interface FinalizeUiAuthoringSourceInputPlanInput {
  readonly plan: UiAuthoringSourceInputPlan;
  readonly current: UiAuthoringSourceInputPlanRequestV1;
}

export type FinalizeUiAuthoringSourceInputPlanResult =
  | { readonly status: 'ready'; readonly command: UiDocumentCommandV2 }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputIssue, ...UiSourceInputIssue[]];
      readonly command?: never;
    };

interface PortableBudget {
  values: number;
}

interface PreparedCandidate {
  readonly result: Extract<UiAuthoringSourceInputCandidateResult, { readonly status: 'ready' }>;
  readonly safeState: UiAuthoringSessionStateV2;
  readonly catalog: UiComponentCatalogContract;
}

interface PreparedOuter {
  readonly outer: Readonly<Record<string, unknown>>;
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly safeState: UiAuthoringSessionStateV2;
  readonly rawCatalog: unknown;
  readonly budget: PortableBudget;
  readonly sourceSnapshot: Extract<
    UiSourceInputCandidateSetResult,
    { readonly status: 'ready' }
  >['snapshot'];
}

type BlockedCandidateResult = Extract<
  UiAuthoringSourceInputCandidateResult,
  { readonly status: 'blocked' }
>;

const ABSENT = Symbol('absent');
const TOO_LARGE = Symbol('too-large');

class PortableLimitError extends TypeError {}

function isCanonicalText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits &&
    value === value.trim()
  );
}

function tupleKey(...values: readonly string[]): string {
  return JSON.stringify(values);
}

function ownData(value: unknown, key: string): unknown | typeof ABSENT {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return ABSENT;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable === true && 'value' in descriptor ? descriptor.value : ABSENT;
  } catch {
    return ABSENT;
  }
}

function strictClonePortable(
  value: unknown,
  budget: PortableBudget,
  depth = 0,
  rootArrayLimit: number = UI_SOURCE_INPUT_LIMITS.maxArrayItems,
): unknown {
  budget.values += 1;
  if (budget.values > UI_SOURCE_INPUT_LIMITS.maxPortableValues) {
    throw new PortableLimitError('portable value budget exceeded');
  }
  if (depth > UI_SOURCE_INPUT_LIMITS.maxPortableDepth) {
    throw new PortableLimitError('portable value depth exceeded');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits) {
      throw new PortableLimitError('portable string limit exceeded');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('portable numbers must be finite');
    return value;
  }
  if (typeof value !== 'object') throw new TypeError('portable value kind is unsupported');

  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    throw new TypeError('portable reflection failed');
  }

  if (isArray) {
    let prototype: object | null;
    let lengthDescriptor: PropertyDescriptor | undefined;
    try {
      prototype = Object.getPrototypeOf(value) as object | null;
      lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    } catch {
      throw new TypeError('portable reflection failed');
    }
    if (
      lengthDescriptor === undefined ||
      !('value' in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      throw new TypeError('portable array length is invalid');
    }
    const length = lengthDescriptor.value as number;
    if (prototype !== Array.prototype) {
      throw new TypeError('portable array is invalid');
    }
    if (
      length >
      (depth === 0
        ? Math.min(UI_SOURCE_INPUT_LIMITS.maxArrayItems, rootArrayLimit)
        : UI_SOURCE_INPUT_LIMITS.maxArrayItems)
    ) {
      throw new PortableLimitError('portable array limit exceeded');
    }
    let keys: readonly (string | symbol)[];
    try {
      keys = Reflect.ownKeys(value);
    } catch {
      throw new TypeError('portable reflection failed');
    }
    if (keys.length !== length + 1 || !keys.includes('length')) {
      throw new TypeError('portable arrays must be dense');
    }
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      } catch {
        throw new TypeError('portable reflection failed');
      }
      if (descriptor?.enumerable !== true || !('value' in descriptor)) {
        throw new TypeError('portable arrays require enumerable data entries');
      }
      result.push(strictClonePortable(descriptor.value, budget, depth + 1));
    }
    return result;
  }

  let prototype: object | null;
  let keys: readonly (string | symbol)[];
  try {
    prototype = Object.getPrototypeOf(value) as object | null;
    keys = Reflect.ownKeys(value);
  } catch {
    throw new TypeError('portable reflection failed');
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('portable objects require a plain prototype');
  }
  if (keys.length > UI_SOURCE_INPUT_LIMITS.maxObjectKeys) {
    throw new PortableLimitError('portable object key limit exceeded');
  }
  if (keys.some((key) => typeof key !== 'string')) {
    throw new TypeError('portable object keys are invalid');
  }
  if (
    (keys as readonly string[]).some(
      (key) => key.length > UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits,
    )
  ) {
    throw new PortableLimitError('portable object key string limit exceeded');
  }
  const result: Record<string, unknown> = {};
  for (const key of [...(keys as readonly string[])].sort()) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw new TypeError('portable reflection failed');
    }
    if (descriptor?.enumerable !== true || !('value' in descriptor)) {
      throw new TypeError('portable objects require enumerable data properties');
    }
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: strictClonePortable(descriptor.value, budget, depth + 1),
    });
  }
  return result;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function hasExactOwnDataShape(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Readonly<Record<string, unknown>> {
  let prototype: object | null;
  let keys: readonly (string | symbol)[];
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    prototype = Object.getPrototypeOf(value) as object | null;
    keys = Reflect.ownKeys(value);
  } catch {
    return false;
  }
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (keys.some((key) => typeof key !== 'string')) return false;
  const stringKeys = keys as readonly string[];
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !stringKeys.includes(key)) ||
    stringKeys.some((key) => !allowed.has(key))
  ) {
    return false;
  }
  try {
    return stringKeys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor?.enumerable === true && 'value' in descriptor;
    });
  } catch {
    return false;
  }
}

function admissionIssue(
  code: UiSourceInputAdmissionIssue['code'],
  message: string,
  path: string,
  coordinates: Partial<Record<'sourceId' | 'nodeId' | 'inputId' | 'conversionId', string>> = {},
): UiSourceInputAdmissionIssue {
  return Object.freeze({ code, message, path, ...coordinates }) as UiSourceInputAdmissionIssue;
}

function planIssue(
  code: UiSourceInputPlanIssue['code'],
  message: string,
  path: string,
  coordinates: Partial<Record<'sourceId' | 'nodeId' | 'inputId' | 'conversionId', string>> = {},
): UiSourceInputPlanIssue {
  return Object.freeze({ code, message, path, ...coordinates }) as UiSourceInputPlanIssue;
}

function staleIssue(
  code: UiSourceInputStaleIssue['code'],
  message: string,
  path: string,
  coordinates: Partial<Record<'sourceId' | 'nodeId' | 'inputId' | 'conversionId', string>> = {},
): UiSourceInputStaleIssue {
  return Object.freeze({ code, message, path, ...coordinates }) as UiSourceInputStaleIssue;
}

function blockedCandidate(
  issue: UiSourceInputAdmissionIssue,
): Extract<UiAuthoringSourceInputCandidateResult, { readonly status: 'blocked' }> {
  return Object.freeze({
    status: 'blocked',
    issues: Object.freeze([issue]) as readonly [UiSourceInputAdmissionIssue],
  });
}

function blockedPlan(
  issues: readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
): Extract<CreateUiAuthoringSourceInputPlanResult, { readonly status: 'blocked' }> {
  const sorted = [...issues].sort(compareIssues);
  return Object.freeze({ status: 'blocked', issues: Object.freeze(sorted) }) as Extract<
    CreateUiAuthoringSourceInputPlanResult,
    { readonly status: 'blocked' }
  >;
}

function compareIssues(left: UiSourceInputIssue, right: UiSourceInputIssue): number {
  for (const [leftValue, rightValue] of [
    [left.path, right.path],
    [left.code, right.code],
    [left.sourceId ?? '', right.sourceId ?? ''],
    [left.nodeId ?? '', right.nodeId ?? ''],
    [left.inputId ?? '', right.inputId ?? ''],
    [left.conversionId ?? '', right.conversionId ?? ''],
  ]) {
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }
  return 0;
}

function blockedFinalize(
  issue: UiSourceInputIssue,
): Extract<FinalizeUiAuthoringSourceInputPlanResult, { readonly status: 'blocked' }> {
  return Object.freeze({
    status: 'blocked',
    issues: Object.freeze([issue]) as readonly [UiSourceInputIssue],
  });
}

function sourceRequestFromOuter(input: unknown):
  | Extract<UiSourceInputCandidateSetResult, { readonly status: 'blocked' }>
  | {
      readonly outer: Readonly<Record<string, unknown>>;
      readonly sourceSnapshot: Extract<
        UiSourceInputCandidateSetResult,
        { readonly status: 'ready' }
      >['snapshot'];
    } {
  let invalidContainer: boolean;
  try {
    invalidContainer = typeof input !== 'object' || input === null || Array.isArray(input);
  } catch {
    invalidContainer = true;
  }
  if (invalidContainer) {
    return {
      status: 'blocked',
      issues: [
        admissionIssue('invalid-request', 'The candidate request must be a plain object.', '$'),
      ],
    };
  }
  const schemaVersion = ownData(input, 'schemaVersion');
  const sources = ownData(input, 'sources');
  const bindings = ownData(input, 'bindings');
  const conversionEvidence = ownData(input, 'conversionEvidence');
  const sourceResult = resolveUiSourceInputCandidates({
    schemaVersion,
    sources,
    targets: [],
    bindings,
    ...(conversionEvidence === ABSENT ? {} : { conversionEvidence }),
  });
  if (sourceResult.status === 'blocked') return sourceResult;
  return {
    outer: input as Readonly<Record<string, unknown>>,
    sourceSnapshot: sourceResult.snapshot,
  };
}

function isSourceAdmissionResult(
  value:
    | Extract<UiSourceInputCandidateSetResult, { readonly status: 'blocked' }>
    | {
        readonly outer: Readonly<Record<string, unknown>>;
        readonly sourceSnapshot: Extract<
          UiSourceInputCandidateSetResult,
          { readonly status: 'ready' }
        >['snapshot'];
      },
): value is Extract<UiSourceInputCandidateSetResult, { readonly status: 'blocked' }> {
  return 'status' in value;
}

function isPreparedCandidate(
  value: PreparedCandidate | BlockedCandidateResult,
): value is PreparedCandidate {
  return 'result' in value;
}

function safeDocumentState(
  rawState: unknown,
  budget: PortableBudget,
): UiAuthoringSessionStateV2 | null | typeof TOO_LARGE {
  const rawDocument = ownData(rawState, 'document');
  const rawRoot = ownData(rawDocument, 'root');
  const rawDocumentId = ownData(rawDocument, 'documentId');
  const rawRevision = ownData(rawDocument, 'revision');
  const rawDesignSystem = ownData(rawDocument, 'designSystem');
  if (
    rawDocument === ABSENT ||
    rawRoot === ABSENT ||
    !isCanonicalText(rawDocumentId) ||
    !Number.isSafeInteger(rawRevision) ||
    (rawRevision as number) < 0
  ) {
    return null;
  }

  const stack: unknown[] = [rawRoot];
  let nodeCount = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    nodeCount += 1;
    if (nodeCount > UI_SOURCE_INPUT_LIMITS.maxDocumentNodes) return TOO_LARGE;
    let nodeIsArray: boolean;
    try {
      nodeIsArray = Array.isArray(node);
    } catch {
      return null;
    }
    if (typeof node !== 'object' || node === null || nodeIsArray) return null;
    const children = ownData(node, 'children');
    const child = ownData(node, 'child');
    if (children !== ABSENT) {
      try {
        if (!Array.isArray(children)) return null;
        const lengthDescriptor = Object.getOwnPropertyDescriptor(children, 'length');
        if (
          lengthDescriptor === undefined ||
          !('value' in lengthDescriptor) ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0
        ) {
          return null;
        }
        const length = lengthDescriptor.value as number;
        if (length > UI_SOURCE_INPUT_LIMITS.maxDocumentNodes) return TOO_LARGE;
        for (let index = length - 1; index >= 0; index -= 1) {
          const descriptor = Object.getOwnPropertyDescriptor(children, String(index));
          if (descriptor?.enumerable !== true || !('value' in descriptor)) return null;
          stack.push(descriptor.value);
        }
      } catch {
        return null;
      }
    }
    if (child !== ABSENT) stack.push(child);
  }

  try {
    const root = strictClonePortable(
      rawRoot,
      budget,
    ) as UiAuthoringSessionStateV2['document']['root'];
    const designSystem = strictClonePortable(
      rawDesignSystem === ABSENT ? null : rawDesignSystem,
      budget,
    ) as UiAuthoringSessionStateV2['document']['designSystem'];
    if (validateUiDocumentRoot(root).length > 0) return null;
    return deepFreezeUiAuthoringValue({
      document: {
        documentId: rawDocumentId,
        revision: rawRevision as number,
        source: '',
        root,
        designSystem,
      },
      selectedNodeIds: Object.freeze([]),
      past: Object.freeze([]),
      future: Object.freeze([]),
    });
  } catch (error) {
    return error instanceof PortableLimitError ? TOO_LARGE : null;
  }
}

function snapshotRecipe(
  rawRecipe: unknown,
  budget: PortableBudget,
): UiAuthoringRecipeRef | null | typeof TOO_LARGE {
  try {
    const recipe = strictClonePortable(rawRecipe, budget) as UiAuthoringRecipeRef;
    if (
      !hasExactKeys(recipe, ['id', 'version', 'provenance']) ||
      !isCanonicalText(recipe.id) ||
      !isCanonicalText(recipe.version) ||
      typeof recipe.provenance !== 'object' ||
      recipe.provenance === null ||
      !hasExactKeys(recipe.provenance, ['source', 'sourceId', 'sourceVersion']) ||
      !isDesignSystemContributionSource(recipe.provenance.source) ||
      !isCanonicalText(recipe.provenance.sourceId) ||
      !isCanonicalText(recipe.provenance.sourceVersion)
    ) {
      return null;
    }
    return deepFreezeUiAuthoringValue(recipe);
  } catch (error) {
    return error instanceof PortableLimitError ? TOO_LARGE : null;
  }
}

function snapshotDesignSystemInput(
  raw: unknown,
  budget: PortableBudget,
): UiAuthoringDesignSystemInputSnapshot | null | typeof TOO_LARGE {
  try {
    const snapshot = strictClonePortable(raw, budget) as UiAuthoringDesignSystemInputSnapshot;
    if (
      !hasExactKeys(
        snapshot,
        snapshot.hostWidth === undefined
          ? ['state', 'registryRevision']
          : ['state', 'registryRevision', 'hostWidth'],
      ) ||
      !Number.isSafeInteger(snapshot.registryRevision) ||
      snapshot.registryRevision < 0 ||
      (snapshot.state !== null && validateUiDesignSystemState(snapshot.state).length > 0) ||
      (snapshot.hostWidth !== undefined &&
        (!Number.isFinite(snapshot.hostWidth) || snapshot.hostWidth <= 0))
    ) {
      return null;
    }
    return deepFreezeUiAuthoringValue(snapshot);
  } catch (error) {
    return error instanceof PortableLimitError ? TOO_LARGE : null;
  }
}

function refKey(ref: UiComponentRef): string {
  return tupleKey(ref.id, ref.version);
}

function ownBindingId(
  bindings: Readonly<Record<string, string>> | undefined,
  inputId: string,
): string | undefined {
  if (bindings === undefined) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(bindings, inputId);
  return descriptor !== undefined && 'value' in descriptor && typeof descriptor.value === 'string'
    ? descriptor.value
    : undefined;
}

function collectTargets(
  state: UiAuthoringSessionStateV2,
  rawCatalog: unknown,
  budget: PortableBudget,
):
  | {
      readonly targets: readonly UiSourceInputTargetDescriptor[];
      readonly descriptors: ReadonlyMap<string, UiComponentDescriptor>;
    }
  | { readonly issues: readonly [UiSourceInputAdmissionIssue, ...UiSourceInputAdmissionIssue[]] } {
  const rawComponent = ownData(rawCatalog, 'component');
  if (typeof rawComponent !== 'function') {
    return {
      issues: Object.freeze([
        admissionIssue(
          'component-catalog-unavailable',
          'The focused component lookup is unavailable.',
          'componentCatalog.component',
          { nodeId: state.document.root.id },
        ),
      ]),
    };
  }
  const nodes = collectWidgetNodes(state.document.root);
  const descriptors = new Map<string, UiComponentDescriptor>();
  const attemptedRefs = new Set<string>();
  const issues: UiSourceInputAdmissionIssue[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    const nodeId = typeof node.widget.id === 'string' ? node.widget.id : '';
    const authoring = readUiDocumentNodeAuthoring(node.widget);
    if (authoring === null) {
      issues.push(
        admissionIssue(
          'invalid-target',
          'The document node is not authorable.',
          `state.document.nodes[${index}]`,
          nodeId === '' ? {} : { nodeId },
        ),
      );
      continue;
    }
    const expectedId = authoring.component.id;
    const expectedVersion = authoring.component.version;
    const frozenRef = Object.freeze({ id: expectedId, version: expectedVersion });
    const key = refKey(frozenRef);
    if (attemptedRefs.has(key)) continue;
    if (attemptedRefs.size >= UI_SOURCE_INPUT_LIMITS.maxComponentLookups) {
      return {
        issues: Object.freeze([
          admissionIssue(
            'request-too-large',
            'The component lookup limit was exceeded.',
            'state.document.root',
          ),
        ]),
      };
    }
    attemptedRefs.add(key);
    try {
      const rawDescriptor = Reflect.apply(rawComponent, rawCatalog, [frozenRef]);
      if (rawDescriptor === undefined) {
        issues.push(
          admissionIssue(
            'component-catalog-unavailable',
            'An exact component descriptor is unavailable.',
            `state.document.nodes[${index}].component`,
            { nodeId },
          ),
        );
        continue;
      }
      const descriptor = strictClonePortable(rawDescriptor, budget) as UiComponentDescriptor;
      if (
        validateUiComponentDescriptor(descriptor).length > 0 ||
        descriptor.id !== expectedId ||
        descriptor.version !== expectedVersion
      ) {
        issues.push(
          admissionIssue(
            'invalid-target',
            'An exact component descriptor is invalid.',
            `state.document.nodes[${index}].component`,
            { nodeId },
          ),
        );
        continue;
      }
      descriptors.set(key, deepFreezeUiAuthoringValue(descriptor));
    } catch (error) {
      if (error instanceof PortableLimitError) {
        return {
          issues: Object.freeze([
            admissionIssue(
              'request-too-large',
              'An exact component descriptor exceeded the portable-data limit.',
              `state.document.nodes[${index}].component`,
            ),
          ]),
        };
      }
      issues.push(
        admissionIssue(
          'component-catalog-unavailable',
          'An exact component descriptor could not be read.',
          `state.document.nodes[${index}].component`,
          { nodeId },
        ),
      );
    }
  }
  if (issues.length > 0)
    return {
      issues: Object.freeze([...issues].sort(compareIssues)) as readonly [
        UiSourceInputAdmissionIssue,
        ...UiSourceInputAdmissionIssue[],
      ],
    };

  const targets: UiSourceInputTargetDescriptor[] = [];
  for (const node of nodes) {
    const authoring = readUiDocumentNodeAuthoring(node.widget)!;
    const descriptor = descriptors.get(refKey(authoring.component))!;
    const nodeId = node.widget.id as string;
    for (const input of descriptor.bindings ?? []) {
      if (targets.length >= UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints) {
        return {
          issues: Object.freeze([
            admissionIssue(
              'request-too-large',
              'The target endpoint limit was exceeded.',
              'state.document.root',
            ),
          ]),
        };
      }
      const currentBindingId = ownBindingId(authoring.bindings, input.id);
      targets.push(
        deepFreezeUiAuthoringValue({
          nodeId,
          component: authoring.component,
          input,
          ...(currentBindingId === undefined ? {} : { currentBindingId }),
        }),
      );
    }
  }
  return { targets: Object.freeze(targets), descriptors };
}

function materialCatalog(
  descriptors: ReadonlyMap<string, UiComponentDescriptor>,
  targets: readonly UiSourceInputTargetDescriptor[],
): UiComponentCatalogContract {
  const bindingsByRef = new Map<string, Map<string, UiSourceInputTargetDescriptor['input']>>();
  for (const target of targets) {
    const key = refKey(target.component);
    const bindings = bindingsByRef.get(key) ?? new Map();
    if (!bindings.has(target.input.id)) bindings.set(target.input.id, target.input);
    bindingsByRef.set(key, bindings);
  }
  const snapshots = new Map<string, UiComponentDescriptor>();
  for (const [key, descriptor] of descriptors) {
    snapshots.set(
      key,
      deepFreezeUiAuthoringValue({
        ...descriptor,
        ...(bindingsByRef.has(key)
          ? { bindings: Object.freeze([...bindingsByRef.get(key)!.values()]) }
          : { bindings: Object.freeze([]) }),
      } as UiComponentDescriptor),
    );
  }
  return Object.freeze({
    component: (ref: UiComponentRef): UiComponentDescriptor | undefined =>
      snapshots.get(refKey(ref)),
    components: (): readonly UiComponentDescriptor[] => Object.freeze([...snapshots.values()]),
  });
}

function prepareOuter(
  input: unknown,
  kind: 'candidate' | 'plan',
): PreparedOuter | BlockedCandidateResult {
  const sourceAdmission = sourceRequestFromOuter(input);
  if (isSourceAdmissionResult(sourceAdmission)) {
    return Object.freeze({ status: 'blocked', issues: sourceAdmission.issues });
  }
  const outer = sourceAdmission.outer;
  const requiredKeys = [
    'schemaVersion',
    'planId',
    'recipe',
    'state',
    'designSystemInput',
    'componentCatalog',
    'sources',
    'bindings',
    ...(kind === 'plan' ? ['selections'] : []),
  ];
  if (!hasExactOwnDataShape(outer, requiredKeys, ['conversionEvidence'])) {
    return blockedCandidate(
      admissionIssue(
        'invalid-request',
        `The ${kind} request must have the exact enumerable own-data shape.`,
        '$',
      ),
    );
  }
  const planId = ownData(outer, 'planId');
  if (
    !isCanonicalText(planId) ||
    `${planId}/source-input/${UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints - 1}`.length >
      UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits
  ) {
    return blockedCandidate(
      admissionIssue(
        'invalid-request',
        'The plan id is not canonical or leaves no child-command suffix budget.',
        'planId',
      ),
    );
  }
  const budget: PortableBudget = { values: 0 };
  const recipe = snapshotRecipe(ownData(outer, 'recipe'), budget);
  if (recipe === TOO_LARGE) {
    return blockedCandidate(
      admissionIssue(
        'request-too-large',
        'The outer Recipe exceeded the portable-data limit.',
        'recipe',
      ),
    );
  }
  if (recipe === null) {
    return blockedCandidate(
      admissionIssue('invalid-request', 'The outer Recipe identity is invalid.', 'recipe'),
    );
  }
  const designSystemInput = snapshotDesignSystemInput(ownData(outer, 'designSystemInput'), budget);
  if (designSystemInput === TOO_LARGE) {
    return blockedCandidate(
      admissionIssue(
        'request-too-large',
        'The Design System input exceeded the portable-data limit.',
        'designSystemInput',
      ),
    );
  }
  if (designSystemInput === null) {
    return blockedCandidate(
      admissionIssue('invalid-request', 'The Design System input is invalid.', 'designSystemInput'),
    );
  }
  const safeState = safeDocumentState(ownData(outer, 'state'), budget);
  if (safeState === TOO_LARGE) {
    return blockedCandidate(
      admissionIssue(
        'request-too-large',
        'The current V2 document exceeded the bounded snapshot limit.',
        'state.document',
      ),
    );
  }
  if (safeState === null) {
    return blockedCandidate(
      admissionIssue(
        'invalid-target',
        'The current V2 document snapshot is invalid.',
        'state.document',
      ),
    );
  }
  return {
    outer,
    planId,
    recipe,
    designSystemInput,
    safeState,
    rawCatalog: ownData(outer, 'componentCatalog'),
    budget,
    sourceSnapshot: sourceAdmission.sourceSnapshot,
  };
}

function prepareCandidateFromOuter(
  preparedOuter: PreparedOuter,
): PreparedCandidate | BlockedCandidateResult {
  const collected = collectTargets(
    preparedOuter.safeState,
    preparedOuter.rawCatalog,
    preparedOuter.budget,
  );
  if ('issues' in collected) {
    return Object.freeze({ status: 'blocked', issues: collected.issues });
  }

  const resolved = resolveUiSourceInputCandidates({
    schemaVersion: 1,
    sources: preparedOuter.sourceSnapshot.sources,
    targets: collected.targets,
    bindings: preparedOuter.sourceSnapshot.bindings,
    ...(preparedOuter.sourceSnapshot.conversionEvidence === undefined
      ? {}
      : { conversionEvidence: preparedOuter.sourceSnapshot.conversionEvidence }),
  });
  if (resolved.status === 'blocked') {
    return Object.freeze({ status: 'blocked', issues: resolved.issues });
  }
  const requestSnapshot = deepFreezeUiAuthoringValue({
    schemaVersion: 1 as const,
    planId: preparedOuter.planId,
    recipe: preparedOuter.recipe,
    documentId: preparedOuter.safeState.document.documentId,
    documentRevision: preparedOuter.safeState.document.revision,
    designSystemInput: preparedOuter.designSystemInput,
    sources: resolved.snapshot.sources,
    targets: resolved.snapshot.targets,
    bindings: resolved.snapshot.bindings,
    conversionEvidence: resolved.snapshot.conversionEvidence ?? Object.freeze([]),
  });
  const result = deepFreezeUiAuthoringValue({
    status: 'ready' as const,
    requestSnapshot,
    candidates: resolved.candidates,
    resolutions: resolved.resolutions,
  });
  return {
    result,
    safeState: preparedOuter.safeState,
    catalog: materialCatalog(collected.descriptors, resolved.snapshot.targets),
  };
}

function prepareCandidate(input: unknown): PreparedCandidate | BlockedCandidateResult {
  const preparedOuter = prepareOuter(input, 'candidate');
  return 'outer' in preparedOuter ? prepareCandidateFromOuter(preparedOuter) : preparedOuter;
}

export function inspectUiAuthoringSourceInputCandidates(
  input: unknown,
): UiAuthoringSourceInputCandidateResult {
  const prepared = prepareCandidate(input);
  return 'result' in prepared ? prepared.result : prepared;
}

function selectionKey(selection: UiAuthoringSourceInputSelection): string {
  return tupleKey(selection.sourceId, selection.nodeId, selection.inputId);
}

function candidateSelectionKey(candidate: UiSourceInputCandidate): string {
  return tupleKey(candidate.sourceId, candidate.target.nodeId, candidate.target.input.id);
}

function snapshotSelections(
  raw: unknown,
):
  | { readonly snapshot: readonly unknown[] }
  | { readonly issues: readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]] } {
  let cloned: unknown;
  try {
    cloned = strictClonePortable(raw, { values: 0 }, 0, UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints);
  } catch (error) {
    return {
      issues: Object.freeze([
        planIssue(
          error instanceof PortableLimitError ? 'request-too-large' : 'invalid-selection',
          error instanceof PortableLimitError
            ? 'Selections exceeded the portable-data limit.'
            : 'Selections must be bounded plain data.',
          'selections',
        ),
      ]),
    };
  }
  if (!Array.isArray(cloned)) {
    return {
      issues: Object.freeze([
        planIssue('invalid-selection', 'Selections must be one bounded array.', 'selections'),
      ]),
    };
  }
  return {
    snapshot: deepFreezeUiAuthoringValue(cloned) as readonly unknown[],
  };
}

function admitSelectionSnapshot(
  snapshot: readonly unknown[],
  sourceIds: readonly string[],
):
  | {
      readonly selections: readonly [
        UiAuthoringSourceInputSelection,
        ...UiAuthoringSourceInputSelection[],
      ];
    }
  | { readonly issues: readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]] } {
  if (snapshot.length === 0) {
    return {
      issues: Object.freeze(
        sourceIds.map((sourceId) =>
          planIssue(
            'selection-required',
            'Every source requires at least one explicit exact selection.',
            'selections',
            { sourceId },
          ),
        ),
      ) as readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
    };
  }
  const seen = new Set<string>();
  const selections: UiAuthoringSourceInputSelection[] = [];
  const issues: UiSourceInputPlanIssue[] = [];
  for (let index = 0; index < snapshot.length; index += 1) {
    const selection = snapshot[index] as Partial<UiAuthoringSourceInputSelection>;
    if (
      typeof selection !== 'object' ||
      selection === null ||
      Object.keys(selection).length !== 3 ||
      !isCanonicalText(selection.sourceId) ||
      !isCanonicalText(selection.nodeId) ||
      !isCanonicalText(selection.inputId)
    ) {
      issues.push(
        planIssue(
          'invalid-selection',
          'An exact selection coordinate is invalid.',
          `selections[${index}]`,
        ),
      );
      continue;
    }
    const safe = selection as UiAuthoringSourceInputSelection;
    const key = selectionKey(safe);
    if (seen.has(key)) {
      issues.push(
        planIssue(
          'invalid-selection',
          'Duplicate exact selections are not allowed.',
          `selections[${index}]`,
          safe,
        ),
      );
      continue;
    }
    seen.add(key);
    selections.push(deepFreezeUiAuthoringValue(safe));
  }
  if (issues.length > 0) {
    return {
      issues: Object.freeze(issues) as readonly [
        UiSourceInputPlanIssue,
        ...UiSourceInputPlanIssue[],
      ],
    };
  }
  return {
    selections: Object.freeze(selections) as readonly [
      UiAuthoringSourceInputSelection,
      ...UiAuthoringSourceInputSelection[],
    ],
  };
}

function normalizeSelections(
  admitted: readonly [UiAuthoringSourceInputSelection, ...UiAuthoringSourceInputSelection[]],
  candidates: readonly UiSourceInputCandidate[],
):
  | readonly [UiAuthoringSourceInputSelection, ...UiAuthoringSourceInputSelection[]]
  | readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]] {
  const byKey = new Map(admitted.map((selection) => [selectionKey(selection), selection]));
  const ordered: UiAuthoringSourceInputSelection[] = [];
  for (const candidate of candidates) {
    const selected = byKey.get(candidateSelectionKey(candidate));
    if (selected !== undefined) ordered.push(selected);
  }
  const orderedKeys = new Set(ordered.map(selectionKey));
  const unavailable = admitted.flatMap((selection, index) =>
    orderedKeys.has(selectionKey(selection))
      ? []
      : [
          planIssue(
            'invalid-selection',
            'A selected source/target pair is unavailable.',
            `selections[${index}]`,
            selection,
          ),
        ],
  );
  if (unavailable.length > 0) {
    return Object.freeze(unavailable) as readonly [
      UiSourceInputPlanIssue,
      ...UiSourceInputPlanIssue[],
    ];
  }
  return Object.freeze(ordered) as readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
}

function createPlanFromPrepared(
  prepared: PreparedCandidate,
  admittedSelections: readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ],
): CreateUiAuthoringSourceInputPlanResult {
  const normalized = normalizeSelections(admittedSelections, prepared.result.candidates);
  if ('code' in normalized[0]) {
    return blockedPlan(
      normalized as readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
    );
  }
  const selections = normalized as readonly [
    UiAuthoringSourceInputSelection,
    ...UiAuthoringSourceInputSelection[],
  ];
  const exactByKey = new Map(
    prepared.result.candidates
      .filter(
        (candidate): candidate is UiExactSourceInputCandidate =>
          candidate.compatibility.kind === 'exact',
      )
      .map((candidate) => [candidateSelectionKey(candidate), candidate]),
  );
  const issues: UiSourceInputPlanIssue[] = [];
  const selected: UiExactSourceInputCandidate[] = [];
  const selectedSources = new Set<string>();
  const targetOwners = new Map<string, string>();
  for (const selection of selections) {
    const candidate = exactByKey.get(selectionKey(selection));
    if (candidate === undefined) {
      issues.push(
        planIssue(
          'invalid-selection',
          'Only exact source/input pairs may be selected.',
          'selections',
          selection,
        ),
      );
      continue;
    }
    const targetKey = tupleKey(selection.nodeId, selection.inputId);
    const owner = targetOwners.get(targetKey);
    if (owner !== undefined && owner !== selection.sourceId) {
      issues.push(
        planIssue(
          'target-contended',
          'One target input cannot have two source owners.',
          'selections',
          selection,
        ),
      );
      continue;
    }
    targetOwners.set(targetKey, selection.sourceId);
    selectedSources.add(selection.sourceId);
    selected.push(candidate);
  }
  for (const source of prepared.result.requestSnapshot.sources) {
    if (!selectedSources.has(source.id)) {
      issues.push(
        planIssue(
          'source-unselected',
          'Every source requires at least one exact selection.',
          'selections',
          { sourceId: source.id },
        ),
      );
    }
  }
  if (issues.length > 0) {
    return blockedPlan(
      Object.freeze(issues) as readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
    );
  }

  const bindingBySource = new Map(
    prepared.result.requestSnapshot.bindings.map((binding) => [
      binding.sourceId,
      binding.bindingId,
    ]),
  );
  const commands: {
    readonly type: 'set-input-binding';
    readonly commandId: string;
    readonly nodeId: string;
    readonly inputId: string;
    readonly bindingId: string;
  }[] = [];
  for (const candidate of selected) {
    const bindingId = bindingBySource.get(candidate.sourceId)!;
    if (candidate.target.currentBindingId === bindingId) continue;
    commands.push({
      type: 'set-input-binding',
      commandId: `${prepared.result.requestSnapshot.planId}/source-input/${commands.length}`,
      nodeId: candidate.target.nodeId,
      inputId: candidate.target.input.id,
      bindingId,
    });
  }
  if (commands.length === 0) {
    return blockedPlan(
      Object.freeze([
        planIssue(
          'no-change',
          'Every selected input already carries the assigned binding.',
          'selections',
        ),
      ]),
    );
  }
  let detachedPlan: UiAuthoringDetachedPlan;
  try {
    detachedPlan = createUiAuthoringDetachedPlan({
      planId: prepared.result.requestSnapshot.planId,
      recipe: prepared.result.requestSnapshot.recipe,
      state: prepared.safeState,
      designSystemInput: prepared.result.requestSnapshot.designSystemInput,
      componentCatalog: prepared.catalog,
      commands,
    });
  } catch {
    return blockedPlan(
      Object.freeze([
        planIssue(
          'invalid-target',
          'The bounded detached-plan delegate rejected the request.',
          'commands',
        ),
      ]),
    );
  }
  if (detachedPlan.blocked) {
    return blockedPlan(
      Object.freeze([
        planIssue('invalid-target', 'The bounded detached plan is blocked.', 'commands'),
      ]),
    );
  }
  const requestSnapshot = deepFreezeUiAuthoringValue({
    ...prepared.result.requestSnapshot,
    selections,
  });
  return deepFreezeUiAuthoringValue({
    status: 'ready' as const,
    plan: {
      requestSnapshot,
      candidates: prepared.result.candidates,
      resolutions: prepared.result.resolutions,
      selected: selected as [UiExactSourceInputCandidate, ...UiExactSourceInputCandidate[]],
      detachedPlan: detachedPlan as UiAuthoringDetachedPlan & { readonly blocked: false },
    },
  });
}

export function createUiAuthoringSourceInputPlan(
  input: unknown,
): CreateUiAuthoringSourceInputPlanResult {
  const preparedOuter = prepareOuter(input, 'plan');
  if (!('outer' in preparedOuter)) {
    return blockedPlan(
      preparedOuter.issues as readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
    );
  }
  const selectionSnapshot = snapshotSelections(ownData(preparedOuter.outer, 'selections'));
  if ('issues' in selectionSnapshot) return blockedPlan(selectionSnapshot.issues);
  const prepared = prepareCandidateFromOuter(preparedOuter);
  if (!isPreparedCandidate(prepared)) {
    return blockedPlan(
      prepared.issues as readonly [UiSourceInputPlanIssue, ...UiSourceInputPlanIssue[]],
    );
  }
  const admittedSelections = admitSelectionSnapshot(
    selectionSnapshot.snapshot,
    preparedOuter.sourceSnapshot.sources.map((source) => source.id),
  );
  if ('issues' in admittedSelections) return blockedPlan(admittedSelections.issues);
  return createPlanFromPrepared(prepared, admittedSelections.selections);
}

export function previewUiAuthoringSourceInputPlan(
  plan: UiAuthoringSourceInputPlan,
): UiAuthoringSourceInputPlanPreview {
  return deepFreezeUiAuthoringValue({
    requestSnapshot: plan.requestSnapshot,
    candidates: plan.candidates,
    resolutions: plan.resolutions,
    selected: plan.selected,
    commands: plan.detachedPlan.commands,
  });
}

function firstDifferentTarget(
  before: readonly UiSourceInputTargetDescriptor[],
  after: readonly UiSourceInputTargetDescriptor[],
  includeBinding: boolean,
): UiSourceInputTargetDescriptor | undefined {
  const normalize = (target: UiSourceInputTargetDescriptor): unknown =>
    includeBinding
      ? target
      : {
          nodeId: target.nodeId,
          component: target.component,
          input: target.input,
        };
  const length = Math.max(before.length, after.length);
  for (let index = 0; index < length; index += 1) {
    const left = before[index];
    const right = after[index];
    if (!uiAuthoringDeclarativeEqual(left && normalize(left), right && normalize(right))) {
      return right ?? left;
    }
  }
  return undefined;
}

function hasPlanSnapshotShape(
  value: unknown,
): value is UiAuthoringSourceInputPlan['requestSnapshot'] {
  if (
    !hasExactOwnDataShape(value, [
      'schemaVersion',
      'planId',
      'recipe',
      'documentId',
      'documentRevision',
      'designSystemInput',
      'sources',
      'targets',
      'bindings',
      'conversionEvidence',
      'selections',
    ])
  ) {
    return false;
  }
  const snapshot = value as Partial<UiAuthoringSourceInputPlan['requestSnapshot']>;
  if (
    snapshot.schemaVersion !== 1 ||
    !isCanonicalText(snapshot.planId) ||
    !isCanonicalText(snapshot.documentId) ||
    !Number.isSafeInteger(snapshot.documentRevision) ||
    (snapshot.documentRevision as number) < 0 ||
    !Array.isArray(snapshot.sources) ||
    snapshot.sources.length === 0 ||
    !Array.isArray(snapshot.targets) ||
    snapshot.targets.length === 0 ||
    !Array.isArray(snapshot.bindings) ||
    snapshot.bindings.length === 0 ||
    !Array.isArray(snapshot.conversionEvidence) ||
    !Array.isArray(snapshot.selections) ||
    snapshot.selections.length === 0
  ) {
    return false;
  }
  const recipe = snapshotRecipe(snapshot.recipe, { values: 0 });
  const designSystemInput = snapshotDesignSystemInput(snapshot.designSystemInput, { values: 0 });
  if (
    recipe === null ||
    recipe === TOO_LARGE ||
    !uiAuthoringDeclarativeEqual(recipe, snapshot.recipe)
  ) {
    return false;
  }
  if (
    designSystemInput === null ||
    designSystemInput === TOO_LARGE ||
    !uiAuthoringDeclarativeEqual(designSystemInput, snapshot.designSystemInput)
  ) {
    return false;
  }
  const resolved = resolveUiSourceInputCandidates({
    schemaVersion: 1,
    sources: snapshot.sources,
    targets: snapshot.targets,
    bindings: snapshot.bindings,
    conversionEvidence: snapshot.conversionEvidence,
  });
  if (resolved.status === 'blocked') return false;
  if (
    !uiAuthoringDeclarativeEqual(resolved.snapshot.sources, snapshot.sources) ||
    !uiAuthoringDeclarativeEqual(resolved.snapshot.targets, snapshot.targets) ||
    !uiAuthoringDeclarativeEqual(resolved.snapshot.bindings, snapshot.bindings) ||
    !uiAuthoringDeclarativeEqual(
      resolved.snapshot.conversionEvidence ?? Object.freeze([]),
      snapshot.conversionEvidence,
    )
  ) {
    return false;
  }
  const admittedSelections = admitSelectionSnapshot(
    snapshot.selections as readonly unknown[],
    resolved.snapshot.sources.map((source) => source.id),
  );
  return (
    !('issues' in admittedSelections) &&
    uiAuthoringDeclarativeEqual(admittedSelections.selections, snapshot.selections)
  );
}

function firstChangedCoordinate<T>(
  before: readonly T[],
  after: readonly T[],
  coordinate: (row: T) => string,
): string | undefined {
  const length = Math.max(before.length, after.length);
  for (let index = 0; index < length; index += 1) {
    const left = before[index];
    const right = after[index];
    if (!uiAuthoringDeclarativeEqual(left, right)) {
      return right === undefined
        ? left === undefined
          ? undefined
          : coordinate(left)
        : coordinate(right);
    }
  }
  return undefined;
}

export function finalizeUiAuthoringSourceInputPlan(
  input: FinalizeUiAuthoringSourceInputPlanInput,
): FinalizeUiAuthoringSourceInputPlanResult {
  if (!hasExactOwnDataShape(input, ['plan', 'current'])) {
    return blockedFinalize(
      staleIssue('stale-plan', 'The finalize request must have the exact own-data shape.', '$'),
    );
  }
  const rawPlan = ownData(input, 'plan');
  const rawCurrent = ownData(input, 'current');
  if (
    rawPlan === ABSENT ||
    rawCurrent === ABSENT ||
    typeof rawPlan !== 'object' ||
    rawPlan === null
  ) {
    return blockedFinalize(
      staleIssue('stale-plan', 'The admitted source-input plan is unavailable.', 'plan'),
    );
  }
  let plan: UiAuthoringSourceInputPlan;
  try {
    const requestSnapshot = strictClonePortable(ownData(rawPlan, 'requestSnapshot'), {
      values: 0,
    });
    const detachedPlan = strictClonePortable(ownData(rawPlan, 'detachedPlan'), { values: 0 });
    if (
      requestSnapshot === ABSENT ||
      detachedPlan === ABSENT ||
      !hasPlanSnapshotShape(requestSnapshot) ||
      typeof detachedPlan !== 'object' ||
      detachedPlan === null ||
      Array.isArray(detachedPlan)
    ) {
      throw new TypeError('missing plan');
    }
    plan = deepFreezeUiAuthoringValue({
      requestSnapshot,
      detachedPlan,
    }) as UiAuthoringSourceInputPlan;
  } catch {
    return blockedFinalize(
      staleIssue('stale-plan', 'The admitted source-input plan is invalid.', 'plan'),
    );
  }
  const preparedOuter = prepareOuter(rawCurrent, 'plan');
  if (!('outer' in preparedOuter)) {
    return Object.freeze({
      status: 'blocked',
      issues: preparedOuter.issues,
    }) as FinalizeUiAuthoringSourceInputPlanResult;
  }
  const before = plan.requestSnapshot;
  if (before.planId !== preparedOuter.planId)
    return blockedFinalize(
      staleIssue('stale-plan', 'The plan id changed after Preview.', 'planId'),
    );
  if (!uiAuthoringDeclarativeEqual(before.recipe, preparedOuter.recipe))
    return blockedFinalize(
      staleIssue('stale-recipe', 'The outer Recipe changed after Preview.', 'recipe'),
    );
  if (!uiAuthoringDeclarativeEqual(before.sources, preparedOuter.sourceSnapshot.sources)) {
    const sourceId = firstChangedCoordinate(
      before.sources,
      preparedOuter.sourceSnapshot.sources,
      (source) => source.id,
    );
    return blockedFinalize(
      staleIssue(
        'stale-source',
        'A source descriptor changed after Preview.',
        'sources',
        sourceId === undefined ? {} : { sourceId },
      ),
    );
  }
  if (!uiAuthoringDeclarativeEqual(before.bindings, preparedOuter.sourceSnapshot.bindings)) {
    const sourceId = firstChangedCoordinate(
      before.bindings,
      preparedOuter.sourceSnapshot.bindings,
      (binding) => binding.sourceId,
    );
    return blockedFinalize(
      staleIssue(
        'stale-assigned-binding',
        'A source binding assignment changed after Preview.',
        'bindings',
        sourceId === undefined ? {} : { sourceId },
      ),
    );
  }
  if (
    !uiAuthoringDeclarativeEqual(
      before.conversionEvidence,
      preparedOuter.sourceSnapshot.conversionEvidence ?? Object.freeze([]),
    )
  )
    return blockedFinalize(
      staleIssue(
        'stale-conversion-evidence',
        'Conversion evidence changed after Preview.',
        'conversionEvidence',
      ),
    );
  if (
    before.documentId !== preparedOuter.safeState.document.documentId ||
    before.documentRevision !== preparedOuter.safeState.document.revision
  )
    return blockedFinalize(
      staleIssue('stale-document', 'The V2 document changed after Preview.', 'state.document'),
    );
  if (!uiAuthoringDeclarativeEqual(before.designSystemInput, preparedOuter.designSystemInput))
    return blockedFinalize(
      staleIssue(
        'stale-design-system',
        'The Design System input changed after Preview.',
        'designSystemInput',
      ),
    );
  const selectionSnapshot = snapshotSelections(ownData(preparedOuter.outer, 'selections'));
  if ('issues' in selectionSnapshot) {
    return blockedFinalize(
      staleIssue('stale-selection', 'Explicit selections are not snapshot-safe.', 'selections'),
    );
  }
  const prepared = prepareCandidateFromOuter(preparedOuter);
  if (!isPreparedCandidate(prepared)) {
    return Object.freeze({
      status: 'blocked',
      issues: prepared.issues,
    }) as FinalizeUiAuthoringSourceInputPlanResult;
  }
  const after = prepared.result.requestSnapshot;
  const catalogDrift = firstDifferentTarget(before.targets, after.targets, false);
  if (catalogDrift !== undefined)
    return blockedFinalize(
      staleIssue(
        'stale-component-catalog',
        'A component target descriptor changed after Preview.',
        'targets',
      ),
    );
  const targetBindingDrift = firstDifferentTarget(before.targets, after.targets, true);
  if (targetBindingDrift !== undefined) {
    const sourceId =
      before.selections?.find(
        (selection) =>
          selection.nodeId === targetBindingDrift.nodeId &&
          selection.inputId === targetBindingDrift.input.id,
      )?.sourceId ?? before.sources[0].id;
    return blockedFinalize(
      staleIssue('stale-target-binding', 'A target binding changed after Preview.', 'targets', {
        sourceId,
        nodeId: targetBindingDrift.nodeId,
        inputId: targetBindingDrift.input.id,
      }),
    );
  }
  const admittedSelections = admitSelectionSnapshot(
    selectionSnapshot.snapshot,
    preparedOuter.sourceSnapshot.sources.map((source) => source.id),
  );
  if ('issues' in admittedSelections) {
    return blockedFinalize(
      staleIssue('stale-selection', 'Explicit selections are no longer admissible.', 'selections'),
    );
  }
  const normalizedSelections = normalizeSelections(
    admittedSelections.selections,
    prepared.result.candidates,
  );
  if (
    'code' in normalizedSelections[0] ||
    !uiAuthoringDeclarativeEqual(before.selections, normalizedSelections)
  ) {
    return blockedFinalize(
      staleIssue(
        'stale-selection',
        'Explicit source/input selections changed after Preview.',
        'selections',
      ),
    );
  }

  const recreated = createPlanFromPrepared(
    prepared,
    normalizedSelections as readonly [
      UiAuthoringSourceInputSelection,
      ...UiAuthoringSourceInputSelection[],
    ],
  );
  if (recreated.status === 'blocked') {
    return blockedFinalize(
      staleIssue(
        'stale-selection',
        'The selected command atoms changed after Preview.',
        'selections',
      ),
    );
  }
  if (!uiAuthoringDeclarativeEqual(plan.detachedPlan, recreated.plan.detachedPlan)) {
    return blockedFinalize(
      staleIssue('stale-plan', 'The detached plan changed after Preview.', 'plan'),
    );
  }
  let finalized;
  try {
    finalized = finalizeUiAuthoringDetachedPlan(plan.detachedPlan, {
      state: prepared.safeState,
      designSystemInput: after.designSystemInput,
      componentCatalog: prepared.catalog,
    });
  } catch {
    return blockedFinalize(
      staleIssue('stale-plan', 'The detached-plan finalizer rejected the admitted plan.', 'plan'),
    );
  }
  if (finalized.command === undefined) {
    return blockedFinalize(
      staleIssue('stale-plan', 'The detached plan is no longer finalizable.', 'plan'),
    );
  }
  return deepFreezeUiAuthoringValue({ status: 'ready' as const, command: finalized.command });
}
