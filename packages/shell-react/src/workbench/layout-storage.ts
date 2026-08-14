import {
  parseWorkbenchLayoutConfig,
  type WorkbenchLayoutConfig,
} from '@workbench-kit/workbench-config';
import {
  createWorkbenchLayoutState,
  type WorkbenchLayoutState,
  type WorkbenchLayoutStateInput,
} from '@workbench-kit/workbench-core/layout';
import type {
  WorkbenchPersistenceDiagnosticOptions,
  WorkbenchPersistenceReadResult,
  WorkbenchPersistenceWriteResult,
} from '@workbench-kit/workbench-core';
import type {
  WorkbenchStorageReader,
  WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core/storage';

import {
  readLocalJsonStorage,
  readLocalJsonStorageResult,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
  writeLocalJsonStorageResult,
} from '../storage/local-json-storage.js';

export const DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY = 'workbench-kit/.workbench/layout';

export function isWorkbenchLayoutPersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
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
      activeViewContainer: config.panel.activeViewContainer,
      sizePercent: config.panel.sizePercent,
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
      ...(state.panel.activeViewContainer
        ? { activeViewContainer: state.panel.activeViewContainer }
        : {}),
      ...(state.panel.sizePercent !== undefined ? { sizePercent: state.panel.sizePercent } : {}),
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
  return readLocalJsonStorage(
    storageKey,
    (value) => workbenchLayoutConfigToInput(parseWorkbenchLayoutConfig(value)),
    () => undefined,
    storage,
  );
}

export function readPersistedWorkbenchLayoutResult(
  storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<WorkbenchLayoutStateInput | undefined> {
  return readLocalJsonStorageResult(
    storageKey,
    (value) => workbenchLayoutConfigToInput(parseWorkbenchLayoutConfig(value)),
    () => undefined,
    storage,
    options,
  );
}

export function writePersistedWorkbenchLayout(
  state: WorkbenchLayoutState,
  storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, state, storage, {
    toStorageValue: workbenchLayoutStateToStorageValue,
  });
}

export function writePersistedWorkbenchLayoutResult(
  state: WorkbenchLayoutState,
  storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeLocalJsonStorageResult(storageKey, state, storage, {
    ...options,
    toStorageValue: workbenchLayoutStateToStorageValue,
  });
}

export function resolvePersistedWorkbenchLayout(
  initialLayout: WorkbenchLayoutStateInput | undefined,
  options: {
    persistLayout?: boolean | undefined;
    storage?: WorkbenchStorageReader | undefined;
    storageKey?: string | undefined;
  } = {},
): WorkbenchLayoutStateInput | undefined {
  return resolvePersistedWorkbenchLayoutResult(initialLayout, options).value;
}

export function resolvePersistedWorkbenchLayoutResult(
  initialLayout: WorkbenchLayoutStateInput | undefined,
  options: {
    persistLayout?: boolean | undefined;
    storage?: WorkbenchStorageReader | undefined;
    storageKey?: string | undefined;
  } = {},
): WorkbenchPersistenceReadResult<WorkbenchLayoutStateInput | undefined> {
  const {
    initialLayout: baseLayout,
    persistLayout = options.storage !== undefined || isWorkbenchLayoutPersistenceAvailable(),
    storage,
    storageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  } = { initialLayout, ...options };

  if (!persistLayout) {
    return { value: baseLayout };
  }

  const result = readPersistedWorkbenchLayoutResult(storageKey, storage);
  if (!result.value) {
    return { ...result, value: baseLayout };
  }

  return {
    ...result,
    value: createWorkbenchLayoutState(result.value, createWorkbenchLayoutState(baseLayout ?? {})),
  };
}
