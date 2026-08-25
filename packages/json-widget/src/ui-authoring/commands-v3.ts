import {
  validateUiLayoutPropertyValue,
  validateUiLayoutStrategyDescriptor,
  validateUiPropertyValue,
  type UiComponentDescriptor,
} from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import { applyWidgetPatch, type WidgetPatch } from '../widget/patch.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV2 } from './commands-v2.js';
import {
  createUiDocumentV3FromRoot,
  readUiDocumentNodeAuthoringV3,
  toUiDocumentV2CompatibilityView,
  validateUiDocumentRootV3,
} from './document-v3.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import {
  canonicalizeUiResponsiveVariantCatalog,
  validateUiResponsiveVariantCatalog,
} from './responsive.js';
import {
  UI_DOCUMENT_AUTHORING_ARG,
  type ApplyUiDocumentCommandV3Result,
  type UiDocumentAtomicCommandV2,
  type UiDocumentAtomicCommandV3,
  type UiDocumentCommandIssue,
  type UiDocumentCommandV2Issue,
  type UiDocumentCommandV3,
  type UiDocumentCommandV3Context,
  type UiDocumentCommandV3Issue,
  type UiDocumentIssue,
  type UiDocumentTransactionV3,
  type UiDocumentV3,
  type UiDocumentV3Issue,
  type UiResponsiveNodeOverride,
  type UiResponsiveVariantDescriptor,
} from './types.js';

type V3Issue =
  | UiDocumentIssue
  | UiDocumentV3Issue
  | UiDocumentCommandIssue
  | UiDocumentCommandV2Issue
  | UiDocumentCommandV3Issue;

interface AtomicApplyResult {
  readonly document: UiDocumentV3;
  readonly issues: readonly V3Issue[];
  readonly changed: boolean;
}

const RESPONSIVE_COMMAND_TYPES = Object.freeze([
  'upsert-responsive-variant',
  'remove-responsive-variant',
  'set-responsive-property',
  'clear-responsive-property',
  'set-responsive-layout',
  'clear-responsive-layout',
] as const);

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isResponsiveCommand(
  command: UiDocumentAtomicCommandV3,
): command is Exclude<UiDocumentAtomicCommandV3, UiDocumentAtomicCommandV2> {
  return RESPONSIVE_COMMAND_TYPES.includes(
    command.type as (typeof RESPONSIVE_COMMAND_TYPES)[number],
  );
}

function commandIssue(
  code: UiDocumentCommandV3Issue['code'],
  message: string,
  command: Readonly<Record<string, unknown>>,
): UiDocumentCommandV3Issue {
  return Object.freeze({
    code,
    message,
    ...(typeof command.commandId === 'string' ? { commandId: command.commandId } : {}),
    ...(typeof command.nodeId === 'string' ? { nodeId: command.nodeId } : {}),
    ...(typeof command.inputId === 'string' ? { inputId: command.inputId } : {}),
    ...(typeof command.propertyId === 'string' ? { propertyId: command.propertyId } : {}),
    ...(typeof command.variantId === 'string' ? { variantId: command.variantId } : {}),
  });
}

function fail(
  document: UiDocumentV3,
  ...issues: readonly V3Issue[]
): ApplyUiDocumentCommandV3Result {
  return Object.freeze({
    document,
    transaction: null,
    issues: Object.freeze([...issues]),
    changed: false,
  });
}

