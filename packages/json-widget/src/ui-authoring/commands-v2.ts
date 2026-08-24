import type { UiComponentBindingDescriptor } from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import { applyWidgetPatch, type WidgetPatch } from '../widget/patch.js';
import { collectWidgetNodes } from '../widget/tree.js';
import { applyUiDocumentCommand } from './commands.js';
import {
  createUiDocumentFromRoot,
  readUiDocumentNodeAuthoring,
  validateUiDocumentRoot,
} from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  ApplyUiDocumentCommandV2Result,
  UiDocument,
  UiDocumentAtomicCommandV2,
  UiDocumentCommand,
  UiDocumentCommandIssue,
  UiDocumentCommandV2,
  UiDocumentCommandV2Context,
  UiDocumentCommandV2Issue,
  UiDocumentIssue,
  UiDocumentNode,
  UiDocumentTransactionV2,
} from './types.js';

type V2Issue = UiDocumentIssue | UiDocumentCommandIssue | UiDocumentCommandV2Issue;

interface AtomicApplyResult {
  readonly document: UiDocument;
  readonly patches: readonly WidgetPatch[];
  readonly issues: readonly V2Issue[];
  readonly changed: boolean;
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownAtomicCommandValue(value: unknown): value is UiDocumentAtomicCommandV2 {
  if (!isPlainRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'set-input-binding') {
    return (
      typeof value.commandId === 'string' &&
      typeof value.nodeId === 'string' &&
      typeof value.inputId === 'string' &&
      typeof value.bindingId === 'string'
    );
  }
  if (value.type === 'clear-input-binding') {
    return (
      typeof value.commandId === 'string' &&
      typeof value.nodeId === 'string' &&
      typeof value.inputId === 'string'
    );
  }
  return [
    'insert-node',
    'remove-node',
    'replace-node',
    'move-node',
    'set-property',
    'set-layout',
  ].includes(value.type);
}

function isKnownCommandValue(value: unknown): value is UiDocumentCommandV2 {
  return (
    isKnownAtomicCommandValue(value) ||
    (isPlainRecord(value) &&
      value.type === 'batch' &&
      typeof value.commandId === 'string' &&
      Array.isArray(value.commands))
  );
}

function fail(document: UiDocument, ...issues: readonly V2Issue[]): ApplyUiDocumentCommandV2Result {
  return Object.freeze({
    document,
    transaction: null,
    issues: Object.freeze([...issues]),
    changed: false,
  });
}

function commandIssue(
  code: UiDocumentCommandV2Issue['code'],
  message: string,
  command: { readonly commandId?: unknown; readonly nodeId?: unknown; readonly inputId?: unknown },
): UiDocumentCommandV2Issue {
  return Object.freeze({
    code,
    message,
    ...(typeof command.commandId === 'string' ? { commandId: command.commandId } : {}),
    ...(typeof command.nodeId === 'string' ? { nodeId: command.nodeId } : {}),
    ...(typeof command.inputId === 'string' ? { inputId: command.inputId } : {}),
  });
}

function resolveInput(
  document: UiDocument,
  command: Extract<
    UiDocumentAtomicCommandV2,
    { readonly type: 'set-input-binding' | 'clear-input-binding' }
  >,
  context: UiDocumentCommandV2Context,
):
  | {
      readonly node: UiDocumentNode;
      readonly path: ReturnType<typeof collectWidgetNodes>[number]['path'];
      readonly input: UiComponentBindingDescriptor;
    }
  | UiDocumentCommandV2Issue {
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
  const authoring = readUiDocumentNodeAuthoring(entry.widget)!;
  const descriptor = context.componentCatalog.component(authoring.component);
  if (!descriptor) {
    return commandIssue(
      'component-unavailable',
      `Exact component ${authoring.component.id}@${authoring.component.version} is unavailable.`,
      command,
    );
  }
  const input = descriptor.bindings?.find((candidate) => candidate.id === command.inputId);
  if (!input) {
    return commandIssue(
      'input-unavailable',
      `Exact component input "${command.inputId}" is unavailable.`,
      command,
    );
  }
  if (input.direction === 'output') {
    return commandIssue(
      'input-output-only',
      `Component endpoint "${command.inputId}" is output-only.`,
      command,
    );
  }
  return { node: entry.widget as UiDocumentNode, path: entry.path, input };
}

function hasEndpointBindings(document: UiDocument): boolean {
  return collectWidgetNodes(document.root).some((entry) => {
    const raw = entry.widget.$authoring as unknown as Readonly<Record<string, unknown>>;
    return (
      raw.bindings !== null &&
      typeof raw.bindings === 'object' &&
      !Array.isArray(raw.bindings) &&
      Object.keys(raw.bindings).length > 0
    );
  });
}

function normalizeBatchVersion(base: UiDocument, candidate: UiDocument): UiDocument {
  const baseAuthoring = base.root.$authoring as unknown as Readonly<Record<string, unknown>>;
  if (baseAuthoring.documentSchemaVersion === 1 || hasEndpointBindings(candidate)) return candidate;

  const candidateAuthoring = candidate.root.$authoring as unknown as Readonly<
    Record<string, unknown>
  >;
  if (!Object.prototype.hasOwnProperty.call(candidateAuthoring, 'documentSchemaVersion')) {
    return candidate;
  }
  const nextAuthoring = { ...candidateAuthoring } as Record<string, unknown>;
  delete nextAuthoring.documentSchemaVersion;
  const next = createUiDocumentFromRoot(candidate.documentId, candidate.revision, {
    ...candidate.root,
    $authoring: nextAuthoring,
  });
  return next.document ?? candidate;
}

function applyBindingCommand(
  document: UiDocument,
  command: Extract<
    UiDocumentAtomicCommandV2,
    { readonly type: 'set-input-binding' | 'clear-input-binding' }
  >,
  context: UiDocumentCommandV2Context,
): AtomicApplyResult {
  if (command.type === 'set-input-binding' && !isCanonicalText(command.bindingId)) {
    return {
      document,
      patches: Object.freeze([]),
      issues: Object.freeze([
        commandIssue(
          'invalid-binding-id',
          'Input binding ids must be non-blank and already trimmed.',
          command,
        ),
      ]),
      changed: false,
    };
  }
  const resolved = resolveInput(document, command, context);
  if ('code' in resolved) {
    return {
      document,
      patches: Object.freeze([]),
      issues: Object.freeze([resolved]),
      changed: false,
    };
  }

  const authoring = resolved.node.$authoring as unknown as Readonly<Record<string, unknown>>;
  const currentBindings =
    authoring.bindings !== null &&
    typeof authoring.bindings === 'object' &&
    !Array.isArray(authoring.bindings)
      ? (authoring.bindings as Readonly<Record<string, string>>)
      : {};
  const currentDescriptor = Object.getOwnPropertyDescriptor(currentBindings, command.inputId);
  const current =
    currentDescriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(currentDescriptor, 'value') &&
    typeof currentDescriptor.value === 'string'
      ? currentDescriptor.value
      : undefined;
  if (
    (command.type === 'set-input-binding' && current === command.bindingId) ||
    (command.type === 'clear-input-binding' && current === undefined)
  ) {
    return {
      document,
      patches: Object.freeze([]),
      issues: Object.freeze([]),
      changed: false,
    };
  }

  const bindings = Object.fromEntries(Object.entries(currentBindings)) as Record<string, string>;
  if (command.type === 'set-input-binding') {
    Object.defineProperty(bindings, command.inputId, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: command.bindingId,
    });
  } else delete bindings[command.inputId];
  const nextAuthoring = { ...authoring } as Record<string, unknown>;
  if (Object.keys(bindings).length === 0) delete nextAuthoring.bindings;
  else nextAuthoring.bindings = bindings;
  const replacement = {
    ...resolved.node,
    $authoring: nextAuthoring,
  } as unknown as UiDocumentNode;
  const patches: WidgetPatch[] = [
    { type: 'replace-widget', path: resolved.path, widget: replacement },
  ];
  let applied = applyWidgetPatch(document.root, patches[0]!);
  if (!applied.changed) {
    return {
      document,
      patches: Object.freeze([]),
      issues: Object.freeze([
        commandIssue('operation-failed', 'The input binding patch was rejected.', command),
      ]),
      changed: false,
    };
  }

