export {
  areFieldRemapHistorySnapshotsEqual,
  createFieldRemapHistorySnapshot,
  createFieldRemapHistoryState,
  recordFieldRemapHistory,
  redoFieldRemapHistory,
  undoFieldRemapHistory,
  type FieldRemapHistorySnapshot,
  type FieldRemapHistorySnapshotPolicy,
  type FieldRemapHistoryState,
} from '@workbench-kit/field-remap/history';

/** Externally owned history commands and current availability for mapping chrome. */
export interface FieldRemapHistoryActions {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
}
