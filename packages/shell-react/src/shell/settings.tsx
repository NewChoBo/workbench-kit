import type { ReactNode } from 'react';
import { Badge, Checkbox, Field, Select } from '@workbench-kit/react/primitives';
import {
  DEFAULT_SHELL_PRESET,
  SHELL_PRESET_OPTIONS,
  WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS,
  WORKBENCH_APPEARANCE_FIELD_LABELS,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
} from '@workbench-kit/react/workbench';
import {
  WorkbenchSettingsSection,
  type WorkbenchSettingsCategory,
} from '@workbench-kit/react/workbench/settings';
import {
  type ConfigurationRegistry,
  type LocalizationRegistry,
  type PreferenceService,
} from '@workbench-kit/workbench-core';
import type { PreferenceScope } from '@workbench-kit/workbench-config';

import { isRecord } from '../is-record.js';
import type { WorkbenchExtensionCatalogReader } from './provider.js';
import {
  getWorkbenchAppearanceCatalogEntries,
  resolveWorkbenchAppearanceSelection,
  type WorkbenchAppearanceCatalogEntry,
  type WorkbenchAppearanceCatalogSnapshot,
  type WorkbenchAppearanceSelectionResolution,
  type WorkbenchAppearanceSelectionTarget,
} from './appearance-catalog.js';
import { classifyWorkbenchAppearanceThemeSelection } from './appearance-presentation.js';
import { WORKBENCH_PREFERENCE_SCOPES } from './settings-constants.js';

const APPEARANCE_SETTINGS_CATEGORY_ID = 'workbench.appearance';

export interface WorkbenchThemeOption {
  description?: ReactNode;
  id: string;
  label: string;
}

/** Captures one renderer-private own-data view shared by catalog and Settings projection. */
export function createWorkbenchThemeOptionSnapshot(
  options: readonly WorkbenchThemeOption[] | undefined,
): readonly WorkbenchThemeOption[] | undefined {
  if (options === undefined) {
    return undefined;
  }

  const snapshot = new Array<WorkbenchThemeOption>(options.length);
  options.forEach((option, sourceOrdinal) => {
    const idDescriptor = Object.getOwnPropertyDescriptor(option, 'id');
    const labelDescriptor = Object.getOwnPropertyDescriptor(option, 'label');
    if (
      !idDescriptor ||
      !('value' in idDescriptor) ||
      typeof idDescriptor.value !== 'string' ||
      !labelDescriptor ||
      !('value' in labelDescriptor) ||
      typeof labelDescriptor.value !== 'string'
    ) {
      return;
    }

    const descriptionDescriptor = Object.getOwnPropertyDescriptor(option, 'description');
    const captured = {
      id: idDescriptor.value,
      label: labelDescriptor.value,
      ...(descriptionDescriptor && 'value' in descriptionDescriptor
        ? { description: descriptionDescriptor.value as ReactNode }
        : {}),
    };
    snapshot[sourceOrdinal] = Object.freeze(captured);
  });

  return Object.freeze(snapshot);
}

export interface WorkbenchLocaleOption {
  id: string;
  label: string;
}

interface WorkbenchAppearanceSettingsInput {
  darkPreset?: string | undefined;
  lightPreset?: string | undefined;
  locale?: string | undefined;
  localeOptions?: readonly WorkbenchLocaleOption[] | undefined;
  onDarkPresetChange?: ((preset: string) => void) | undefined;
  onLightPresetChange?: ((preset: string) => void) | undefined;
  onLocaleChange?: ((locale: string) => void) | undefined;
  onShellPresetChange?: ((preset: string) => void) | undefined;
  onThemeChange?: ((theme: string) => void) | undefined;
  shellPreset?: string | undefined;
  theme?: string | undefined;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
}

export interface WorkbenchSettingsCategoryInput extends WorkbenchAppearanceSettingsInput {
  activeScope: PreferenceScope;
  preferenceService: PreferenceService;
}

export interface WorkbenchSettingsContributionAccess {
  readonly appearanceCatalog: WorkbenchAppearanceCatalogSnapshot;
  readonly configurations: ConfigurationRegistry;
  readonly extensionCatalog: WorkbenchExtensionCatalogReader;
  readonly localizations: LocalizationRegistry;
}