function knownAtomicCommand(value: unknown): value is UiDocumentAtomicCommandV3 {
  if (!isPlainRecord(value) || typeof value.type !== 'string') return false;
  if (
    [
      'insert-node',
      'remove-node',
      'replace-node',
      'move-node',
      'set-property',
      'set-layout',
      'set-input-binding',
      'clear-input-binding',
    ].includes(value.type)
  ) {
    return typeof value.commandId === 'string';
  }
  if (!RESPONSIVE_COMMAND_TYPES.includes(value.type as never)) return false;
  if (typeof value.commandId !== 'string') return false;
  if (value.type === 'upsert-responsive-variant') return isPlainRecord(value.variant);
  if (typeof value.variantId !== 'string') return false;
  if (value.type === 'remove-responsive-variant') return true;
  if (typeof value.nodeId !== 'string') return false;
  if (value.type === 'set-responsive-property') {
    return typeof value.propertyId === 'string' && isPlainRecord(value.value);
  }
  if (value.type === 'clear-responsive-property') return typeof value.propertyId === 'string';
  if (value.type === 'set-responsive-layout') {
    return typeof value.strategyId === 'string' && isPlainRecord(value.values);
  }
  return value.type === 'clear-responsive-layout';
}

function validateCommand(command: unknown): readonly UiDocumentCommandV3Issue[] {
  if (!isPlainRecord(command)) {
    return Object.freeze([
      commandIssue(
        'invalid-command-payload',
        'The V3 command payload must be declarative data.',
        {},
      ),
    ]);
  }
  if (command.type === 'batch') {
    if (!isCanonicalText(command.commandId)) {
      return Object.freeze([
        commandIssue('blank-command-id', 'V3 command ids must be canonical.', command),
      ]);
    }
    if (!Array.isArray(command.commands) || command.commands.length === 0) {
      return Object.freeze([
        commandIssue('empty-batch', 'A V3 batch requires at least one atomic command.', command),
      ]);
    }
    const seen = new Set([command.commandId]);
    for (const child of command.commands) {
      if (isPlainRecord(child) && child.type === 'batch') {
        return Object.freeze([
          commandIssue('nested-batch', 'Nested V3 batches are not allowed.', child),
        ]);
      }
      if (!knownAtomicCommand(child)) {
        return Object.freeze([
          commandIssue(
            'invalid-command-payload',
            'A V3 batch child is not a recognized atomic command.',
            isPlainRecord(child) ? child : {},
          ),
        ]);
      }
      if (!isCanonicalText(child.commandId)) {
        return Object.freeze([
          commandIssue('blank-command-id', 'Batch child command ids must be canonical.', child),
        ]);
      }
      if (seen.has(child.commandId)) {
        return Object.freeze([
          commandIssue('duplicate-command-id', 'V3 command ids must be unique.', child),
        ]);
      }
      seen.add(child.commandId);
    }
    return Object.freeze([]);
  }
  if (!knownAtomicCommand(command)) {
    return Object.freeze([
      commandIssue(
        'invalid-command-payload',
        'The V3 command payload is not a recognized command.',
        command,
      ),
    ]);
  }
  if (!isCanonicalText(command.commandId)) {
    return Object.freeze([
      commandIssue('blank-command-id', 'V3 command ids must be canonical.', command),
    ]);
  }
  return Object.freeze([]);
}

function responsiveAuthoring(widget: GenericWidget): Readonly<Record<string, unknown>> {
  return widget[UI_DOCUMENT_AUTHORING_ARG] as Readonly<Record<string, unknown>>;
}

function responsiveOverridesByNode(
  document: UiDocumentV3,
): ReadonlyMap<string, Readonly<Record<string, UiResponsiveNodeOverride>>> {
  const result = new Map<string, Readonly<Record<string, UiResponsiveNodeOverride>>>();
  for (const entry of collectWidgetNodes(document.root)) {
    const authoring = readUiDocumentNodeAuthoringV3(entry.widget);
    if (authoring?.responsiveOverrides !== undefined) {
      result.set(entry.widget.id as string, authoring.responsiveOverrides);
    }
  }
  return result;
}

function replacementIds(command: UiDocumentAtomicCommandV2): ReadonlySet<string> {
  if (
    command.type !== 'replace-node' ||
    !isPlainRecord(command.node) ||
    typeof command.node.type !== 'string'
  ) {
    return new Set();
  }
  return new Set(
    collectWidgetNodes(command.node).flatMap((entry) =>
      typeof entry.widget.id === 'string' ? [entry.widget.id] : [],
    ),
  );
}

