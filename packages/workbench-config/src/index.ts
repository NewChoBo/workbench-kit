import { assertKnownKeys, assertRecord, parseConfigJson } from './parse-helpers.js';
import { WorkbenchConfigValidationError } from './validation-error.js';

export const WORKBENCH_KIT_WORKBENCH_CONFIG_VERSION = '0.0.0' as const;

export const WORKBENCH_CONFIG_DIR = '.workbench' as const;

export type WorkbenchConfigFileName =
  | 'workspace.json'
  | 'settings.json'
  | 'keybindings.json'
  | 'user-commands.json'
  | 'extensions.json'
  | 'extensions.lock.json'
  | 'layout.default.json'
  | 'tasks.json';

export interface WorkbenchExtensionsConfig {
  enabled: readonly string[];
  recommendations: readonly string[];
}

export interface WorkbenchExtensionsLockEntry {
  readonly integrity?: string | undefined;
  readonly version: string;
}

export interface WorkbenchExtensionsLock {
  readonly extensions: Readonly<Record<string, WorkbenchExtensionsLockEntry>>;
  readonly lockfileVersion: number;
}

export interface WorkbenchLayoutConfig {
  readonly activityBar: {
    readonly hiddenItemIds?: readonly string[];
    readonly itemOrder?: readonly string[];
    readonly visible: boolean;
  };
  readonly auxiliaryBar: {
    readonly visible: boolean;
  };
  readonly panel: {
    readonly activeViewContainer?: string;
    readonly sizePercent?: number;
    readonly visible: boolean;
  };
  readonly sideBar: {
    readonly activeViewContainer?: string;
    readonly sizePercent?: number;
    readonly visible: boolean;
  };
}

export type WorkbenchLayoutConfigInput = Partial<{
  activityBar: Partial<WorkbenchLayoutConfig['activityBar']>;
  auxiliaryBar: Partial<WorkbenchLayoutConfig['auxiliaryBar']>;
  panel: Partial<WorkbenchLayoutConfig['panel']>;
  sideBar: Partial<WorkbenchLayoutConfig['sideBar']>;
}>;

export const DEFAULT_WORKBENCH_LAYOUT_CONFIG: WorkbenchLayoutConfig = {
  activityBar: {
    visible: true,
  },
  auxiliaryBar: {
    visible: false,
  },
  panel: {
    visible: false,
  },
  sideBar: {
    visible: true,
  },
};

export { WorkbenchConfigValidationError };

export function parseWorkbenchExtensionsConfig(input: unknown): WorkbenchExtensionsConfig {
  const record = assertRecord(input, 'extensions config');

  return {
    enabled: readOptionalStringArrayFromExtensionsConfig(record, 'enabled'),
    recommendations: readOptionalStringArrayFromExtensionsConfig(record, 'recommendations'),
  };
}

export function parseWorkbenchExtensionsConfigJson(jsonText: string): WorkbenchExtensionsConfig {
  return parseConfigJson(jsonText, parseWorkbenchExtensionsConfig, 'extensions config');
}

export function parseWorkbenchExtensionsLock(input: unknown): WorkbenchExtensionsLock {
  const record = assertRecord(input, 'extensions lock');
  const lockfileVersion = record.lockfileVersion;
  if (
    typeof lockfileVersion !== 'number' ||
    !Number.isInteger(lockfileVersion) ||
    lockfileVersion < 1
  ) {
    throw new WorkbenchConfigValidationError(
      'Expected extensions lock "lockfileVersion" to be a positive integer.',
    );
  }

  const extensionsRecord = assertRecord(record.extensions ?? {}, 'extensions lock extensions');
  const extensions: Record<string, WorkbenchExtensionsLockEntry> = {};
  for (const [extensionId, rawEntry] of Object.entries(extensionsRecord)) {
    const entry = assertRecord(rawEntry, `extensions lock entry "${extensionId}"`);
    if (typeof entry.version !== 'string' || entry.version.trim().length === 0) {
      throw new WorkbenchConfigValidationError(
        `Expected extensions lock entry "${extensionId}" to include a non-empty version.`,
      );
    }
    if (entry.integrity !== undefined && typeof entry.integrity !== 'string') {
      throw new WorkbenchConfigValidationError(
        `Expected extensions lock entry "${extensionId}" integrity to be a string.`,
      );
    }
    extensions[extensionId] = {
      integrity: typeof entry.integrity === 'string' ? entry.integrity : undefined,
      version: entry.version.trim(),
    };
  }

  return {
    extensions,
    lockfileVersion,
  };
}

export function parseWorkbenchExtensionsLockJson(jsonText: string): WorkbenchExtensionsLock {
  return parseConfigJson(jsonText, parseWorkbenchExtensionsLock, 'extensions lock');
}

