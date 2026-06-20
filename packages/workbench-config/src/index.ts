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

export interface WorkbenchLayoutConfig {
  readonly activityBar: {
    readonly hiddenItemIds?: readonly string[];
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

export type WorkbenchLayoutConfigInput = Partial<{
  activityBar: Partial<WorkbenchLayoutConfig['activityBar']>;
  panel: Partial<WorkbenchLayoutConfig['panel']>;
  sideBar: Partial<WorkbenchLayoutConfig['sideBar']>;
}>;

export const DEFAULT_WORKBENCH_LAYOUT_CONFIG: WorkbenchLayoutConfig = {
  activityBar: {
    visible: true,
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
  try {
    return parseWorkbenchExtensionsConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected extensions config to be valid JSON.');
  }
}

export function parseWorkbenchLayoutConfig(input: unknown): WorkbenchLayoutConfig {
  const record = assertRecord(input, 'layout config');
  assertKnownKeys(record, ['activityBar', 'panel', 'sideBar'], 'layout config');

  const activityBar = readOptionalRecord(record, 'activityBar');
  const panel = readOptionalRecord(record, 'panel');
  const sideBar = readOptionalRecord(record, 'sideBar');

  assertKnownKeys(
    activityBar,
    ['hiddenItemIds', 'itemOrder', 'visible'],
    'layout config activityBar',
  );
  assertKnownKeys(panel, ['visible'], 'layout config panel');
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
    panel: {
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
  try {
    return parseWorkbenchLayoutConfig(JSON.parse(jsonText) as unknown);
  } catch (error) {
    if (error instanceof WorkbenchConfigValidationError) {
      throw error;
    }

    throw new WorkbenchConfigValidationError('Expected layout config to be valid JSON.');
  }
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
  parseWorkbenchUserCommandsConfig,
  parseWorkbenchUserCommandsConfigJson,
  type WorkbenchUserCommandAction,
  type WorkbenchUserCommandDefinition,
  type WorkbenchUserCommandExecuteAction,
  type WorkbenchUserCommandSequenceAction,
  type WorkbenchUserCommandsConfig,
} from './user-commands-config.js';

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkbenchConfigValidationError(`Expected ${label} to be an object.`);
  }

  return value as Record<string, unknown>;
}

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

function assertKnownKeys(record: Record<string, unknown>, keys: readonly string[], label: string) {
  const knownKeys = new Set(keys);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new WorkbenchConfigValidationError(`Unexpected ${label} field "${unknownKeys[0]}".`);
  }
}
