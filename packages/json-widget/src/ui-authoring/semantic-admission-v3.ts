import {
  isStructurallyValidUiValueSource,
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  type UiComponentDescriptor,
  type UiPropertyDescriptor,
  type UiValueSource,
} from '@workbench-kit/contracts';

import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV3WithReplayObserver } from './commands-v3.js';
import { createUiDocumentV3FromRoot, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import {
  describeUiCompositionDefinition,
  validateUiCompositionInstance,
  type UiCompositionDefinitionSource,
} from './composition.js';
import {
  cloneUiAuthoringJsonValue,
  deepFreezeUiAuthoringValue,
  uiAuthoringDeclarativeEqual,
} from './immutability.js';
import { createLayoutPropertySupport } from './layout-property-support.js';
import { applyUiAuthoringSessionCommandV3 } from './session-v3.js';
import {
  validateUiDocumentPropertySource,
  type UiDocumentLiteralPolicy,
} from './property-source-validation-v3.js';
import type {
  ApplyUiDocumentCommandV3Result,
  UiAuthoringSessionStateV3,
  UiDocumentAtomicCommandV3,
  UiDocumentCommandV3,
  UiDocumentCommandV3Context,
  UiDocumentV3,
} from './types.js';

export const UI_DOCUMENT_COMMAND_V3_ADMISSION_DIAGNOSTIC_CODES = Object.freeze([
  'invalid-command',
  'component-unavailable',
  'property-unavailable',
  'invalid-property-value',
  'layout-strategy-unavailable',
  'layout-property-unavailable',
  'invalid-layout-value',
  'invalid-structural-subtree',
  'product-policy-rejected',
  'composition-unavailable',
  'invalid-instance-parameters',
  'invalid-composition-definition',
] as const);

export type UiDocumentCommandV3AdmissionDiagnosticCode =
  (typeof UI_DOCUMENT_COMMAND_V3_ADMISSION_DIAGNOSTIC_CODES)[number];

export interface UiDocumentCommandV3AdmissionDiagnostic {
  readonly code: UiDocumentCommandV3AdmissionDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly propertyId?: string;
}

export type {
  UiDocumentLiteralPolicy,
  UiDocumentLiteralPolicyInput,
} from './property-source-validation-v3.js';

export interface UiDocumentCommandV3AdmissionContext extends UiDocumentCommandV3Context {
  readonly validateLiteral?: UiDocumentLiteralPolicy;
  readonly compositionDefinitions?: readonly UiCompositionDefinitionSource[];
}

export type UiDocumentCommandV3AdmissionResult =
  | {
      readonly status: 'accepted';
      readonly command: UiDocumentCommandV3;
    }
  | {
      readonly status: 'rejected';
      readonly diagnostics: readonly [UiDocumentCommandV3AdmissionDiagnostic];
    };

export type UiAuthoringSessionV3AdmissionResult =
  | {
      readonly status: 'applied';
      readonly state: UiAuthoringSessionStateV3;
      readonly commandResult: ApplyUiDocumentCommandV3Result;
    }
  | {
      readonly status: 'rejected';
      readonly state: UiAuthoringSessionStateV3;
      readonly diagnostics: readonly [UiDocumentCommandV3AdmissionDiagnostic];
    };

function snapshotAdmissionContext(
  context: UiDocumentCommandV3AdmissionContext,
): UiDocumentCommandV3AdmissionContext {
  const componentSnapshots = new Map<string, UiComponentDescriptor | undefined>();
  const componentCatalog = Object.freeze({
    component(ref: Readonly<{ readonly id: string; readonly version: string }>) {
      const key = `${ref.id}\u0000${ref.version}`;
      if (componentSnapshots.has(key)) return componentSnapshots.get(key);
      let descriptor: UiComponentDescriptor | undefined;
      try {
        const resolved = context.componentCatalog.component(ref);
        descriptor =
          resolved === undefined
            ? undefined
            : (deepFreezeUiAuthoringValue(
                cloneUiAuthoringJsonValue(resolved),
              ) as UiComponentDescriptor);
      } catch {
        descriptor = undefined;
      }
      componentSnapshots.set(key, descriptor);
      return descriptor;
    },
    components() {
      return Object.freeze(
        [...componentSnapshots.values()].filter(
          (descriptor): descriptor is UiComponentDescriptor => descriptor !== undefined,
        ),
      );
    },
  });
  const validateLiteral = context.validateLiteral;
  return Object.freeze({
    componentCatalog,
    layoutProperties: deepFreezeUiAuthoringValue(
      cloneUiAuthoringJsonValue(context.layoutProperties),
    ),
    layoutStrategies: deepFreezeUiAuthoringValue(
      cloneUiAuthoringJsonValue(context.layoutStrategies),
    ),
    ...(validateLiteral === undefined ? {} : { validateLiteral }),
    ...(context.compositionDefinitions === undefined
      ? {}
      : {
          compositionDefinitions: deepFreezeUiAuthoringValue(
            cloneUiAuthoringJsonValue(context.compositionDefinitions),
          ),
        }),
  });
}

function diagnostic(
  code: UiDocumentCommandV3AdmissionDiagnosticCode,
  message: string,
  path: string,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  propertyId?: string,
): UiDocumentCommandV3AdmissionDiagnostic {
  return Object.freeze({
    code,
    message,
    path,
    ...(command.commandId === undefined ? {} : { commandId: command.commandId }),
    ...(command.nodeId === undefined ? {} : { nodeId: command.nodeId }),
    ...(propertyId === undefined ? {} : { propertyId }),
  });
}

function exactComponent(
  context: UiDocumentCommandV3AdmissionContext,
  node: GenericWidget,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiComponentDescriptor | UiDocumentCommandV3AdmissionDiagnostic {
  const authoring = readUiDocumentNodeAuthoringV3(node);
  if (authoring === null) {
    return diagnostic(
      'invalid-structural-subtree',
      'The authored node envelope is unavailable or invalid.',
      path,
      command,
    );
  }
  let descriptor: UiComponentDescriptor | undefined;
  try {
    descriptor = context.componentCatalog.component(authoring.component);
  } catch {
    descriptor = undefined;
  }
  return (
    descriptor ??
    diagnostic(
      'component-unavailable',
      `Exact component ${authoring.component.id}@${authoring.component.version} is unavailable.`,
      `${path}.component`,
      command,
    )
  );
}

function exactProperty(
  component: UiComponentDescriptor,
  propertyId: string,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiPropertyDescriptor | UiDocumentCommandV3AdmissionDiagnostic {
  const candidates = component.properties?.filter((property) => property.id === propertyId) ?? [];
  return candidates.length === 1
    ? candidates[0]!
    : diagnostic(
        'property-unavailable',
        `Property "${propertyId}" is unavailable for the exact component.`,
        path,
        command,
        propertyId,
      );
}

function validatePropertySource(
  component: UiComponentDescriptor,
  nodeId: string,
  property: UiPropertyDescriptor,
  source: UiValueSource,
  context: UiDocumentCommandV3AdmissionContext,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  const issue = validateUiDocumentPropertySource(
    component,
    nodeId,
    property,
    source,
    context.validateLiteral,
  );
  return issue === null
    ? null
    : diagnostic(issue.code, issue.message, path, command, issue.propertyId);
}

function validateLayout(
  component: UiComponentDescriptor,
  strategyId: string,
  values: Readonly<Record<string, UiValueSource>>,
  context: UiDocumentCommandV3AdmissionContext,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  const strategies = context.layoutStrategies.filter((strategy) => strategy.id === strategyId);
  const strategy = strategies.length === 1 ? strategies[0] : undefined;
  if (
    strategy === undefined ||
    component.layout?.supportedStrategyIds?.includes(strategyId) !== true ||
    validateUiLayoutStrategyDescriptor(strategy, context.layoutProperties).length > 0
  ) {
    return diagnostic(
      'layout-strategy-unavailable',
      `Layout strategy "${strategyId}" is unavailable or invalid for the exact component.`,
      `${path}.strategyId`,
      command,
    );
  }

  const supportsProperty = createLayoutPropertySupport(strategy);
  for (const [propertyId, source] of Object.entries(values)) {
    const candidates = context.layoutProperties.filter(
      (property) => property.id === propertyId && property.strategyKinds.includes(strategy.kind),
    );
    const property = candidates.length === 1 ? candidates[0] : undefined;
    const supported = property !== undefined && supportsProperty(property);
    if (property === undefined || !supported) {
      return diagnostic(
        'layout-property-unavailable',
        `Layout property "${propertyId}" is unavailable for strategy "${strategyId}".`,
        `${path}.values.${propertyId}`,
        command,
        propertyId,
      );
    }
    if (
      !isStructurallyValidUiValueSource(source) ||
      validateUiLayoutPropertyValue(property, source).length > 0
    ) {
      return diagnostic(
        'invalid-layout-value',
        `Layout property "${propertyId}" has an invalid value.`,
        `${path}.values.${propertyId}`,
        command,
        propertyId,
      );
    }
  }
  return null;
}

function validateInstance(
  node: GenericWidget,
  context: UiDocumentCommandV3AdmissionContext,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  const first = validateUiCompositionInstance(node, context).diagnostics[0];
  return first === undefined
    ? null
    : diagnostic(
        first.code === 'invalid-instance-parameters'
          ? 'invalid-instance-parameters'
          : 'composition-unavailable',
        first.message,
        path,
        command,
        first.propertyId,
      );
}

function validateInstanceLayout(
  node: GenericWidget,
  strategyId: string,
  values: Readonly<Record<string, UiValueSource>>,
  context: UiDocumentCommandV3AdmissionContext,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  // Wrapper placement is independent of unavailable parameter metadata.
  const authoring = readUiDocumentNodeAuthoringV3(node)!;
  const strategies = context.layoutStrategies.filter(
    (strategy) => strategy.id === strategyId && strategy.kind === 'canvas',
  );
  if (
    strategies.length !== 1 ||
    Object.keys(values).some(
      (id) =>
        !context.layoutProperties.some(
          (property) => property.id === id && property.scope === 'child',
        ),
    )
  ) {
    return diagnostic(
      'invalid-layout-value',
      'Instance viewports support declared child canvas placement only.',
      path,
      command,
    );
  }
  return validateLayout(
    {
      ...authoring.component,
      kind: 'atomic',
      designTime: { label: 'Composition instance' },
      layout: { supportedStrategyIds: [strategyId] },
    },
    strategyId,
    values,
    context,
    command,
    path,
  );
}

function validateAuthoredNode(
  node: GenericWidget,
  context: UiDocumentCommandV3AdmissionContext,
  command: Readonly<{ readonly commandId?: string; readonly nodeId?: string }>,
  path: string,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  if (node.type === 'composition-instance') {
    const authoring = readUiDocumentNodeAuthoringV3(node);
    if (authoring === null)
      return diagnostic(
        'invalid-structural-subtree',
        'The instance authoring envelope is invalid.',
        path,
        command,
      );
    if (authoring.layout !== undefined) {
      const issue = validateInstanceLayout(
        node,
        authoring.layout.strategyId,
        authoring.layout.values,
        context,
        command,
        path,
      );
      if (issue !== null) return issue;
    }
    return validateInstance(node, context, command, path);
  }
  const component = exactComponent(context, node, command, path);
  if ('code' in component) return component;
  const authoring = readUiDocumentNodeAuthoringV3(node)!;
  const nodeId = typeof node.id === 'string' ? node.id : (command.nodeId ?? '');

  for (const required of component.properties?.filter((property) => property.required) ?? []) {
    if (!Object.prototype.hasOwnProperty.call(authoring.properties, required.id)) {
      return diagnostic(
        'invalid-structural-subtree',
        `Required property "${required.id}" is missing from the authored node.`,
        `${path}.properties.${required.id}`,
        command,
        required.id,
      );
    }
  }
  for (const [propertyId, source] of Object.entries(authoring.properties)) {
    const property = exactProperty(
      component,
      propertyId,
      command,
      `${path}.properties.${propertyId}`,
    );
    if ('code' in property) return property;
    const issue = validatePropertySource(
      component,
      nodeId,
      property,
      source,
      context,
      command,
      `${path}.properties.${propertyId}`,
    );
    if (issue !== null) return issue;
  }
  return authoring.layout === undefined
    ? null
    : validateLayout(
        component,
        authoring.layout.strategyId,
        authoring.layout.values,
        context,
        command,
        `${path}.layout`,
      );
}

/**
 * Validates a complete authored document against one fail-closed context snapshot.
 *
 * Products can add topology and managed-value policy after this generic pass without
 * duplicating Kit-owned descriptor, value-source, layout, or literal admission rules.
 */
export function validateUiDocumentV3AgainstContext(
  document: UiDocumentV3,
  context: UiDocumentCommandV3AdmissionContext,
): readonly UiDocumentCommandV3AdmissionDiagnostic[] {
  let safeContext: UiDocumentCommandV3AdmissionContext;
  try {
    safeContext = snapshotAdmissionContext(context);
  } catch {
    return Object.freeze([
      diagnostic(
        'invalid-structural-subtree',
        'The document validation context could not be safely snapshotted.',
        'document',
        {},
      ),
    ]);
  }

  const diagnostics: UiDocumentCommandV3AdmissionDiagnostic[] = [];
  for (const [index, entry] of collectWidgetNodes(document.root).entries()) {
    const nodeId = typeof entry.widget.id === 'string' ? entry.widget.id : undefined;
    const issue = validateAuthoredNode(
      entry.widget,
      safeContext,
      nodeId === undefined ? {} : { nodeId },
      `document.nodes[${index}]`,
    );
    if (issue !== null) diagnostics.push(issue);
  }
  if (readUiDocumentNodeAuthoringV3(document.root)?.compositionDefinition !== undefined) {
    const first = describeUiCompositionDefinition(document, safeContext).diagnostics[0];
    if (first !== undefined)
      diagnostics.push(
        diagnostic(
          'invalid-composition-definition',
          first.message,
          'document.compositionDefinition',
          {},
          first.propertyId,
        ),
      );
  }
  return Object.freeze(diagnostics);
}

function targetNode(document: UiDocumentV3, nodeId: string): GenericWidget | undefined {
  return collectWidgetNodes(document.root).find((entry) => entry.widget.id === nodeId)?.widget;
}

function validateAtomicCommand(
  document: UiDocumentV3,
  command: UiDocumentAtomicCommandV3,
  context: UiDocumentCommandV3AdmissionContext,
  index: number,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  const path = `command${index < 0 ? '' : `.commands[${index}]`}`;
  if (command.type === 'set-composition-definition') {
    if (command.definition === undefined) return null;
    const candidate = createUiDocumentV3FromRoot(document.documentId, document.revision, {
      ...document.root,
      $authoring: {
        ...document.root.$authoring,
        documentSchemaVersion: 3,
        compositionDefinition: command.definition,
      },
    });
    if (candidate.document === null)
      return diagnostic(
        'invalid-composition-definition',
        candidate.issues[0]!.message,
        path,
        command,
      );
    const first = describeUiCompositionDefinition(candidate.document, context).diagnostics[0];
    return first === undefined
      ? null
      : diagnostic(
          'invalid-composition-definition',
          first.message,
          path,
          command,
          first.propertyId,
        );
  }
  if (command.type === 'insert-node' || command.type === 'replace-node') {
    for (const [subtreeIndex, entry] of collectWidgetNodes(command.node).entries()) {
      const nodePath = `${path}.node.nodes[${subtreeIndex}]`;
      const before =
        command.type === 'replace-node' && typeof entry.widget.id === 'string'
          ? targetNode(document, entry.widget.id)
          : undefined;
      const beforeAuthoring = before === undefined ? null : readUiDocumentNodeAuthoringV3(before);
      const afterAuthoring = readUiDocumentNodeAuthoringV3(entry.widget);
      const unchangedInstance =
        before?.type === 'composition-instance' &&
        entry.widget.type === 'composition-instance' &&
        beforeAuthoring !== null &&
        afterAuthoring !== null &&
        uiAuthoringDeclarativeEqual(beforeAuthoring.component, afterAuthoring.component) &&
        uiAuthoringDeclarativeEqual(beforeAuthoring.properties, afterAuthoring.properties);
      const issue = unchangedInstance
        ? afterAuthoring.layout === undefined
          ? null
          : validateInstanceLayout(
              entry.widget,
              afterAuthoring.layout.strategyId,
              afterAuthoring.layout.values,
              context,
              command,
              nodePath,
            )
        : validateAuthoredNode(entry.widget, context, command, nodePath);
      if (issue !== null) return issue;
    }
    return null;
  }
  if (
    command.type !== 'set-property' &&
    command.type !== 'set-layout' &&
    command.type !== 'set-responsive-property' &&
    command.type !== 'set-responsive-layout' &&
    command.type !== 'clear-responsive-property'
  ) {
    return null;
  }

  const node = targetNode(document, command.nodeId);
  if (node === undefined) {
    return diagnostic(
      'component-unavailable',
      `Authored node "${command.nodeId}" is unavailable.`,
      `${path}.nodeId`,
      command,
    );
  }
  if (node.type === 'composition-instance') {
    if (command.type === 'set-layout') {
      return validateInstanceLayout(
        node,
        command.strategyId,
        command.values,
        context,
        command,
        path,
      );
    }
    if (command.type !== 'set-property')
      return diagnostic(
        'invalid-command',
        'Instance configuration uses base scalar property commands.',
        path,
        command,
      );
    const authoring = readUiDocumentNodeAuthoringV3(node)!;
    const properties = { ...authoring.properties };
    if (command.value === undefined) delete properties[command.propertyId];
    else
      Object.defineProperty(properties, command.propertyId, {
        enumerable: true,
        configurable: true,
        value: command.value,
      });
    return validateInstance(
      { ...node, $authoring: { ...authoring, properties } },
      context,
      command,
      path,
    );
  }
  const component = exactComponent(context, node, command, `${path}.nodeId`);
  if ('code' in component) return component;

  if (command.type === 'set-layout' || command.type === 'set-responsive-layout') {
    return validateLayout(component, command.strategyId, command.values, context, command, path);
  }

  const property = exactProperty(component, command.propertyId, command, `${path}.propertyId`);
  if ('code' in property) return property;
  if (command.type === 'clear-responsive-property') return null;
  if (command.value === undefined) {
    return property.required
      ? diagnostic(
          'invalid-property-value',
          `Required property "${property.id}" cannot be cleared.`,
          `${path}.value`,
          command,
          property.id,
        )
      : null;
  }
  return validatePropertySource(
    component,
    command.nodeId,
    property,
    command.value,
    context,
    command,
    `${path}.value`,
  );
}

function semanticReplayIssue(
  document: UiDocumentV3,
  command: UiDocumentCommandV3,
  context: UiDocumentCommandV3AdmissionContext,
): UiDocumentCommandV3AdmissionDiagnostic | null {
  let semanticIssue: UiDocumentCommandV3AdmissionDiagnostic | null = null;
  const replay = applyUiDocumentCommandV3WithReplayObserver(
    document,
    command,
    context,
    (working, atomic, index) => {
      semanticIssue = validateAtomicCommand(
        working,
        atomic,
        context,
        command.type === 'batch' ? index : -1,
      );
      return semanticIssue === null;
    },
  );
  if (semanticIssue !== null) return semanticIssue;
  if (replay.issues.length === 0) {
    if (readUiDocumentNodeAuthoringV3(replay.document.root)?.compositionDefinition !== undefined) {
      const first = describeUiCompositionDefinition(replay.document, context).diagnostics[0];
      if (first !== undefined)
        return diagnostic(
          'invalid-composition-definition',
          first.message,
          'document.compositionDefinition',
          command,
          first.propertyId,
        );
    }
    return null;
  }
  const first = replay.issues[0]!;
  return diagnostic(
    'invalid-command',
    first.message,
    'path' in first ? first.path : 'command',
    {
      ...('commandId' in first && first.commandId !== undefined
        ? { commandId: first.commandId }
        : {}),
      ...('nodeId' in first && first.nodeId !== undefined ? { nodeId: first.nodeId } : {}),
    },
    'propertyId' in first ? first.propertyId : undefined,
  );
}

function rejectedAdmission(
  issue: UiDocumentCommandV3AdmissionDiagnostic,
): UiDocumentCommandV3AdmissionResult {
  return Object.freeze({
    status: 'rejected',
    diagnostics: Object.freeze([issue]) as readonly [UiDocumentCommandV3AdmissionDiagnostic],
  });
}

export function admitUiDocumentCommandV3(
  document: UiDocumentV3,
  command: UiDocumentCommandV3,
  context: UiDocumentCommandV3AdmissionContext,
): UiDocumentCommandV3AdmissionResult {
  let safeCommand: UiDocumentCommandV3;
  try {
    safeCommand = deepFreezeUiAuthoringValue(
      cloneUiAuthoringJsonValue(command),
    ) as UiDocumentCommandV3;
  } catch {
    return Object.freeze({
      status: 'rejected',
      diagnostics: Object.freeze([
        diagnostic(
          'invalid-command',
          'The V3 command could not be safely admitted.',
          'command',
          {},
        ),
      ]) as readonly [UiDocumentCommandV3AdmissionDiagnostic],
    });
  }

  let safeContext: UiDocumentCommandV3AdmissionContext;
  try {
    safeContext = snapshotAdmissionContext(context);
  } catch {
    return rejectedAdmission(
      diagnostic(
        'invalid-command',
        'The V3 admission context could not be safely snapshotted.',
        'context',
        {},
      ),
    );
  }

  const genericContext: UiDocumentCommandV3AdmissionContext = Object.freeze({
    componentCatalog: safeContext.componentCatalog,
    layoutProperties: safeContext.layoutProperties,
    layoutStrategies: safeContext.layoutStrategies,
    ...(safeContext.compositionDefinitions === undefined
      ? {}
      : { compositionDefinitions: safeContext.compositionDefinitions }),
  });
  const genericIssue = semanticReplayIssue(document, safeCommand, genericContext);
  if (genericIssue !== null) return rejectedAdmission(genericIssue);

  if (safeContext.validateLiteral !== undefined) {
    const policyIssue = semanticReplayIssue(document, safeCommand, safeContext);
    if (policyIssue !== null) return rejectedAdmission(policyIssue);
  }
  return Object.freeze({ status: 'accepted', command: safeCommand });
}

export function applyAdmittedUiAuthoringSessionCommandV3(
  state: UiAuthoringSessionStateV3,
  command: UiDocumentCommandV3,
  context: UiDocumentCommandV3AdmissionContext,
): UiAuthoringSessionV3AdmissionResult {
  const admission = admitUiDocumentCommandV3(state.document, command, context);
  if (admission.status === 'rejected') {
    return Object.freeze({ status: 'rejected', state, diagnostics: admission.diagnostics });
  }
  const applied = applyUiAuthoringSessionCommandV3(state, admission.command, context);
  if (applied.commandResult.issues.length > 0) {
    const first = applied.commandResult.issues[0]!;
    return Object.freeze({
      status: 'rejected',
      state,
      diagnostics: Object.freeze([
        diagnostic(
          'invalid-command',
          'The admitted V3 command could not be applied against the current operands.',
          'command',
          {
            commandId: admission.command.commandId,
            ...('nodeId' in first && first.nodeId !== undefined ? { nodeId: first.nodeId } : {}),
          },
          'propertyId' in first ? first.propertyId : undefined,
        ),
      ]) as readonly [UiDocumentCommandV3AdmissionDiagnostic],
    });
  }
  return Object.freeze({ status: 'applied', ...applied });
}
