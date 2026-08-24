import type { UiComponentBindingDescriptor, UiComponentRef } from '@workbench-kit/contracts';

import { collectWidgetNodes } from '../widget/tree.js';
import { applyUiDocumentCommandV2 } from './commands-v2.js';
import { readUiDocumentNodeAuthoring } from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  CreateUiAuthoringDetachedPlanInput,
  UiAuthoringDetachedPlan,
  UiAuthoringDesignSystemInputSnapshot,
  UiAuthoringPlanDiagnostic,
  UiAuthoringPlanFinalizeContext,
  UiAuthoringPlanFinalizeResult,
  UiAuthoringPlanPreview,
  UiDocumentAtomicCommandV2,
  UiDocumentCommandV2Issue,
} from './types.js';

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function declarativeEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => declarativeEqual(entry, right[index]))
    );
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && declarativeEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function diagnostic(
  code: UiAuthoringPlanDiagnostic['code'],
  message: string,
  path: string,
  context: Partial<UiAuthoringPlanDiagnostic> = {},
): UiAuthoringPlanDiagnostic {
  return Object.freeze({ code, message, path, ...context });
}

function commandDiagnostic(
  cause: UiDocumentCommandV2Issue,
  path: string,
): UiAuthoringPlanDiagnostic {
  return diagnostic('plan-blocked', cause.message, path, {
    cause,
    ...(cause.commandId === undefined ? {} : { commandId: cause.commandId }),
    ...(cause.nodeId === undefined ? {} : { nodeId: cause.nodeId }),
    ...(cause.inputId === undefined ? {} : { inputId: cause.inputId }),
  });
}

function snapshotDesignSystemInput(
  input: UiAuthoringDesignSystemInputSnapshot,
): UiAuthoringDesignSystemInputSnapshot | null {
  if (
    !Number.isInteger(input.registryRevision) ||
    input.registryRevision < 0 ||
    (input.hostWidth !== undefined && (!Number.isFinite(input.hostWidth) || input.hostWidth <= 0))
  ) {
    return null;
  }
  try {
    return deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(input));
  } catch {
    return null;
  }
}

function findEndpoint(
  document: CreateUiAuthoringDetachedPlanInput['state']['document'],
  command: Extract<
    UiDocumentAtomicCommandV2,
    { readonly type: 'set-input-binding' | 'clear-input-binding' }
  >,
  input: CreateUiAuthoringDetachedPlanInput,
): {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly input: UiComponentBindingDescriptor;
} | null {
  const node = collectWidgetNodes(document.root).find(
    (entry) => entry.widget.id === command.nodeId,
  );
  if (!node) return null;
  const component = readUiDocumentNodeAuthoring(node.widget)!.component;
  const descriptor = input.componentCatalog.component(component);
  const endpoint = descriptor?.bindings?.find((candidate) => candidate.id === command.inputId);
  if (!endpoint) return null;
  return deepFreezeUiAuthoringValue(
    cloneUiAuthoringJsonValue({ nodeId: command.nodeId, component, input: endpoint }),
  );
}

export function createUiAuthoringDetachedPlan(
  input: CreateUiAuthoringDetachedPlanInput,
): UiAuthoringDetachedPlan {
  const diagnostics: UiAuthoringPlanDiagnostic[] = [];
  let commands: readonly UiDocumentAtomicCommandV2[] = Object.freeze([]);
  let recipe: CreateUiAuthoringDetachedPlanInput['recipe'];
  let designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  try {
    commands = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(input.commands));
    recipe = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(input.recipe));
  } catch (error) {
    commands = Object.freeze([]);
    recipe = Object.freeze({
      id: 'invalid-recipe',
      version: 'invalid',
      provenance: Object.freeze({
        source: 'builtin',
        sourceId: 'invalid',
        sourceVersion: 'invalid',
      }),
    });
    diagnostics.push(
      diagnostic('plan-blocked', error instanceof Error ? error.message : String(error), 'input'),
    );
  }
  const safeDesignSystemInput = snapshotDesignSystemInput(input.designSystemInput);
  if (safeDesignSystemInput === null) {
    diagnostics.push(
      diagnostic(
        'plan-blocked',
        'Design System plan operands must be canonical declarative data.',
        'designSystemInput',
      ),
    );
    designSystemInput = Object.freeze({ state: null, registryRevision: -1 });
  } else {
    designSystemInput = safeDesignSystemInput;
  }
  if (
    !isCanonicalText(input.planId) ||
    !isCanonicalText(recipe.id) ||
    !isCanonicalText(recipe.version) ||
    !isCanonicalText(recipe.provenance.sourceId) ||
    !isCanonicalText(recipe.provenance.sourceVersion)
  ) {
    diagnostics.push(
      diagnostic('plan-blocked', 'Plan and recipe identities must be canonical.', 'planId'),
    );
  }

  const endpointSnapshots: {
    readonly nodeId: string;
    readonly component: UiComponentRef;
    readonly input: UiComponentBindingDescriptor;
  }[] = [];
  let working = input.state.document;
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]!;
    if (command.type === 'set-input-binding' || command.type === 'clear-input-binding') {
      const endpoint = findEndpoint(working, command, input);
      if (endpoint !== null) endpointSnapshots.push(endpoint);
    }
    const result = applyUiDocumentCommandV2(working, command, {
      componentCatalog: input.componentCatalog,
    });
    if (result.issues.length > 0) {
      diagnostics.push(
        ...result.issues.map((issue) =>
          'commandId' in issue
            ? commandDiagnostic(issue as UiDocumentCommandV2Issue, `commands[${index}]`)
            : diagnostic('plan-blocked', issue.message, `commands[${index}]`, { cause: issue }),
        ),
      );
      break;
    }
    working = result.document;
  }

  const batchResult = applyUiDocumentCommandV2(
    input.state.document,
    { type: 'batch', commandId: input.planId, commands },
    { componentCatalog: input.componentCatalog },
  );
  if (batchResult.issues.length > 0) {
    diagnostics.push(
      ...batchResult.issues.map((issue) =>
        'commandId' in issue
          ? commandDiagnostic(issue as UiDocumentCommandV2Issue, 'commands')
          : diagnostic('plan-blocked', issue.message, 'commands', { cause: issue }),
      ),
    );
  }

  const frozenDiagnostics = Object.freeze(diagnostics);
  return deepFreezeUiAuthoringValue({
    planId: isCanonicalText(input.planId) ? input.planId : 'invalid-plan',
    recipe,
    documentId: input.state.document.documentId,
    documentRevision: input.state.document.revision,
    designSystemInput,
    endpointSnapshots: Object.freeze(endpointSnapshots),
    commands,
    diagnostics: frozenDiagnostics,
    blocked: frozenDiagnostics.length > 0,
  });
}