export function createSettingsCategories(
  contributions: WorkbenchSettingsContributionAccess,
  {
    activeScope,
    darkPreset,
    lightPreset,
    locale,
    onDarkPresetChange,
    onLightPresetChange,
    onLocaleChange,
    onShellPresetChange,
    onThemeChange,
    preferenceService,
    shellPreset,
    theme,
    themeOptions,
  }: WorkbenchSettingsCategoryInput,
): WorkbenchSettingsCategory[] {
  const configurations = contributions.configurations.getConfigurations();
  const localeOptions = buildLocaleOptions(contributions.localizations.getLocalizations());
  const appearanceCategory = createAppearanceSettingsCategory({
    appearanceCatalog: contributions.appearanceCatalog,
    darkPreset,
    lightPreset,
    locale,
    localeOptions,
    onDarkPresetChange,
    onLightPresetChange,
    onLocaleChange,
    onShellPresetChange,
    onThemeChange,
    shellPreset,
    theme,
    themeOptions,
  });

  if (configurations.length === 0) {
    const fallbackCategory = {
      content: (
        <WorkbenchSettingsSection
          id="workbench-settings-empty"
          title="Workbench"
          description="No extension settings are currently registered."
        >
          <p className="workbench-settings-empty">Enable extensions to contribute settings.</p>
        </WorkbenchSettingsSection>
      ),
      id: 'workbench',
      label: 'Workbench',
    } satisfies WorkbenchSettingsCategory;

    return appearanceCategory ? [appearanceCategory, fallbackCategory] : [fallbackCategory];
  }

  const contributedCategories = configurations.map(({ extensionId, configuration }) => {
    const extension = contributions.extensionCatalog.getExtension(extensionId);
    const displayName = extension?.manifest.displayName ?? titleFromExtensionId(extensionId);
    const properties = Object.entries(configuration.properties ?? {});

    return {
      content: (
        <WorkbenchSettingsSection
          id={`workbench-settings-${slugId(extensionId)}`}
          title={displayName}
          description={`${properties.length} ${
            properties.length === 1 ? 'setting is' : 'settings are'
          } contributed by ${extensionId}.`}
        >
          {properties.length ? (
            <div className="workbench-settings-contribution-list">
              {properties.map(([key, value]) => (
                <SettingContributionField
                  key={key}
                  activeScope={activeScope}
                  preferenceService={preferenceService}
                  propertyKey={key}
                  propertyValue={value}
                />
              ))}
            </div>
          ) : (
            <p className="workbench-settings-empty">
              This extension registered a configuration section without properties.
            </p>
          )}
        </WorkbenchSettingsSection>
      ),
      id: extensionId,
      label: displayName,
      title: extensionId,
    } satisfies WorkbenchSettingsCategory;
  });

  return appearanceCategory
    ? [appearanceCategory, ...contributedCategories]
    : contributedCategories;
}

function formatPreferenceScopeLabel(scope: PreferenceScope): string {
  return WORKBENCH_PREFERENCE_SCOPES.find((candidate) => candidate.id === scope)?.label ?? scope;
}

function buildLocaleOptions(
  localizations: readonly { locale: string; label: string }[],
): readonly WorkbenchLocaleOption[] {
  const options: WorkbenchLocaleOption[] = [{ id: 'en', label: 'English' }];

  for (const localization of localizations) {
    options.push({ id: localization.locale, label: localization.label });
  }

  return options;
}

interface WorkbenchAppearancePresentedOption extends WorkbenchThemeOption {
  readonly entry: WorkbenchAppearanceCatalogEntry;
}

function projectAppearanceOptions(
  catalog: WorkbenchAppearanceCatalogSnapshot,
  target: WorkbenchAppearanceSelectionTarget,
  hostOptions: readonly WorkbenchThemeOption[] | undefined,
): readonly WorkbenchAppearancePresentedOption[] {
  const projected: WorkbenchAppearancePresentedOption[] = [];
  const visitedIds = new Set<string>();

  for (const entry of getWorkbenchAppearanceCatalogEntries(catalog, target)) {
    if (visitedIds.has(entry.id)) {
      continue;
    }
    visitedIds.add(entry.id);

    const resolution = resolveWorkbenchAppearanceSelection(catalog, target, entry.id);
    if (resolution.status !== 'resolved') {
      continue;
    }

    let description: ReactNode;
    if (entry.source === 'host-option') {
      const original = hostOptions?.[entry.sourceOrdinal];
      if (!original || original.id !== entry.id || original.label !== entry.label) {
        continue;
      }
      description = original.description;
    } else if (entry.source === 'legacy-extension-theme' || entry.source === 'legacy-host-theme') {
      description = entry.hasLegacyCssOverrides
        ? 'Contributed theme that declares token overrides.'
        : 'Contributed theme.';
    }

    projected.push({ description, entry, id: entry.id, label: entry.label });
  }

  return projected;
}

