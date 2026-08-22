import {
  snapshotDesignSystemResolutionInput,
  validateUiDesignSystemState,
  type DesignSystemAuthoredDocumentSnapshot,
  type DesignSystemDiagnostic,
  type DesignSystemPackChangeMutation,
  type UiComponentRef,
  type UiDesignSystemState,
  type UiValueSource,
} from '@workbench-kit/contracts';

import {
  createUiDocument,
  createUiDocumentFromRoot,
  readUiDocumentNodeAuthoring,
} from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import { normalizeUiDocumentSelection } from './session.js';
import type {
  ApplyUiDesignSystemPackChangeResult,
  ProjectUiDesignSystemDocumentResult,
  UiAuthoringSessionState,
  UiDocument,
  UiDocumentTransaction,
  UiDocumentTransactionRecord,
} from './types.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { isGenericWidget } from '../widget/type-guards.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isCanonicalRef(value: unknown): value is UiComponentRef {
  return isPlainRecord(value) && isCanonicalText(value.id) && isCanonicalText(value.version);
}

function diagnostic(
  code: DesignSystemDiagnostic['code'],
  message: string,
  path: string,
  context: Partial<DesignSystemDiagnostic> = {},
): DesignSystemDiagnostic {
  return Object.freeze({ code, message, path, ...context });
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(diagnostics.map((entry) => Object.freeze({ ...entry })));
}

function failure(
  state: UiAuthoringSessionState,
  ...diagnostics: readonly DesignSystemDiagnostic[]
): ApplyUiDesignSystemPackChangeResult {
  return Object.freeze({ state, diagnostics: freezeDiagnostics(diagnostics), changed: false });
}

function isUiDocumentValue(value: unknown): value is UiDocument {
  if (
    !isPlainRecord(value) ||
    !isCanonicalText(value.documentId) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0 ||
    typeof value.source !== 'string' ||
    !isGenericWidget(value.root)
  ) {
    return false;
  }
  const decoded = createUiDocument(value.documentId, value.source);
  return (
    decoded.document !== null &&
    declarativeEqual(decoded.document.root, value.root) &&
    declarativeEqual(decoded.document.designSystem, value.designSystem)
  );
}

export function projectUiDesignSystemDocument(
  document: UiAuthoringSessionState['document'],
): ProjectUiDesignSystemDocumentResult {
  let state: UiDocument;
  try {
    state = snapshotDesignSystemResolutionInput(document);
  } catch {
    return Object.freeze({
      diagnostics: freezeDiagnostics([
        diagnostic(
          'invalid-pack-change-request',
          'The authored document projection input must be plain declarative data.',
          'document',
        ),
      ]),
    });
  }
  if (!isUiDocumentValue(state)) {
    return Object.freeze({
      diagnostics: freezeDiagnostics([
        diagnostic(
          'invalid-pack-change-request',
          'The authored document projection input is invalid.',
          'document',
        ),
      ]),
    });
  }
  if (state.designSystem === null) {
    return Object.freeze({
      diagnostics: freezeDiagnostics([
        diagnostic(
          'source-design-system-state-required',
          'Pack-change planning requires explicit root design-system state.',
          'document.designSystem',
        ),
      ]),
    });
  }

  const scopeChains = new Map<string, readonly string[]>();
  const nodes = collectWidgetNodes(state.root).map((entry) => {
    const authoring = readUiDocumentNodeAuthoring(entry.widget)!;
    const parentChain = entry.parent
      ? (scopeChains.get(entry.parent.id as string) ?? Object.freeze([]))
      : Object.freeze([]);
    const scopeChain = authoring.themeScopeId
      ? Object.freeze([...parentChain, authoring.themeScopeId])
      : parentChain;
    scopeChains.set(entry.widget.id as string, scopeChain);
    return Object.freeze({
      nodeId: entry.widget.id as string,
      component: Object.freeze({ ...authoring.component }),
      properties: deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(authoring.properties)),
      ...(authoring.layout
        ? {
            layout: Object.freeze({
              strategyId: authoring.layout.strategyId,
              values: deepFreezeUiAuthoringValue(
                cloneUiAuthoringJsonValue(authoring.layout.values),
              ),
            }),
          }
        : {}),
      scopeChain,
    });
  });
  return Object.freeze({
    document: deepFreezeUiAuthoringValue({
      documentId: state.documentId,
      revision: state.revision,
      state: cloneUiAuthoringJsonValue(state.designSystem),
      nodes: Object.freeze(nodes),
    }),
    diagnostics: Object.freeze([]),
  });
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
  if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && declarativeEqual(left[key], right[rightKeys[index]!]),
    )
  );
}