function restoreResponsiveState(
  before: UiDocumentV3,
  afterRoot: GenericWidget,
  excludedNodeIds: ReadonlySet<string>,
): GenericWidget {
  const previousOverrides = responsiveOverridesByNode(before);
  const beforeRootAuthoring = responsiveAuthoring(before.root);

  const visit = (widget: GenericWidget, semanticRoot: boolean): GenericWidget => {
    const nodeId = typeof widget.id === 'string' ? widget.id : undefined;
    const rawAuthoring = responsiveAuthoring(widget);
    const authoring = { ...rawAuthoring } as Record<string, unknown>;
    delete authoring.responsiveVariants;
    delete authoring.responsiveOverrides;
    if (semanticRoot && beforeRootAuthoring.documentSchemaVersion === 2) {
      authoring.documentSchemaVersion = 2;
      if (Array.isArray(beforeRootAuthoring.responsiveVariants)) {
        authoring.responsiveVariants = beforeRootAuthoring.responsiveVariants;
      }
    }
    if (nodeId !== undefined && !excludedNodeIds.has(nodeId)) {
      const overrides = previousOverrides.get(nodeId);
      if (overrides !== undefined) authoring.responsiveOverrides = overrides;
    }

    const next = { ...widget, [UI_DOCUMENT_AUTHORING_ARG]: authoring } as GenericWidget;
    if (Array.isArray(widget.children)) {
      next.children = widget.children.map((child) =>
        isPlainRecord(child) && typeof child.type === 'string'
          ? visit(child as GenericWidget, false)
          : child,
      );
    }
    if (isPlainRecord(widget.child) && typeof widget.child.type === 'string') {
      next.child = visit(widget.child as GenericWidget, false);
    }
    return next;
  };
  return visit(afterRoot, true);
}

function payloadContainsResponsiveState(command: UiDocumentAtomicCommandV2): boolean {
  if (command.type !== 'insert-node' && command.type !== 'replace-node') return false;
  if (!isPlainRecord(command.node) || typeof command.node.type !== 'string') return false;
  return collectWidgetNodes(command.node).some((entry) => {
    const authoring = responsiveAuthoring(entry.widget);
    return (
      Object.prototype.hasOwnProperty.call(authoring, 'responsiveVariants') ||
      Object.prototype.hasOwnProperty.call(authoring, 'responsiveOverrides') ||
      authoring.documentSchemaVersion === 2
    );
  });
}

function applyInheritedCommand(
  document: UiDocumentV3,
  command: UiDocumentAtomicCommandV2,
  context: UiDocumentCommandV3Context,
): AtomicApplyResult {
  if (command.type === 'replace-node' && command.nodeId === document.root.id) {
    return {
      document,
      issues: Object.freeze([
        commandIssue(
          'root-structural-command',
          'The semantic root cannot be structurally replaced.',
          command,
        ),
      ]),
      changed: false,
    };
  }
  if (payloadContainsResponsiveState(command)) {
    return {
      document,
      issues: Object.freeze([
        commandIssue(
          'invalid-command-payload',
          'V1 structural payloads cannot contain V3 responsive state.',
          command,
        ),
      ]),
      changed: false,
    };
  }
  const applied = applyUiDocumentCommandV2(
    toUiDocumentV2CompatibilityView(document),
    command,
    context,
  );
  if (applied.issues.length > 0) {
    return { document, issues: applied.issues, changed: false };
  }
  if (!applied.changed) return { document, issues: Object.freeze([]), changed: false };
  const restored = restoreResponsiveState(document, applied.document.root, replacementIds(command));
  const next = createUiDocumentV3FromRoot(document.documentId, document.revision + 1, restored);
  if (next.document === null) return { document, issues: next.issues, changed: false };
  return { document: next.document, issues: Object.freeze([]), changed: true };
}

