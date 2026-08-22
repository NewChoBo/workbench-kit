import { applyUiDocumentCommand } from './commands.js';
import { listUiDocumentHierarchy } from './document.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  UiAuthoringSessionCommandResult,
  UiAuthoringSessionState,
  UiDocument,
  UiDocumentCommand,
} from './types.js';

export function normalizeUiDocumentSelection(
  document: UiDocument,
  selectedNodeIds: readonly string[],
): readonly string[] {
  const existing = new Set(listUiDocumentHierarchy(document).map((entry) => entry.nodeId));
  const seen = new Set<string>();
  return Object.freeze(
    selectedNodeIds.filter((nodeId) => {
      if (!existing.has(nodeId) || seen.has(nodeId)) return false;
      seen.add(nodeId);
      return true;
    }),
  );
}

export function createUiAuthoringSession(
  document: UiDocument,
  selectedNodeIds: readonly string[] = [],
): UiAuthoringSessionState {
  return deepFreezeUiAuthoringValue({
    document,
    selectedNodeIds: normalizeUiDocumentSelection(document, selectedNodeIds),
    past: Object.freeze([]),
    future: Object.freeze([]),
  });
}

export function selectUiDocumentNodes(
  state: UiAuthoringSessionState,
  selectedNodeIds: readonly string[],
): UiAuthoringSessionState {
  return deepFreezeUiAuthoringValue({
    ...state,
    selectedNodeIds: normalizeUiDocumentSelection(state.document, selectedNodeIds),
  });
}

export function applyUiAuthoringSessionCommand(
  state: UiAuthoringSessionState,
  command: UiDocumentCommand,
): UiAuthoringSessionCommandResult {
  const commandResult = applyUiDocumentCommand(state.document, command);
  if (!commandResult.changed || commandResult.transaction === null) {
    return { state, commandResult };
  }

  const afterSelectedNodeIds = normalizeUiDocumentSelection(
    commandResult.document,
    state.selectedNodeIds,
  );
  const record = deepFreezeUiAuthoringValue({
    transaction: commandResult.transaction,
    beforeDocument: state.document,
    afterDocument: commandResult.document,
    beforeSelectedNodeIds: state.selectedNodeIds,
    afterSelectedNodeIds,
  } as const);
  return {
    state: deepFreezeUiAuthoringValue({
      document: commandResult.document,
      selectedNodeIds: afterSelectedNodeIds,
      past: Object.freeze([...state.past, record]),
      future: Object.freeze([]),
    }),
    commandResult,
  };
}

export function undoUiAuthoringSession(
  state: UiAuthoringSessionState,
): UiAuthoringSessionState | null {
  const record = state.past[state.past.length - 1];
  if (!record) return null;

  return deepFreezeUiAuthoringValue({
    document: record.beforeDocument,
    selectedNodeIds: normalizeUiDocumentSelection(
      record.beforeDocument,
      record.beforeSelectedNodeIds,
    ),
    past: Object.freeze(state.past.slice(0, -1)),
    future: Object.freeze([record, ...state.future]),
  });
}

export function redoUiAuthoringSession(
  state: UiAuthoringSessionState,
): UiAuthoringSessionState | null {
  const [record, ...remainingFuture] = state.future;
  if (!record) return null;

  return deepFreezeUiAuthoringValue({
    document: record.afterDocument,
    selectedNodeIds: normalizeUiDocumentSelection(
      record.afterDocument,
      record.afterSelectedNodeIds,
    ),
    past: Object.freeze([...state.past, record]),
    future: Object.freeze(remainingFuture),
  });
}