function isSource(value: unknown): value is UiValueSource {
  if (!isPlainRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'literal') return Object.prototype.hasOwnProperty.call(value, 'value');
  const fields = {
    token: 'tokenId',
    resource: 'resourceId',
    binding: 'bindingId',
    expression: 'expressionId',
  } as const;
  const field = fields[value.kind as keyof typeof fields];
  return field !== undefined && isCanonicalText(value[field]);
}

function isAuthoredDocument(value: unknown): value is DesignSystemAuthoredDocumentSnapshot {
  if (
    !isPlainRecord(value) ||
    !isCanonicalText(value.documentId) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Array.isArray(value.nodes) ||
    !isPlainRecord(value.state) ||
    validateUiDesignSystemState(value.state as unknown as UiDesignSystemState).length > 0
  ) {
    return false;
  }
  const seen = new Set<string>();
  return value.nodes.every((node) => {
    if (
      !isPlainRecord(node) ||
      !isCanonicalText(node.nodeId) ||
      seen.has(node.nodeId) ||
      !isCanonicalRef(node.component) ||
      !isPlainRecord(node.properties) ||
      !Object.values(node.properties).every(isSource) ||
      !Array.isArray(node.scopeChain) ||
      !node.scopeChain.every(isCanonicalText) ||
      new Set(node.scopeChain).size !== node.scopeChain.length
    ) {
      return false;
    }
    if (
      node.layout !== undefined &&
      (!isPlainRecord(node.layout) ||
        !isCanonicalText(node.layout.strategyId) ||
        !isPlainRecord(node.layout.values) ||
        !Object.values(node.layout.values).every(isSource))
    ) {
      return false;
    }
    seen.add(node.nodeId);
    return true;
  });
}

function isMutation(value: unknown): value is DesignSystemPackChangeMutation {
  if (
    !isPlainRecord(value) ||
    !isCanonicalText(value.requestId) ||
    !Number.isInteger(value.registryRevision) ||
    (value.registryRevision as number) < 0 ||
    !isCanonicalText(value.documentId) ||
    !Number.isInteger(value.baseRevision) ||
    (value.baseRevision as number) < 0 ||
    !isAuthoredDocument(value.sourceDocument) ||
    !isPlainRecord(value.targetState) ||
    validateUiDesignSystemState(value.targetState as unknown as UiDesignSystemState).length > 0 ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.tokens) ||
    !Array.isArray(value.resources)
  ) {
    return false;
  }
  if (
    value.sourceDocument.documentId !== value.documentId ||
    value.sourceDocument.revision !== value.baseRevision
  ) {
    return false;
  }
  const componentIds = new Set<string>();
  const validComponents = value.components.every(
    (entry) =>
      isPlainRecord(entry) &&
      isCanonicalText(entry.nodeId) &&
      !componentIds.has(entry.nodeId) &&
      componentIds.add(entry.nodeId) &&
      isCanonicalRef(entry.source) &&
      isCanonicalRef(entry.target),
  );
  const validDependencies = (entries: readonly unknown[]) => {
    const sourceIds = new Set<string>();
    return entries.every(
      (entry) =>
        isPlainRecord(entry) &&
        isCanonicalText(entry.sourceId) &&
        isCanonicalText(entry.targetId) &&
        entry.sourceId !== entry.targetId &&
        !sourceIds.has(entry.sourceId) &&
        sourceIds.add(entry.sourceId),
    );
  };
  return validComponents && validDependencies(value.tokens) && validDependencies(value.resources);
}

function collectDependencyIds(document: DesignSystemAuthoredDocumentSnapshot): {
  readonly tokens: ReadonlySet<string>;
  readonly resources: ReadonlySet<string>;
} {
  const tokens = new Set<string>();
  const resources = new Set<string>();
  const visit = (source: UiValueSource) => {
    if (source.kind === 'token') tokens.add(source.tokenId);
    if (source.kind === 'resource') resources.add(source.resourceId);
  };
  for (const node of document.nodes) {
    Object.values(node.properties).forEach(visit);
    if (node.layout) Object.values(node.layout.values).forEach(visit);
  }
  for (const scope of Object.values(document.state.scopes ?? {})) {
    for (const [tokenId, source] of Object.entries(scope.tokenOverrides ?? {})) {
      tokens.add(tokenId);
      visit(source);
    }
  }
  return { tokens, resources };
}