function resolveResponsiveTarget(
  document: UiDocumentV3,
  command: Extract<
    UiDocumentAtomicCommandV3,
    {
      readonly type:
        | 'set-responsive-property'
        | 'clear-responsive-property'
        | 'set-responsive-layout'
        | 'clear-responsive-layout';
    }
  >,
):
  | {
      readonly entry: ReturnType<typeof collectWidgetNodes>[number];
      readonly authoring: NonNullable<ReturnType<typeof readUiDocumentNodeAuthoringV3>>;
    }
  | V3Issue {
  const entry = collectWidgetNodes(document.root).find(
    (candidate) => candidate.widget.id === command.nodeId,
  );
  if (!entry) {
    return commandIssue(
      'node-not-found',
      `UI document node "${command.nodeId}" was not found.`,
      command,
    );
  }
  const catalog = readUiDocumentNodeAuthoringV3(document.root)?.responsiveVariants ?? [];
  if (!catalog.some((variant) => variant.id === command.variantId)) {
    return Object.freeze({
      code: 'responsive-variant-not-found',
      message: `Responsive variant "${command.variantId}" is not present in the root catalog.`,
      path: `root.${UI_DOCUMENT_AUTHORING_ARG}.responsiveVariants`,
      nodeId: command.nodeId,
      variantId: command.variantId,
    });
  }
  return { entry, authoring: readUiDocumentNodeAuthoringV3(entry.widget)! };
}

function exactComponent(
  context: UiDocumentCommandV3Context,
  authoring: NonNullable<ReturnType<typeof readUiDocumentNodeAuthoringV3>>,
  command: Readonly<Record<string, unknown>>,
): UiComponentDescriptor | UiDocumentCommandV3Issue {
  const descriptor = context.componentCatalog.component(authoring.component);
  return (
    descriptor ??
    commandIssue(
      'component-unavailable',
      `Exact component ${authoring.component.id}@${authoring.component.version} is unavailable.`,
      command,
    )
  );
}

function replaceTargetAuthoring(
  document: UiDocumentV3,
  entry: ReturnType<typeof collectWidgetNodes>[number],
  authoring: Readonly<Record<string, unknown>>,
): AtomicApplyResult {
  let root = applyWidgetPatch(document.root, {
    type: 'replace-widget',
    path: entry.path,
    widget: { ...entry.widget, [UI_DOCUMENT_AUTHORING_ARG]: authoring },
  }).root;
  const rootAuthoring = responsiveAuthoring(root);
  if (rootAuthoring.documentSchemaVersion !== 2) {
    root = {
      ...root,
      [UI_DOCUMENT_AUTHORING_ARG]: { ...rootAuthoring, documentSchemaVersion: 2 },
    };
  }
  const next = createUiDocumentV3FromRoot(document.documentId, document.revision + 1, root);
  if (next.document === null) return { document, issues: next.issues, changed: false };
  return {
    document: next.document,
    issues: Object.freeze([]),
    changed: next.document.source !== document.source,
  };
}

function withResponsiveOverride(
  document: UiDocumentV3,
  entry: ReturnType<typeof collectWidgetNodes>[number],
  variantId: string,
  update: (current: UiResponsiveNodeOverride) => UiResponsiveNodeOverride | null,
): AtomicApplyResult {
  const authoring = responsiveAuthoring(entry.widget);
  const currentOverrides = isPlainRecord(authoring.responsiveOverrides)
    ? (authoring.responsiveOverrides as Readonly<Record<string, UiResponsiveNodeOverride>>)
    : {};
  const nextOverride = update(currentOverrides[variantId] ?? {});
  const nextOverrides = Object.fromEntries(Object.entries(currentOverrides)) as Record<
    string,
    UiResponsiveNodeOverride
  >;
  if (nextOverride === null) delete nextOverrides[variantId];
  else nextOverrides[variantId] = nextOverride;
  const nextAuthoring = { ...authoring } as Record<string, unknown>;
  if (Object.keys(nextOverrides).length === 0) delete nextAuthoring.responsiveOverrides;
  else nextAuthoring.responsiveOverrides = nextOverrides;
  return replaceTargetAuthoring(document, entry, nextAuthoring);
}

