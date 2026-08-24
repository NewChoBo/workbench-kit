import { applyUiDocumentCommandV2 } from './commands-v2.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';
import { normalizeUiDocumentSelection } from './session.js';
import type {
  UiAuthoringSessionStateV2,
  UiAuthoringSessionV2CommandResult,
  UiDocument,
  UiDocumentCommandV2,
  UiDocumentCommandV2Context,
} from './types.js';

export function createUiAuthoringSessionV2(
  document: UiDocument,
  selectedNodeIds: readonly string[] = [],
): UiAuthoringSessionStateV2 {
  return deepFreezeUiAuthoringValue({
    document,
    selectedNodeIds: normalizeUiDocumentSelection(document, selectedNodeIds),
    past: Object.freeze([]),
    future: Object.freeze([]),
  });
}

export function applyUiAuthoringSessionCommandV2(
  state: UiAuthoringSessionStateV2,
  command: UiDocumentCommandV2,
  context: UiDocumentCommandV2Context,
): UiAuthoringSessionV2CommandResult {
  const commandResult = applyUiDocumentCommandV2(state.document, command, context);
  if (!commandResult.changed || commandResult.transaction === null) {
    return Object.freeze({ state, commandResult });
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

export function undoUiAuthoringSessionV2(
  state: UiAuthoringSessionStateV2,
): UiAuthoringSessionStateV2 | null {
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

export function redoUiAuthoringSessionV2(
  state: UiAuthoringSessionStateV2,
): UiAuthoringSessionStateV2 | null {
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