  const rootAuthoring = applied.root.$authoring as unknown as Readonly<Record<string, unknown>>;
  if (command.type === 'set-input-binding' && rootAuthoring.documentSchemaVersion !== 1) {
    const rootReplacement = {
      ...applied.root,
      $authoring: { ...rootAuthoring, documentSchemaVersion: 1 },
    } as UiDocumentNode;
    const rootPatch: WidgetPatch = {
      type: 'replace-widget',
      path: [],
      widget: rootReplacement,
    };
    patches.push(rootPatch);
    applied = applyWidgetPatch(applied.root, rootPatch);
  }

  const next = createUiDocumentFromRoot(document.documentId, document.revision + 1, applied.root);
  if (next.document === null) {
    return {
      document,
      patches: Object.freeze([]),
      issues: next.issues,
      changed: false,
    };
  }
  return {
    document: next.document,
    patches: Object.freeze(patches.map((patch) => cloneUiAuthoringJsonValue(patch))),
    issues: Object.freeze([]),
    changed: true,
  };
}

function applyAtomicCommand(
  document: UiDocument,
  command: UiDocumentAtomicCommandV2,
  context: UiDocumentCommandV2Context,
): AtomicApplyResult {
  if (command.type === 'set-input-binding' || command.type === 'clear-input-binding') {
    return applyBindingCommand(document, command, context);
  }
  const result = applyUiDocumentCommand(document, command as UiDocumentCommand);
  return {
    document: result.document,
    patches: result.transaction?.patches ?? Object.freeze([]),
    issues: result.issues,
    changed: result.changed,
  };
}