function applyResponsiveCommand(
  document: UiDocumentV3,
  command: Exclude<UiDocumentAtomicCommandV3, UiDocumentAtomicCommandV2>,
  context: UiDocumentCommandV3Context,
): AtomicApplyResult {
  const rootAuthoring = responsiveAuthoring(document.root);
  const catalog = (readUiDocumentNodeAuthoringV3(document.root)?.responsiveVariants ??
    []) as readonly UiResponsiveVariantDescriptor[];
  if (command.type === 'upsert-responsive-variant') {
    const nextCatalog = [
      ...catalog.filter((variant) => variant.id !== command.variant.id),
      command.variant,
    ];
    const catalogIssues = validateUiResponsiveVariantCatalog(nextCatalog);
    if (catalogIssues.length > 0) return { document, issues: catalogIssues, changed: false };
    const nextRoot = {
      ...document.root,
      [UI_DOCUMENT_AUTHORING_ARG]: {
        ...rootAuthoring,
        documentSchemaVersion: 2,
        responsiveVariants: canonicalizeUiResponsiveVariantCatalog(nextCatalog),
      },
    };
    const next = createUiDocumentV3FromRoot(document.documentId, document.revision + 1, nextRoot);
    if (next.document === null) return { document, issues: next.issues, changed: false };
    return {
      document: next.document,
      issues: Object.freeze([]),
      changed: next.document.source !== document.source,
    };
  }
  if (!isCanonicalText(command.variantId)) {
    return {
      document,
      issues: Object.freeze([
        commandIssue(
          'invalid-command-payload',
          'Responsive variant ids must be canonical.',
          command,
        ),
      ]),
      changed: false,
    };
  }
  if (command.type === 'remove-responsive-variant') {
    if (!catalog.some((variant) => variant.id === command.variantId)) {
      return { document, issues: Object.freeze([]), changed: false };
    }
    const inUse = collectWidgetNodes(document.root).some((entry) =>
      Object.prototype.hasOwnProperty.call(
        readUiDocumentNodeAuthoringV3(entry.widget)?.responsiveOverrides ?? {},
        command.variantId,
      ),
    );
    if (inUse) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'responsive-variant-in-use',
            `Responsive variant "${command.variantId}" is still referenced by node overrides.`,
            command,
          ),
        ]),
        changed: false,
      };
    }
    const nextCatalog = catalog.filter((variant) => variant.id !== command.variantId);
    const nextAuthoring = { ...rootAuthoring, documentSchemaVersion: 2 } as Record<string, unknown>;
    if (nextCatalog.length === 0) delete nextAuthoring.responsiveVariants;
    else nextAuthoring.responsiveVariants = canonicalizeUiResponsiveVariantCatalog(nextCatalog);
    const next = createUiDocumentV3FromRoot(document.documentId, document.revision + 1, {
      ...document.root,
      [UI_DOCUMENT_AUTHORING_ARG]: nextAuthoring,
    });
    if (next.document === null) return { document, issues: next.issues, changed: false };
    return {
      document: next.document,
      issues: Object.freeze([]),
      changed: next.document.source !== document.source,
    };
  }

  const resolved = resolveResponsiveTarget(document, command);
  if ('code' in resolved) return { document, issues: Object.freeze([resolved]), changed: false };
  const descriptor = exactComponent(context, resolved.authoring, command);
  if ('code' in descriptor)
    return { document, issues: Object.freeze([descriptor]), changed: false };

  if (command.type === 'set-responsive-property') {
    if (!isCanonicalText(command.propertyId)) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-property-override',
            'Responsive property ids must be canonical.',
            command,
          ),
        ]),
        changed: false,
      };
    }
    const properties =
      descriptor.properties?.filter((property) => property.id === command.propertyId) ?? [];
    if (
      properties.length !== 1 ||
      validateUiPropertyValue(properties[0]!, command.value).length > 0
    ) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-property-override',
            `Responsive property "${command.propertyId}" is unavailable or invalid for the exact component.`,
            command,
          ),
        ]),
        changed: false,
      };
    }
    return withResponsiveOverride(document, resolved.entry, command.variantId, (current) => ({
      ...current,
      properties: { ...current.properties, [command.propertyId]: command.value },
    }));
  }
  if (command.type === 'clear-responsive-property') {
    if (!isCanonicalText(command.propertyId)) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-property-override',
            'Responsive property ids must be canonical.',
            command,
          ),
        ]),
        changed: false,
      };
    }
    const properties =
      descriptor.properties?.filter((property) => property.id === command.propertyId) ?? [];
    if (properties.length !== 1) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-property-override',
            `Responsive property "${command.propertyId}" is unavailable for the exact component.`,
            command,
          ),
        ]),
        changed: false,
      };
    }
    return withResponsiveOverride(document, resolved.entry, command.variantId, (current) => {
      if (!Object.prototype.hasOwnProperty.call(current.properties ?? {}, command.propertyId))
        return current;
      const properties = { ...current.properties };
      delete properties[command.propertyId];
      if (Object.keys(properties).length === 0 && current.layout === undefined) return null;
      return {
        ...current,
        ...(Object.keys(properties).length === 0 ? { properties: undefined } : { properties }),
      };
    });
  }
  if (command.type === 'set-responsive-layout') {
    const strategies = context.layoutStrategies.filter(
      (strategy) => strategy.id === command.strategyId,
    );
    const strategy = strategies.length === 1 ? strategies[0] : undefined;
    const componentSupports =
      descriptor.layout?.supportedStrategyIds?.includes(command.strategyId) === true;
    const strategyValid =
      strategy !== undefined &&
      validateUiLayoutStrategyDescriptor(strategy, context.layoutProperties).length === 0;
    const supported = new Set(strategy?.supportedContainerProperties ?? []);
    const valuesValid =
      strategyValid &&
      Object.entries(command.values).every(([propertyId, value]) => {
        const properties = context.layoutProperties.filter(
          (property) =>
            property.id === propertyId && property.strategyKinds.includes(strategy!.kind),
        );
        return (
          supported.has(propertyId) &&
          properties.length === 1 &&
          validateUiLayoutPropertyValue(properties[0]!, value).length === 0
        );
      });
    if (!isCanonicalText(command.strategyId) || !componentSupports || !valuesValid) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-layout-override',
            `Responsive layout strategy "${command.strategyId}" or its values are unavailable or invalid.`,
            command,
          ),
        ]),
        changed: false,
      };
    }
    return withResponsiveOverride(document, resolved.entry, command.variantId, (current) => ({
      ...current,
      layout: { strategyId: command.strategyId, values: command.values },
    }));
  }
  const currentLayout = resolved.authoring.responsiveOverrides?.[command.variantId]?.layout;
  if (currentLayout !== undefined) {
    const strategies = context.layoutStrategies.filter(
      (strategy) => strategy.id === currentLayout.strategyId,
    );
    if (
      strategies.length !== 1 ||
      descriptor.layout?.supportedStrategyIds?.includes(currentLayout.strategyId) !== true
    ) {
      return {
        document,
        issues: Object.freeze([
          commandIssue(
            'invalid-responsive-layout-override',
            `Responsive layout strategy "${currentLayout.strategyId}" is unavailable for the exact component.`,
            command,
          ),
        ]),
        changed: false,
      };
    }
  }
  return withResponsiveOverride(document, resolved.entry, command.variantId, (current) => {
    if (current.layout === undefined) return current;
    if (current.properties === undefined || Object.keys(current.properties).length === 0)
      return null;
    return { properties: current.properties };
  });
}