function rewriteSource(
  source: UiValueSource,
  tokens: ReadonlyMap<string, string>,
  resources: ReadonlyMap<string, string>,
): UiValueSource {
  if (source.kind === 'token' && tokens.has(source.tokenId)) {
    return { kind: 'token', tokenId: tokens.get(source.tokenId)! };
  }
  if (source.kind === 'resource' && resources.has(source.resourceId)) {
    return { kind: 'resource', resourceId: resources.get(source.resourceId)! };
  }
  return source;
}

function rewriteValueMap(
  values: Readonly<Record<string, UiValueSource>>,
  tokens: ReadonlyMap<string, string>,
  resources: ReadonlyMap<string, string>,
): Readonly<Record<string, UiValueSource>> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, rewriteSource(value, tokens, resources)]),
  );
}

function rewriteRoot(root: GenericWidget, mutation: DesignSystemPackChangeMutation): GenericWidget {
  const componentMap = new Map(mutation.components.map((entry) => [entry.nodeId, entry.target]));
  const tokenMap = new Map(mutation.tokens.map((entry) => [entry.sourceId, entry.targetId]));
  const resourceMap = new Map(mutation.resources.map((entry) => [entry.sourceId, entry.targetId]));

  const visit = (widget: GenericWidget, rootNode: boolean): GenericWidget => {
    const authoring = readUiDocumentNodeAuthoring(widget)!;
    const rawAuthoring = widget.$authoring as Readonly<Record<string, unknown>>;
    const nextAuthoring: Record<string, unknown> = {
      ...rawAuthoring,
      component: componentMap.get(widget.id as string) ?? authoring.component,
      properties: rewriteValueMap(authoring.properties, tokenMap, resourceMap),
      ...(authoring.layout
        ? {
            layout: {
              ...authoring.layout,
              values: rewriteValueMap(authoring.layout.values, tokenMap, resourceMap),
            },
          }
        : {}),
    };
    if (rootNode) nextAuthoring.designSystem = mutation.targetState;

    const next: GenericWidget = { ...widget, $authoring: nextAuthoring };
    if (Array.isArray(widget.children)) {
      next.children = widget.children.map((child) =>
        isGenericWidget(child) ? visit(child, false) : child,
      );
    }
    if (isGenericWidget(widget.child)) next.child = visit(widget.child, false);
    return next;
  };
  return visit(root, true);
}

function isAuthoringSessionState(value: unknown): value is UiAuthoringSessionState {
  if (
    !isPlainRecord(value) ||
    !isUiDocumentValue(value.document) ||
    !Array.isArray(value.selectedNodeIds) ||
    !value.selectedNodeIds.every(isCanonicalText) ||
    !Array.isArray(value.past) ||
    !value.past.every(isUiDocumentTransactionRecord) ||
    !Array.isArray(value.future) ||
    !value.future.every(isUiDocumentTransactionRecord)
  ) {
    return false;
  }
  return true;
}

function isUiDocumentTransactionRecord(value: unknown): value is UiDocumentTransactionRecord {
  if (
    !isPlainRecord(value) ||
    !isPlainRecord(value.transaction) ||
    !isCanonicalText(value.transaction.transactionId) ||
    !Number.isInteger(value.transaction.baseRevision) ||
    !Number.isInteger(value.transaction.nextRevision) ||
    !isPlainRecord(value.transaction.command) ||
    !Array.isArray(value.transaction.patches) ||
    !isUiDocumentValue(value.beforeDocument) ||
    !isUiDocumentValue(value.afterDocument) ||
    !Array.isArray(value.beforeSelectedNodeIds) ||
    !value.beforeSelectedNodeIds.every(isCanonicalText) ||
    !Array.isArray(value.afterSelectedNodeIds) ||
    !value.afterSelectedNodeIds.every(isCanonicalText)
  ) {
    return false;
  }
  return (
    value.transaction.baseRevision === value.beforeDocument.revision &&
    value.transaction.nextRevision === value.afterDocument.revision
  );
}

