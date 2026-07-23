import {
  parseWorkbenchLayoutConfig,
  type WorkbenchLayoutConfig,
} from '@workbench-kit/workbench-config';
import {
  createWorkbenchLayoutState,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
  type WorkbenchLayoutState,
  type WorkbenchLayoutStateInput,
} from '@workbench-kit/workbench-core';

export const DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY = 'workbench-kit/.workbench/layout';

export function isWorkbenchLayoutPersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function workbenchLayoutConfigToInput(
  config: WorkbenchLayoutConfig,
): WorkbenchLayoutStateInput {
  return {
    activityBar: {
      hiddenItemIds: config.activityBar.hiddenItemIds,
      itemOrder: config.activityBar.itemOrder,
      visible: config.activityBar.visible,
    },
    auxiliaryBar: {
      visible: config.auxiliaryBar.visible,
    },
    panel: {
      visible: config.panel.visible,
    },
    sideBar: {
      activeViewContainer: config.sideBar.activeViewContainer,
      sizePercent: config.sideBar.sizePercent,
      visible: config.sideBar.visible,
    },
  };
}

export function workbenchLayoutStateToStorageValue(
  state: WorkbenchLayoutState,
): WorkbenchLayoutConfig {
  return {
    activityBar: {
      visible: state.activityBar.visible,
      ...(state.activityBar.hiddenItemIds?.length
        ? { hiddenItemIds: [...state.activityBar.hiddenItemIds] }
        : {}),
      ...(state.activityBar.itemOrder?.length
        ? { itemOrder: [...state.activityBar.itemOrder] }
        : {}),
    },
    auxiliaryBar: {
      visible: state.auxiliaryBar.visible,
    },
    panel: {
      visible: state.panel.visible,
    },
    sideBar: {
      visible: state.sideBar.visible,
      ...(state.sideBar.activeViewContainer
        ? { activeViewContainer: state.sideBar.activeViewContainer }
        : {}),
      ...(state.sideBar.sizePercent !== undefined
        ? { sizePercent: state.sideBar.sizePercent }
        : {}),
    },
  };
}

export function readPersistedWorkbenchLayout(
  storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): WorkbenchLayoutStateInput | undefined {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) return undefined;

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) return undefined;

    return workbenchLayoutConfigToInput(parseWorkbenchLayoutConfig(JSON.parse(raw) as unknown));
  } catch {
    return undefined;
  }
}

export function writePersistedWorkbenchLayout(
  state: WorkbenchLayoutState,
  storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) return;

  try {
    resolvedStorage.setItem(
      storageKey,
      JSON.stringify(workbenchLayoutStateToStorageValue(state), null, 2),
    );
  } catch {
    // Ignore quota and security errors so the shell keeps working offline.
  }
}

export function resolvePersistedWorkbenchLayout(
  initialLayout: WorkbenchLayoutStateInput | undefined,
  options: {
    persistLayout?: boolean | undefined;
    storage?: WorkbenchStorageReader | undefined;
    storageKey?: string | undefined;
  } = {},
): WorkbenchLayoutStateInput | undefined {
  const {
    initialLayout: baseLayout,
    persistLayout = options.storage !== undefined || isWorkbenchLayoutPersistenceAvailable(),
    storage,
    storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  } = { initialLayout, ...options };

  if (!persistLayout) {
    return baseLayout;
  }

  const persisted = readPersistedWorkbenchLayout(storageKey, storage);
  if (!persisted) {
    return baseLayout;
  }

  return createWorkbenchLayoutState(persisted, createWorkbenchLayoutState(baseLayout ?? {}));
}

function getBrowserLocalStorage(): (WorkbenchStorageReader & WorkbenchStorageWriter) | undefined {
  if (!isWorkbenchLayoutPersistenceAvailable()) {
    return undefined;
  }

  return globalThis.localStorage;
}