function hasInputBindings(document: UiDocumentV3): boolean {
  return collectWidgetNodes(document.root).some((entry) => {
    const authoring = responsiveAuthoring(entry.widget);
    return isPlainRecord(authoring.bindings) && Object.keys(authoring.bindings).length > 0;
  });
}

function normalizeBatchVersion(base: UiDocumentV3, candidate: UiDocumentV3): UiDocumentV3 {
  const baseAuthoring = responsiveAuthoring(base.root);
  const candidateAuthoring = responsiveAuthoring(candidate.root);
  if (
    baseAuthoring.documentSchemaVersion === 1 ||
    candidateAuthoring.documentSchemaVersion === 2 ||
    hasInputBindings(candidate) ||
    candidateAuthoring.documentSchemaVersion !== 1
  ) {
    return candidate;
  }
  const nextAuthoring = { ...candidateAuthoring } as Record<string, unknown>;
  delete nextAuthoring.documentSchemaVersion;
  const normalized = createUiDocumentV3FromRoot(candidate.documentId, candidate.revision, {
    ...candidate.root,
    [UI_DOCUMENT_AUTHORING_ARG]: nextAuthoring,
  });
  return normalized.document ?? candidate;
}

function applyAtomicCommand(
  document: UiDocumentV3,
  command: UiDocumentAtomicCommandV3,
  context: UiDocumentCommandV3Context,
): AtomicApplyResult {
  return isResponsiveCommand(command)
    ? applyResponsiveCommand(document, command, context)
    : applyInheritedCommand(document, command, context);
}

