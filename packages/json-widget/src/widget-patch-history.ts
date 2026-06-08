export interface WidgetPatchHistoryState {
  past: string[];
  present: string;
  future: string[];
}

export interface WidgetPatchHistory {
  readonly state: WidgetPatchHistoryState;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  applyDocument(next: string): string;
  replacePresent(next: string): void;
  undo(): string | null;
  redo(): string | null;
  reset(initial: string): void;
}

export function initializeWidgetPatchHistory(initialDocument: string): WidgetPatchHistory {
  let state: WidgetPatchHistoryState = {
    past: [],
    present: initialDocument,
    future: [],
  };

  return {
    get state() {
      return state;
    },
    get canUndo() {
      return state.past.length > 0;
    },
    get canRedo() {
      return state.future.length > 0;
    },
    applyDocument(next) {
      if (next === state.present) {
        return state.present;
      }
      state = {
        past: [...state.past, state.present],
        present: next,
        future: [],
      };
      return state.present;
    },
    replacePresent(next) {
      state = { ...state, present: next };
    },
    undo() {
      if (!state.past.length) {
        return null;
      }
      const previous = state.past[state.past.length - 1];
      state = {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
      return state.present;
    },
    redo() {
      if (!state.future.length) {
        return null;
      }
      const [next, ...restFuture] = state.future;
      state = {
        past: [...state.past, state.present],
        present: next,
        future: restFuture,
      };
      return state.present;
    },
    reset(initial) {
      state = {
        past: [],
        present: initial,
        future: [],
      };
    },
  };
}