export function previewUiAuthoringDetachedPlan(
  plan: UiAuthoringDetachedPlan,
): UiAuthoringPlanPreview {
  return deepFreezeUiAuthoringValue({
    planId: plan.planId,
    commands: cloneUiAuthoringJsonValue(plan.commands),
    diagnostics: cloneUiAuthoringJsonValue(plan.diagnostics),
    blocked: plan.blocked,
  });
}

export function finalizeUiAuthoringDetachedPlan(
  plan: UiAuthoringDetachedPlan,
  context: UiAuthoringPlanFinalizeContext,
): UiAuthoringPlanFinalizeResult {
  if (plan.blocked) {
    return Object.freeze({ diagnostics: plan.diagnostics });
  }
  const diagnostics: UiAuthoringPlanDiagnostic[] = [];
  if (
    context.state.document.documentId !== plan.documentId ||
    context.state.document.revision !== plan.documentRevision
  ) {
    diagnostics.push(
      diagnostic('stale-document', 'The authored document changed after Preview.', 'document'),
    );
  }
  const currentDesignSystemInput = snapshotDesignSystemInput(context.designSystemInput);
  if (
    currentDesignSystemInput === null ||
    !declarativeEqual(currentDesignSystemInput, plan.designSystemInput)
  ) {
    diagnostics.push(
      diagnostic(
        'stale-design-system',
        'The Design System or host-width operands changed after Preview.',
        'designSystemInput',
      ),
    );
  }

  let working = context.state.document;
  let endpointSnapshotIndex = 0;
  for (let commandIndex = 0; commandIndex < plan.commands.length; commandIndex += 1) {
    const command = plan.commands[commandIndex]!;
    if (command.type === 'set-input-binding' || command.type === 'clear-input-binding') {
      const snapshot = plan.endpointSnapshots[endpointSnapshotIndex];
      endpointSnapshotIndex += 1;
      const node = collectWidgetNodes(working.root).find(
        (entry) => entry.widget.id === command.nodeId,
      );
      const component = node ? readUiDocumentNodeAuthoring(node.widget)?.component : undefined;
      const descriptor = component ? context.componentCatalog.component(component) : undefined;
      const input = descriptor?.bindings?.find((candidate) => candidate.id === command.inputId);
      if (
        snapshot === undefined ||
        component === undefined ||
        component.id !== snapshot.component.id ||
        component.version !== snapshot.component.version ||
        snapshot.nodeId !== command.nodeId ||
        snapshot.input.id !== command.inputId ||
        input === undefined ||
        !declarativeEqual(input, snapshot.input)
      ) {
        diagnostics.push(
          diagnostic(
            'stale-component-catalog',
            'An exact component input descriptor changed after Preview.',
            `commands[${commandIndex}]`,
            { nodeId: command.nodeId, inputId: command.inputId },
          ),
        );
        break;
      }
    }

    const replayed = applyUiDocumentCommandV2(working, command, {
      componentCatalog: context.componentCatalog,
    });
    if (replayed.issues.length > 0) {
      diagnostics.push(
        ...replayed.issues.map((issue) =>
          'commandId' in issue
            ? commandDiagnostic(issue as UiDocumentCommandV2Issue, `commands[${commandIndex}]`)
            : diagnostic('plan-blocked', issue.message, `commands[${commandIndex}]`, {
                cause: issue,
              }),
        ),
      );
      break;
    }
    working = replayed.document;
  }
  if (endpointSnapshotIndex !== plan.endpointSnapshots.length) {
    diagnostics.push(
      diagnostic(
        'stale-component-catalog',
        'The captured endpoint set no longer matches the detached plan.',
        'endpointSnapshots',
      ),
    );
  }

  if (diagnostics.length > 0) return Object.freeze({ diagnostics: Object.freeze(diagnostics) });
  return deepFreezeUiAuthoringValue({
    command: {
      type: 'batch',
      commandId: plan.planId,
      commands: cloneUiAuthoringJsonValue(plan.commands),
    },
    diagnostics: Object.freeze([]),
  });
}