export function applyUiDocumentCommandV3(
  document: UiDocumentV3,
  command: UiDocumentCommandV3,
  context: UiDocumentCommandV3Context,
): ApplyUiDocumentCommandV3Result {
  const existingIssues = validateUiDocumentRootV3(document.root);
  if (existingIssues.length > 0) return fail(document, ...existingIssues);

  let safeCommand: UiDocumentCommandV3;
  try {
    safeCommand = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(command));
  } catch (error) {
    return fail(
      document,
      commandIssue(
        'operation-failed',
        error instanceof Error ? error.message : String(error),
        isPlainRecord(command) ? command : {},
      ),
    );
  }
  const commandIssues = validateCommand(safeCommand);
  if (commandIssues.length > 0) return fail(document, ...commandIssues);

  const atomicCommands = safeCommand.type === 'batch' ? safeCommand.commands : [safeCommand];
  let working = document;
  for (const child of atomicCommands) {
    const result = applyAtomicCommand(working, child, context);
    if (result.issues.length > 0) {
      return fail(
        document,
        ...result.issues,
        commandIssue(
          'operation-failed',
          `V3 operation "${child.commandId}" failed; the complete command was rolled back.`,
          child,
        ),
      );
    }
    working = result.document;
  }

  if (safeCommand.type === 'batch') working = normalizeBatchVersion(document, working);

  const next = createUiDocumentV3FromRoot(document.documentId, document.revision + 1, working.root);
  if (next.document === null) return fail(document, ...next.issues);
  if (formatWidgetDocumentJson(document.root) === next.document.source) {
    return Object.freeze({
      document,
      transaction: null,
      issues: Object.freeze([]),
      changed: false,
    });
  }

  const patches: readonly WidgetPatch[] = Object.freeze([
    {
      type: 'replace-widget',
      path: Object.freeze([]),
      widget: cloneUiAuthoringJsonValue(next.document.root),
    },
  ]);
  const transaction = deepFreezeUiAuthoringValue({
    kind: 'document-command',
    transactionId: `${safeCommand.commandId}@${document.revision}->${next.document.revision}`,
    command: safeCommand,
    baseRevision: document.revision,
    nextRevision: next.document.revision,
    patches,
  } satisfies UiDocumentTransactionV3);
  return Object.freeze({
    document: next.document,
    transaction,
    issues: Object.freeze([]),
    changed: true,
  });
}