function findProjectedOption(
  options: readonly WorkbenchAppearancePresentedOption[],
  id: string | undefined,
): WorkbenchAppearancePresentedOption | undefined {
  return id === undefined ? undefined : options.find((option) => option.id === id);
}

function resolveRawAppearanceSelection(
  catalog: WorkbenchAppearanceCatalogSnapshot,
  target: WorkbenchAppearanceSelectionTarget,
  rawValue: string | undefined,
): WorkbenchAppearanceSelectionResolution | undefined {
  return rawValue === undefined
    ? undefined
    : resolveWorkbenchAppearanceSelection(catalog, target, rawValue);
}

function describeAppearanceResolution(
  rawValue: string,
  resolution: Exclude<WorkbenchAppearanceSelectionResolution, { status: 'resolved' }>,
): string {
  switch (resolution.status) {
    case 'conflicted':
      return `The appearance “${rawValue}” has conflicting sources. Choose another listed option to recover.`;
    case 'wrong-scheme':
      return `The appearance “${rawValue}” does not belong to the ${resolution.expected} scheme. Choose a listed option to recover.`;
    case 'unresolved':
      return `The appearance “${rawValue}” is unavailable. Choose a listed option to recover.`;
  }
}

function renderInvalidAppearanceOption(
  rawValue: string | undefined,
  resolution: WorkbenchAppearanceSelectionResolution | undefined,
) {
  if (rawValue === undefined) {
    return (
      <option disabled value="">
        No appearance selected
      </option>
    );
  }
  if (!resolution || resolution.status === 'resolved') {
    return null;
  }
  return (
    <option disabled value={rawValue}>
      Unavailable: {rawValue}
    </option>
  );
}

function AppearanceSelectionDiagnostic({
  id,
  rawValue,
  resolution,
}: {
  id: string;
  rawValue: string | undefined;
  resolution: WorkbenchAppearanceSelectionResolution | undefined;
}) {
  if (rawValue === undefined || !resolution || resolution.status === 'resolved') {
    return null;
  }
  return (
    <p id={id} className="workbench-appearance-settings__description" role="status">
      {describeAppearanceResolution(rawValue, resolution)}
    </p>
  );
}

function createAppearanceSettingsCategory({
  appearanceCatalog,
  darkPreset,
  lightPreset,
  locale,
  localeOptions,
  onDarkPresetChange,
  onLightPresetChange,
  onLocaleChange,
  onShellPresetChange,
  onThemeChange,
  shellPreset,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  appearanceCatalog: WorkbenchAppearanceCatalogSnapshot;
  localeOptions: readonly WorkbenchLocaleOption[];
}): WorkbenchSettingsCategory | undefined {
  return {
    content: (
      <AppearanceSettingsSection
        appearanceCatalog={appearanceCatalog}
        darkPreset={darkPreset}
        lightPreset={lightPreset}
        locale={locale}
        localeOptions={localeOptions ?? []}
        shellPreset={shellPreset}
        theme={theme}
        themeOptions={themeOptions}
        onDarkPresetChange={onDarkPresetChange}
        onLightPresetChange={onLightPresetChange}
        onLocaleChange={onLocaleChange}
        onShellPresetChange={onShellPresetChange}
        onThemeChange={onThemeChange}
      />
    ),
    id: APPEARANCE_SETTINGS_CATEGORY_ID,
    label: 'Appearance',
  };
}