function validateCommandIds(command: UiDocumentCommandV2): readonly UiDocumentCommandV2Issue[] {
  if (!isCanonicalText(command.commandId)) {
    return Object.freeze([
      commandIssue('blank-command-id', 'UI document command id must be canonical.', command),
    ]);
  }
  if (command.type !== 'batch') return Object.freeze([]);
  if (!Array.isArray(command.commands) || command.commands.length === 0) {
    return Object.freeze([
      commandIssue('empty-batch', 'A V2 batch requires at least one atomic command.', command),
    ]);
  }
  const seen = new Set([command.commandId]);
  for (const candidate of command.commands as readonly unknown[]) {
    if (isPlainRecord(candidate) && candidate.type === 'batch') {
      return Object.freeze([
        commandIssue('nested-batch', 'Nested V2 batches are not allowed.', candidate),
      ]);
    }
    if (!isKnownAtomicCommandValue(candidate)) {
      return Object.freeze([
        commandIssue(
          'invalid-command-payload',
          'A V2 batch child is not a recognized atomic command.',
          isPlainRecord(candidate) ? candidate : {},
        ),
      ]);
    }
    const child = candidate;
    if (!isCanonicalText(child.commandId)) {
      return Object.freeze([
        commandIssue('blank-command-id', 'Batch child command ids must be canonical.', child),
      ]);
    }
    if (seen.has(child.commandId)) {
      return Object.freeze([
        commandIssue('duplicate-command-id', 'V2 command ids must be unique.', child),
      ]);
    }
    seen.add(child.commandId);
  }
  return Object.freeze([]);
}

export function applyUiDocumentCommandV2(
  document: UiDocument,
  command: UiDocumentCommandV2,
  context: UiDocumentCommandV2Context,
): ApplyUiDocumentCommandV2Result {
  const existingIssues = validateUiDocumentRoot(document.root);
  if (existingIssues.length > 0) return fail(document, ...existingIssues);

  let safeCommand: UiDocumentCommandV2;
  try {
    safeCommand = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(command));
  } catch (error) {
    return fail(
      document,
      commandIssue(
        'operation-failed',
        error instanceof Error ? error.message : String(error),
        command,
      ),
    );
  }
  if (!isKnownCommandValue(safeCommand)) {
    return fail(
      document,
      commandIssue(
        'invalid-command-payload',
        'The V2 command payload is not a recognized command.',
        isPlainRecord(safeCommand) ? safeCommand : {},
      ),
    );
  }
  const commandIdIssues = validateCommandIds(safeCommand);
  if (commandIdIssues.length > 0) return fail(document, ...commandIdIssues);

  const atomicCommands = safeCommand.type === 'batch' ? safeCommand.commands : [safeCommand];
  let working = document;
  const patches: WidgetPatch[] = [];
  for (const child of atomicCommands) {
    const result = applyAtomicCommand(working, child, context);
    if (result.issues.length > 0) {
      return fail(
        document,
        ...result.issues,
        commandIssue(
          'operation-failed',
          `V2 operation "${child.commandId}" failed; the complete command was rolled back.`,
          child,
        ),
      );
    }
    working = result.document;
    patches.push(...result.patches);
  }

  if (safeCommand.type === 'batch') {
    const beforeNormalization = working;
    working = normalizeBatchVersion(document, working);
    if (working.source !== beforeNormalization.source) {
      patches.push({
        type: 'replace-widget',
        path: [],
        widget: cloneUiAuthoringJsonValue(working.root),
      });
    }
  }
  const next = createUiDocumentFromRoot(document.documentId, document.revision + 1, working.root);
  if (next.document === null) return fail(document, ...next.issues);
  if (formatWidgetDocumentJson(document.root) === next.document.source) {
    return Object.freeze({
      document,
      transaction: null,
      issues: Object.freeze([]),
      changed: false,
    });
  }

  const transaction = deepFreezeUiAuthoringValue({
    transactionId: `${safeCommand.commandId}@${document.revision}->${next.document.revision}`,
    command: safeCommand,
    baseRevision: document.revision,
    nextRevision: next.document.revision,
    patches: Object.freeze(patches.map((patch) => cloneUiAuthoringJsonValue(patch))),
  } satisfies UiDocumentTransactionV2);
  return Object.freeze({
    document: next.document,
    transaction,
    issues: Object.freeze([]),
    changed: true,
  });
}