export function parseWorkbenchLayoutConfig(input: unknown): WorkbenchLayoutConfig {
  const record = assertRecord(input, 'layout config');
  assertKnownKeys(record, ['activityBar', 'auxiliaryBar', 'panel', 'sideBar'], 'layout config');

  const activityBar = readOptionalRecord(record, 'activityBar');
  const auxiliaryBar = readOptionalRecord(record, 'auxiliaryBar');
  const panel = readOptionalRecord(record, 'panel');
  const sideBar = readOptionalRecord(record, 'sideBar');

  assertKnownKeys(
    activityBar,
    ['hiddenItemIds', 'itemOrder', 'visible'],
    'layout config activityBar',
  );
  assertKnownKeys(auxiliaryBar, ['visible'], 'layout config auxiliaryBar');
  assertKnownKeys(panel, ['activeViewContainer', 'sizePercent', 'visible'], 'layout config panel');
  assertKnownKeys(
    sideBar,
    ['activeViewContainer', 'sizePercent', 'visible'],
    'layout config sideBar',
  );

  return {
    activityBar: {
      hiddenItemIds: readOptionalStringArray(activityBar, 'hiddenItemIds'),
      itemOrder: readOptionalStringArray(activityBar, 'itemOrder'),
      visible: readOptionalBoolean(
        activityBar,
        'visible',
        DEFAULT_WORKBENCH_LAYOUT_CONFIG.activityBar.visible,
      ),
    },
    auxiliaryBar: {
      visible: readOptionalBoolean(
        auxiliaryBar,
        'visible',
        DEFAULT_WORKBENCH_LAYOUT_CONFIG.auxiliaryBar.visible,
      ),
    },
    panel: {
      ...readOptionalLayoutId(panel, 'activeViewContainer'),
      ...readOptionalSizePercent(panel, 'sizePercent'),
      visible: readOptionalBoolean(panel, 'visible', DEFAULT_WORKBENCH_LAYOUT_CONFIG.panel.visible),
    },
    sideBar: {
      ...readOptionalLayoutId(sideBar, 'activeViewContainer'),
      ...readOptionalSizePercent(sideBar, 'sizePercent'),
      visible: readOptionalBoolean(
        sideBar,
        'visible',
        DEFAULT_WORKBENCH_LAYOUT_CONFIG.sideBar.visible,
      ),
    },
  };
}

export function parseWorkbenchLayoutConfigJson(jsonText: string): WorkbenchLayoutConfig {
  return parseConfigJson(jsonText, parseWorkbenchLayoutConfig, 'layout config');
}

export {
  parseWorkbenchKeybindingsConfig,
  parseWorkbenchKeybindingsConfigJson,
  type WorkbenchKeybindingDefinition,
} from './keybindings-config.js';
export {
  parseWorkbenchSettingsConfig,
  parseWorkbenchSettingsConfigJson,
  type WorkbenchSettingsConfig,
} from './settings-config.js';
export {
  createEmptyPreferenceValuesByScope,
  FUTURE_PREFERENCE_SCOPES,
  isPreferenceScope,
  mergePreferenceValuesByScope,
  mergeScopedPreferences,
  PREFERENCE_SCOPE_MERGE_ORDER,
  type FuturePreferenceScope,
  type PreferenceScope,
  type PreferenceValuesByScope,
  type ScopedPreferenceLayer,
} from './preference-scopes.js';
export {
  parseWorkbenchUserCommandsConfig,
  parseWorkbenchUserCommandsConfigJson,
  type WorkbenchUserCommandAction,
  type WorkbenchUserCommandDefinition,
  type WorkbenchUserCommandExecuteAction,
  type WorkbenchUserCommandSequenceAction,
  type WorkbenchUserCommandsConfig,
} from './user-commands-config.js';

function readOptionalRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be an object.`);
  }

  return value as Record<string, unknown>;
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
): readonly string[] | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be an array of strings.`);
  }

  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function readOptionalStringArrayFromExtensionsConfig(
  record: Record<string, unknown>,
  key: keyof WorkbenchExtensionsConfig,
): readonly string[] {
  const value = record[key];
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be an array of strings.`);
  }

  return [...value];
}

function readOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = record[key];
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a boolean.`);
  }

  return value;
}

function readOptionalLayoutId(
  record: Record<string, unknown>,
  key: string,
): { readonly activeViewContainer?: string } {
  const value = record[key];
  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a non-empty string.`);
  }

  return {
    activeViewContainer: value,
  };
}

function readOptionalSizePercent(
  record: Record<string, unknown>,
  key: string,
): { readonly sizePercent?: number } {
  const value = record[key];
  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorkbenchConfigValidationError(`Expected "${key}" to be a finite number.`);
  }

  return {
    sizePercent: clampLayoutSizePercent(value),
  };
}

function clampLayoutSizePercent(value: number): number {
  return Math.min(90, Math.max(10, value));
}