function AppearanceSettingsSection({
  appearanceCatalog,
  darkPreset,
  lightPreset,
  locale,
  localeOptions,
  onDarkPresetChange,
  onLightPresetChange,
  onLocaleChange,
  onShellPresetChange,
  onThemeChange,
  shellPreset = DEFAULT_SHELL_PRESET,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  appearanceCatalog: WorkbenchAppearanceCatalogSnapshot;
  localeOptions: readonly WorkbenchLocaleOption[];
}) {
  const usesAppearancePresets = lightPreset !== undefined && darkPreset !== undefined;
  const themeSelection = classifyWorkbenchAppearanceThemeSelection(theme);
  const flatThemeProjection = projectAppearanceOptions(
    appearanceCatalog,
    'flat-theme',
    themeOptions,
  );
  const lightPresetProjection = projectAppearanceOptions(
    appearanceCatalog,
    'light-preset',
    themeOptions,
  );
  const darkPresetProjection = projectAppearanceOptions(
    appearanceCatalog,
    'dark-preset',
    themeOptions,
  );
  const flatThemeResolution = resolveRawAppearanceSelection(
    appearanceCatalog,
    'flat-theme',
    themeSelection.kind === 'flat-theme' ? themeSelection.rawTheme : undefined,
  );
  const lightPresetResolution = resolveRawAppearanceSelection(
    appearanceCatalog,
    'light-preset',
    lightPreset,
  );
  const darkPresetResolution = resolveRawAppearanceSelection(
    appearanceCatalog,
    'dark-preset',
    darkPreset,
  );
  const selectedTheme = findProjectedOption(
    flatThemeProjection,
    themeSelection.kind === 'flat-theme' ? themeSelection.rawTheme : undefined,
  );
  const selectedThemeValue =
    themeSelection.kind === 'base-preference' ? themeSelection.preference : themeSelection.rawTheme;
  const colorSchemeDiagnostic =
    usesAppearancePresets && themeSelection.kind === 'flat-theme'
      ? `The color scheme “${themeSelection.rawTheme}” is unavailable. Choose a listed scheme to recover.`
      : undefined;
  const selectedLocale = localeOptions.find((option) => option.id === locale) ?? localeOptions[0];
  const selectedLocaleId = selectedLocale?.id ?? 'en';
  const selectedShellPreset =
    SHELL_PRESET_OPTIONS.find((option) => option.id === shellPreset) ?? SHELL_PRESET_OPTIONS[0];

  return (
    <WorkbenchSettingsSection
      id="workbench-settings-appearance"
      title="Appearance"
      description="Configure how the workbench is presented."
    >
      <div className="workbench-appearance-settings">
        {usesAppearancePresets ? (
          <>
            <Field
              className="workbench-appearance-settings__field"
              label={WORKBENCH_APPEARANCE_FIELD_LABELS.colorScheme}
              description={WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS.colorScheme}
            >
              <Select
                aria-label={WORKBENCH_APPEARANCE_FIELD_LABELS.colorScheme}
                aria-describedby={
                  colorSchemeDiagnostic ? 'workbench-color-scheme-diagnostic' : undefined
                }
                controlWidth="full"
                disabled={!onThemeChange}
                value={selectedThemeValue}
                onValueChange={(nextTheme) => onThemeChange?.(nextTheme)}
              >
                {colorSchemeDiagnostic ? (
                  <option disabled value={theme}>
                    Unavailable: {theme}
                  </option>
                ) : null}
                {WORKBENCH_COLOR_SCHEME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {colorSchemeDiagnostic ? (
                <p
                  id="workbench-color-scheme-diagnostic"
                  className="workbench-appearance-settings__description"
                  role="status"
                >
                  {colorSchemeDiagnostic}
                </p>
              ) : null}
            </Field>
            <Field
              className="workbench-appearance-settings__field"
              label={WORKBENCH_APPEARANCE_FIELD_LABELS.preferredLightColorTheme}
              description={WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS.preferredLightColorTheme}
            >
              <Select
                aria-label={WORKBENCH_APPEARANCE_FIELD_LABELS.preferredLightColorTheme}
                aria-describedby={
                  lightPresetResolution && lightPresetResolution.status !== 'resolved'
                    ? 'workbench-light-preset-diagnostic'
                    : undefined
                }
                controlWidth="full"
                disabled={!onLightPresetChange}
                value={lightPreset ?? ''}
                onValueChange={(nextPreset) => onLightPresetChange?.(nextPreset)}
              >
                {renderInvalidAppearanceOption(lightPreset, lightPresetResolution)}
                {lightPresetProjection.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <AppearanceSelectionDiagnostic
                id="workbench-light-preset-diagnostic"
                rawValue={lightPreset}
                resolution={lightPresetResolution}
              />
            </Field>
            <Field
              className="workbench-appearance-settings__field"
              label={WORKBENCH_APPEARANCE_FIELD_LABELS.preferredDarkColorTheme}
              description={WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS.preferredDarkColorTheme}
            >
              <Select
                aria-label={WORKBENCH_APPEARANCE_FIELD_LABELS.preferredDarkColorTheme}
                aria-describedby={
                  darkPresetResolution && darkPresetResolution.status !== 'resolved'
                    ? 'workbench-dark-preset-diagnostic'
                    : undefined
                }
                controlWidth="full"
                disabled={!onDarkPresetChange}
                value={darkPreset ?? ''}
                onValueChange={(nextPreset) => onDarkPresetChange?.(nextPreset)}
              >
                {renderInvalidAppearanceOption(darkPreset, darkPresetResolution)}
                {darkPresetProjection.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <AppearanceSelectionDiagnostic
                id="workbench-dark-preset-diagnostic"
                rawValue={darkPreset}
                resolution={darkPresetResolution}
              />
            </Field>
            <Field
              className="workbench-appearance-settings__field"
              label={WORKBENCH_APPEARANCE_FIELD_LABELS.workbenchLayout}
              description={WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS.workbenchLayout}
            >
              <Select
                aria-label={WORKBENCH_APPEARANCE_FIELD_LABELS.workbenchLayout}
                controlWidth="full"
                disabled={!onShellPresetChange}
                value={selectedShellPreset.id}
                onValueChange={(nextPreset) => onShellPresetChange?.(nextPreset)}
              >
                {SHELL_PRESET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field
            className="workbench-appearance-settings__field"
            label="Color theme"
            description="Select the active workbench color theme."
          >
            <Select
              aria-label="Color theme"
              aria-describedby={
                flatThemeResolution && flatThemeResolution.status !== 'resolved'
                  ? 'workbench-flat-theme-diagnostic'
                  : undefined
              }
              controlWidth="full"
              disabled={!onThemeChange}
              value={selectedThemeValue}
              onValueChange={(nextTheme) => onThemeChange?.(nextTheme)}
            >
              {renderInvalidAppearanceOption(
                themeSelection.kind === 'flat-theme' ? themeSelection.rawTheme : undefined,
                flatThemeResolution,
              )}
              {WORKBENCH_COLOR_SCHEME_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
              {flatThemeProjection
                .filter(
                  (option) =>
                    classifyWorkbenchAppearanceThemeSelection(option.id).kind === 'flat-theme',
                )
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </Select>
            {selectedTheme?.description ? (
              <p className="workbench-appearance-settings__description">
                {selectedTheme.description}
              </p>
            ) : null}
            <AppearanceSelectionDiagnostic
              id="workbench-flat-theme-diagnostic"
              rawValue={themeSelection.kind === 'flat-theme' ? themeSelection.rawTheme : undefined}
              resolution={flatThemeResolution}
            />
          </Field>
        )}
        {localeOptions.length > 1 ? (
          <Field
            className="workbench-appearance-settings__field"
            label="Display language"
            description="Select the active workbench display language."
          >
            <Select
              aria-label="Display language"
              controlWidth="full"
              disabled={!onLocaleChange}
              value={selectedLocaleId}
              onValueChange={(nextLocale) => onLocaleChange?.(nextLocale)}
            >
              {localeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
    </WorkbenchSettingsSection>
  );
}

function SettingContributionField({
  activeScope,
  preferenceService,
  propertyKey,
  propertyValue,
}: {
  activeScope: PreferenceScope;
  preferenceService: PreferenceService;
  propertyKey: string;
  propertyValue: unknown;
}) {
  const property = isRecord(propertyValue) ? propertyValue : {};
  const description = typeof property.description === 'string' ? property.description : undefined;
  const scope = typeof property.scope === 'string' ? property.scope : undefined;
  const type = formatSettingType(property.type);
  const hasDefault = Object.prototype.hasOwnProperty.call(property, 'default');
  const inspection = preferenceService.inspect(propertyKey);
  const scopedValue = preferenceService.getScopedValue(propertyKey, activeScope);
  const editableValue =
    scopedValue !== undefined ? scopedValue : (inspection.effectiveValue ?? property.default);

  return (
    <Field
      className="workbench-settings-contribution-field"
      label={<code>{propertyKey}</code>}
      description={description}
    >
      <div className="workbench-settings-contribution-meta">
        {type ? <Badge variant="muted">{type}</Badge> : null}
        {scope ? <Badge variant="muted">{scope}</Badge> : null}
        <Badge variant="muted">effective: {formatSettingDefault(inspection.effectiveValue)}</Badge>
      </div>
      {property.type === 'boolean' ? (
        <Checkbox
          checked={editableValue === true}
          label={`${formatPreferenceScopeLabel(activeScope)} value`}
          onCheckedChange={(checked) => {
            preferenceService.setScopedValue(propertyKey, activeScope, checked);
          }}
        />
      ) : hasDefault ? (
        <code className="workbench-settings-contribution-default">
          default: {formatSettingDefault(property.default)}
        </code>
      ) : null}
    </Field>
  );
}

function formatSettingType(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value.join(' | ');
  }

  return undefined;
}

function formatSettingDefault(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function titleFromExtensionId(extensionId: string): string {
  const parts = extensionId.split('.').filter(Boolean);
  const lastPart = parts[parts.length - 1];

  return (
    lastPart?.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) ??
    extensionId
  );
}

function slugId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}