export function applyUiDesignSystemPackChange(
  state: UiAuthoringSessionState,
  mutation: DesignSystemPackChangeMutation,
  currentRegistryRevision: number,
): ApplyUiDesignSystemPackChangeResult {
  let safeState: UiAuthoringSessionState;
  let safeMutation: DesignSystemPackChangeMutation;
  try {
    safeState = snapshotDesignSystemResolutionInput(state);
    safeMutation = snapshotDesignSystemResolutionInput(mutation);
  } catch {
    return failure(
      state,
      diagnostic(
        'invalid-pack-change-mutation',
        'Pack-change mutation must be plain declarative data.',
        'mutation',
      ),
    );
  }
  if (
    !isAuthoringSessionState(safeState) ||
    !isMutation(safeMutation) ||
    !Number.isInteger(currentRegistryRevision) ||
    currentRegistryRevision < 0
  ) {
    return failure(
      state,
      diagnostic(
        'invalid-pack-change-mutation',
        'Pack-change mutation and registry revision must be canonical.',
        'mutation',
      ),
    );
  }
  if (safeMutation.registryRevision !== currentRegistryRevision) {
    return failure(
      state,
      diagnostic(
        'pack-change-registry-stale',
        'The Design System registry changed after the mutation was finalized.',
        'mutation.registryRevision',
        { requestId: safeMutation.requestId },
      ),
    );
  }

  const currentProjection = projectUiDesignSystemDocument(safeState.document);
  if (
    currentProjection.document === undefined ||
    safeState.document.documentId !== safeMutation.documentId ||
    safeState.document.revision !== safeMutation.baseRevision ||
    !declarativeEqual(currentProjection.document, safeMutation.sourceDocument)
  ) {
    return failure(
      state,
      diagnostic(
        'pack-change-document-stale',
        'The authored document changed after the mutation was finalized.',
        'mutation.sourceDocument',
        { requestId: safeMutation.requestId },
      ),
    );
  }

  const currentNodes = new Map(
    currentProjection.document.nodes.map((node) => [node.nodeId, node.component]),
  );
  for (const entry of safeMutation.components) {
    const current = currentNodes.get(entry.nodeId);
    if (
      current === undefined ||
      current.id !== entry.source.id ||
      current.version !== entry.source.version
    ) {
      return failure(
        state,
        diagnostic(
          'pack-change-apply-rejected',
          'A component substitution no longer matches its exact source node.',
          'mutation.components',
          { nodeId: entry.nodeId, requestId: safeMutation.requestId },
        ),
      );
    }
  }
  const dependencies = collectDependencyIds(currentProjection.document);
  if (
    safeMutation.tokens.some((entry) => !dependencies.tokens.has(entry.sourceId)) ||
    safeMutation.resources.some((entry) => !dependencies.resources.has(entry.sourceId))
  ) {
    return failure(
      state,
      diagnostic(
        'pack-change-apply-rejected',
        'A dependency substitution no longer has an authored source occurrence.',
        'mutation',
        { requestId: safeMutation.requestId },
      ),
    );
  }

  const nextRevision = safeState.document.revision + 1;
  const nextRoot = rewriteRoot(safeState.document.root, safeMutation);
  const nextResult = createUiDocumentFromRoot(
    safeState.document.documentId,
    nextRevision,
    nextRoot,
  );
  if (nextResult.document === null || nextResult.document.source === safeState.document.source) {
    return failure(
      state,
      diagnostic(
        'pack-change-apply-rejected',
        nextResult.issues[0]?.message ?? 'Pack-change mutation produced no canonical change.',
        'mutation',
        { requestId: safeMutation.requestId },
      ),
    );
  }

  const nextSelectedNodeIds = normalizeUiDocumentSelection(
    nextResult.document,
    safeState.selectedNodeIds,
  );
  const transaction = deepFreezeUiAuthoringValue({
    transactionId: `${safeMutation.requestId}@${safeState.document.revision}->${nextRevision}`,
    command: {
      type: 'apply-design-system-pack-change',
      commandId: safeMutation.requestId,
      mutation: safeMutation,
    },
    baseRevision: safeState.document.revision,
    nextRevision,
    patches: [
      {
        type: 'replace-widget',
        path: [],
        widget: cloneUiAuthoringJsonValue(nextRoot),
      },
    ],
  } satisfies UiDocumentTransaction);
  const record = deepFreezeUiAuthoringValue({
    transaction,
    beforeDocument: safeState.document,
    afterDocument: nextResult.document,
    beforeSelectedNodeIds: safeState.selectedNodeIds,
    afterSelectedNodeIds: nextSelectedNodeIds,
  });
  return Object.freeze({
    state: deepFreezeUiAuthoringValue({
      document: nextResult.document,
      selectedNodeIds: nextSelectedNodeIds,
      past: Object.freeze([...safeState.past, record]),
      future: Object.freeze([]),
    }),
    diagnostics: Object.freeze([]),
    changed: true,
  });
}
