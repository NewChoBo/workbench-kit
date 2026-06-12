import { Emitter, type Disposable } from '@workbench-kit/base';

export interface WorkbenchLayoutState {
  readonly activityBar: {
    readonly visible: boolean;
  };
  readonly panel: {
    readonly visible: boolean;
  };
  readonly sideBar: {
    readonly activeViewContainer?: string;
    readonly visible: boolean;
  };
}

export type WorkbenchLayoutStateInput = Partial<{
  activityBar: Partial<WorkbenchLayoutState['activityBar']>;
  panel: Partial<WorkbenchLayoutState['panel']>;
  sideBar: Partial<WorkbenchLayoutState['sideBar']>;
}>;

export interface WorkbenchLayoutChangeEvent {
  readonly previousState: WorkbenchLayoutState;
  readonly state: WorkbenchLayoutState;
}

export const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutState = {
  activityBar: {
    visible: true,
  },
  panel: {
    visible: false,
  },
  sideBar: {
    activeViewContainer: undefined,
    visible: true,
  },
};

export class LayoutService implements Disposable {
  private readonly onDidChangeLayoutEmitter = new Emitter<WorkbenchLayoutChangeEvent>();
  private state: WorkbenchLayoutState;

  readonly onDidChangeLayout = this.onDidChangeLayoutEmitter.event;

  constructor(initialState: WorkbenchLayoutStateInput = {}) {
    this.state = createWorkbenchLayoutState(initialState);
  }

  getState(): WorkbenchLayoutState {
    return cloneLayoutState(this.state);
  }

  reset(state: WorkbenchLayoutStateInput = {}): void {
    this.setState(createWorkbenchLayoutState(state));
  }

  setActiveViewContainer(activeViewContainer: string | undefined): void {
    this.update({
      sideBar: {
        activeViewContainer,
      },
    });
  }

  setActivityBarVisible(visible: boolean): void {
    this.update({
      activityBar: {
        visible,
      },
    });
  }

  setPanelVisible(visible: boolean): void {
    this.update({
      panel: {
        visible,
      },
    });
  }

  setSideBarVisible(visible: boolean): void {
    this.update({
      sideBar: {
        visible,
      },
    });
  }

  update(partialState: WorkbenchLayoutStateInput): void {
    this.setState(createWorkbenchLayoutState(partialState, this.state));
  }

  dispose(): void {
    this.onDidChangeLayoutEmitter.dispose();
  }

  private setState(nextState: WorkbenchLayoutState): void {
    const previousState = this.state;
    if (isSameLayoutState(previousState, nextState)) {
      return;
    }

    this.state = nextState;
    this.onDidChangeLayoutEmitter.fire({
      previousState,
      state: nextState,
    });
  }
}

export function createWorkbenchLayoutState(
  input: WorkbenchLayoutStateInput = {},
  base: WorkbenchLayoutState = DEFAULT_WORKBENCH_LAYOUT_STATE,
): WorkbenchLayoutState {
  return {
    activityBar: {
      visible: readBoolean(input.activityBar?.visible, base.activityBar.visible),
    },
    panel: {
      visible: readBoolean(input.panel?.visible, base.panel.visible),
    },
    sideBar: {
      activeViewContainer: readOptionalString(
        input.sideBar?.activeViewContainer,
        base.sideBar.activeViewContainer,
      ),
      visible: readBoolean(input.sideBar?.visible, base.sideBar.visible),
    },
  };
}

function cloneLayoutState(state: WorkbenchLayoutState): WorkbenchLayoutState {
  return createWorkbenchLayoutState(state);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readOptionalString(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function isSameLayoutState(left: WorkbenchLayoutState, right: WorkbenchLayoutState): boolean {
  return (
    left.activityBar.visible === right.activityBar.visible &&
    left.panel.visible === right.panel.visible &&
    left.sideBar.activeViewContainer === right.sideBar.activeViewContainer &&
    left.sideBar.visible === right.sideBar.visible
  );
}
