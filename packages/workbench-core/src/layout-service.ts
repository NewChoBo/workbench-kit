import { Emitter, type Disposable } from '@workbench-kit/base';

export interface WorkbenchLayoutState {
  readonly activityBar: {
    readonly itemOrder?: readonly string[];
    readonly visible: boolean;
  };
  readonly panel: {
    readonly visible: boolean;
  };
  readonly sideBar: {
    readonly activeViewContainer?: string;
    readonly sizePercent?: number;
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

  focusSideBarViewContainer(viewContainerId: string): void {
    const { sideBar } = this.state;

    if (sideBar.activeViewContainer === viewContainerId && sideBar.visible) {
      this.setSideBarVisible(false);
      return;
    }

    this.update({
      sideBar: {
        activeViewContainer: viewContainerId,
        visible: true,
      },
    });
  }

  setActivityBarItemOrder(itemOrder: readonly string[]): void {
    this.update({
      activityBar: {
        itemOrder: normalizeActivityBarItemOrder(itemOrder),
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

  setSideBarSizePercent(sizePercent: number): void {
    this.update({
      sideBar: {
        sizePercent: clampSideBarSizePercent(sizePercent),
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
      itemOrder: readOptionalStringArray(input.activityBar?.itemOrder, base.activityBar.itemOrder),
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
      sizePercent: readOptionalSizePercent(input.sideBar?.sizePercent, base.sideBar.sizePercent),
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

function readOptionalSizePercent(value: unknown, fallback: number | undefined): number | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clampSideBarSizePercent(value);
}

function clampSideBarSizePercent(value: number): number {
  return Math.min(90, Math.max(10, value));
}

function readOptionalString(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readOptionalStringArray(
  value: unknown,
  fallback: readonly string[] | undefined,
): readonly string[] | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    return fallback;
  }

  return normalizeActivityBarItemOrder(value);
}

function normalizeActivityBarItemOrder(itemOrder: readonly string[]): readonly string[] {
  return [...new Set(itemOrder.map((item) => item.trim()).filter(Boolean))];
}

function isSameLayoutState(left: WorkbenchLayoutState, right: WorkbenchLayoutState): boolean {
  return (
    left.activityBar.visible === right.activityBar.visible &&
    areSameStringArrays(left.activityBar.itemOrder, right.activityBar.itemOrder) &&
    left.panel.visible === right.panel.visible &&
    left.sideBar.activeViewContainer === right.sideBar.activeViewContainer &&
    left.sideBar.sizePercent === right.sideBar.sizePercent &&
    left.sideBar.visible === right.sideBar.visible
  );
}

function areSameStringArrays(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (!left && !right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
