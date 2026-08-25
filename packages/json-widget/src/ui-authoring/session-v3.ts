import type { DesignSystemPackChangeMutation } from '@workbench-kit/contracts';

import { collectWidgetNodes } from '../widget/tree.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import { applyUiDesignSystemPackChangeDocumentV3 } from './design-system.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import {
  type ApplyUiDesignSystemPackChangeV3Result,
  type UiAuthoringSessionStateV3,
  type UiAuthoringSessionV3CommandResult,
  type UiDocumentCommandV3,
  type UiDocumentCommandV3Context,
  type UiDocumentTransactionRecordV3,
  type UiDocumentTransactionV3,
  type UiDocumentV3,
} from './types.js';

function normalizeSelection(
  document: UiDocumentV3,
  selectedNodeIds: readonly string[],
): readonly string[] {
  const existing = new Set(
    collectWidgetNodes(document.root).flatMap((entry) =>
      typeof entry.widget.id === 'string' ? [entry.widget.id] : [],
    ),
  );
  const seen = new Set<string>();
  return Object.freeze(
    selectedNodeIds.filter((nodeId) => {
      if (!existing.has(nodeId) || seen.has(nodeId)) return false;
      seen.add(nodeId);
      return true;
    }),
  );
}

export function createUiAuthoringSessionV3(
  document: UiDocumentV3,
  selectedNodeIds: readonly string[] = [],
): UiAuthoringSessionStateV3 {
  return deepFreezeUiAuthoringValue({
    document,
    selectedNodeIds: normalizeSelection(document, selectedNodeIds),
    past: Object.freeze([]),
    future: Object.freeze([]),
  });
}

export function selectUiDocumentNodesV3(
  state: UiAuthoringSessionStateV3,
  selectedNodeIds: readonly string[],
): UiAuthoringSessionStateV3 {
  return deepFreezeUiAuthoringValue({
    ...state,
    selectedNodeIds: normalizeSelection(state.document, selectedNodeIds),
  });
}

export function applyUiAuthoringSessionCommandV3(
  state: UiAuthoringSessionStateV3,
  command: UiDocumentCommandV3,
  context: UiDocumentCommandV3Context,
): UiAuthoringSessionV3CommandResult {
  const commandResult = applyUiDocumentCommandV3(state.document, command, context);
  if (!commandResult.changed || commandResult.transaction === null) {
    return Object.freeze({ state, commandResult });
  }
  const afterSelectedNodeIds = normalizeSelection(commandResult.document, state.selectedNodeIds);
  const record = deepFreezeUiAuthoringValue({
    transaction: commandResult.transaction,
    beforeDocument: state.document,
    afterDocument: commandResult.document,
    beforeSelectedNodeIds: state.selectedNodeIds,
    afterSelectedNodeIds,
  } satisfies UiDocumentTransactionRecordV3);
  return Object.freeze({
    state: deepFreezeUiAuthoringValue({
      document: commandResult.document,
      selectedNodeIds: afterSelectedNodeIds,
      past: Object.freeze([...state.past, record]),
      future: Object.freeze([]),
    }),
    commandResult,
  });
}

export function undoUiAuthoringSessionV3(
  state: UiAuthoringSessionStateV3,
): UiAuthoringSessionStateV3 | null {
  const record = state.past[state.past.length - 1];
  if (!record) return null;
  return deepFreezeUiAuthoringValue({
    document: record.beforeDocument,
    selectedNodeIds: normalizeSelection(record.beforeDocument, record.beforeSelectedNodeIds),
    past: Object.freeze(state.past.slice(0, -1)),
    future: Object.freeze([record, ...state.future]),
  });
}

export function redoUiAuthoringSessionV3(
  state: UiAuthoringSessionStateV3,
): UiAuthoringSessionStateV3 | null {
  const [record, ...remainingFuture] = state.future;
  if (!record) return null;
  return deepFreezeUiAuthoringValue({
    document: record.afterDocument,
    selectedNodeIds: normalizeSelection(record.afterDocument, record.afterSelectedNodeIds),
    past: Object.freeze([...state.past, record]),
    future: Object.freeze(remainingFuture),
  });
}

export function applyUiDesignSystemPackChangeV3(
  state: UiAuthoringSessionStateV3,
  mutation: DesignSystemPackChangeMutation,
  currentRegistryRevision: number,
): ApplyUiDesignSystemPackChangeV3Result {
  const applied = applyUiDesignSystemPackChangeDocumentV3(
    { document: state.document, selectedNodeIds: state.selectedNodeIds },
    mutation,
    currentRegistryRevision,
  );
  if (!applied.changed) {
    return Object.freeze({ state, diagnostics: applied.diagnostics, changed: false });
  }
  const transaction = deepFreezeUiAuthoringValue({
    kind: 'design-system-change',
    transactionId: applied.transaction.transactionId,
    intent: {
      type: 'apply-design-system-pack-change',
      commandId: mutation.requestId,
      mutation: cloneUiAuthoringJsonValue(mutation),
    },
    baseRevision: applied.transaction.baseRevision,
    nextRevision: applied.transaction.nextRevision,
    patches: cloneUiAuthoringJsonValue(applied.transaction.patches),
  } satisfies UiDocumentTransactionV3);
  const record = deepFreezeUiAuthoringValue({
    transaction,
    beforeDocument: state.document,
    afterDocument: applied.document,
    beforeSelectedNodeIds: state.selectedNodeIds,
    afterSelectedNodeIds: applied.selectedNodeIds,
  } satisfies UiDocumentTransactionRecordV3);
  return Object.freeze({
    state: deepFreezeUiAuthoringValue({
      document: applied.document,
      selectedNodeIds: applied.selectedNodeIds,
      past: Object.freeze([...state.past, record]),
      future: Object.freeze([]),
    }),
    diagnostics: Object.freeze([]),
    changed: true,
  });
}
