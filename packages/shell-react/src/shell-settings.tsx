import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Badge, Checkbox, Field, Select } from '@workbench-kit/react/primitives';
import {
  applyWorkbenchAppearance,
  DARK_THEME_PRESET_OPTIONS,
  LIGHT_THEME_PRESET_OPTIONS,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
  type WorkbenchColorSchemePreference,
  type WorkbenchThemePresetOption,
} from '@workbench-kit/react/workbench';
import {
  WorkbenchSettingsSection,
  type WorkbenchSettingsCategory,
} from '@workbench-kit/react/workbench/settings';
import {
  applyThemeTokenOverrides,
  type ExtensionRegistry,
  type PreferenceService,
} from '@workbench-kit/workbench-core';
import type { PreferenceScope } from '@workbench-kit/workbench-config';

import { useWorkbench } from './provider.js';

const APPEARANCE_SETTINGS_CATEGORY_ID = 'workbench.appearance';

export const SETTINGS_EXTENSION_ID = 'workbench-kit.builtin.settings';
export const WORKBENCH_PREFERENCE_SCOPES = [
  { id: 'default', label: 'Default' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'local', label: 'Local' },
] as const satisfies ReadonlyArray<{ id: PreferenceScope; label: string }>;

export interface WorkbenchThemeOption {
  description?: ReactNode;
  id: string;
  label: string;
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
  onThemeChange?: ((theme: string) => void) | undefined;
  theme?: string | undefined;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
}

export interface WorkbenchSettingsCategoryInput extends WorkbenchAppearanceSettingsInput {
  activeScope: PreferenceScope;
  preferenceService: PreferenceService;
}

export function createSettingsCategories(
  extensionRegistry: ExtensionRegistry,
  {
    activeScope,
    darkPreset,
    lightPreset,
    locale,
    onDarkPresetChange,
    onLightPresetChange,
    onLocaleChange,
    onThemeChange,
    preferenceService,
    theme,
    themeOptions,
  }: WorkbenchSettingsCategoryInput,
): WorkbenchSettingsCategory[] {
  const configurations = extensionRegistry.configurations.getConfigurations();
  const mergedThemeOptions = mergeThemeOptions(themeOptions, extensionRegistry.themes.getThemes());
  const localeOptions = buildLocaleOptions(extensionRegistry.localizations.getLocalizations());
  const appearanceCategory = createAppearanceSettingsCategory({
    darkPreset,
    lightPreset,
    locale,
    localeOptions,
    onDarkPresetChange,
    onLightPresetChange,
    onLocaleChange,
    onThemeChange,
    theme,
    themeOptions: mergedThemeOptions,
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
    const extension = extensionRegistry.getExtension(extensionId);
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

function mergeThemeOptions(
  baseOptions: readonly WorkbenchThemeOption[] | undefined,
  contributedThemes: readonly {
    id: string;
    label: string;
    tokenOverrides?: Record<string, string> | undefined;
  }[],
): readonly WorkbenchThemeOption[] {
  const merged = new Map<string, WorkbenchThemeOption>();

  for (const option of baseOptions ?? []) {
    merged.set(option.id, option);
  }

  for (const theme of contributedThemes) {
    merged.set(theme.id, {
      description: theme.tokenOverrides
        ? 'Contributed theme with token overrides.'
        : 'Contributed theme.',
      id: theme.id,
      label: theme.label,
    });
  }

  return [...merged.values()];
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

function createAppearanceSettingsCategory({
  darkPreset,
  lightPreset,
  locale,
  localeOptions,
  onDarkPresetChange,
  onLightPresetChange,
  onLocaleChange,
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  localeOptions: readonly WorkbenchLocaleOption[];
  themeOptions: readonly WorkbenchThemeOption[];
}): WorkbenchSettingsCategory | undefined {
  const usesAppearancePresets = lightPreset !== undefined && darkPreset !== undefined;

  if (!usesAppearancePresets && !themeOptions?.length && !localeOptions?.length) {
    return undefined;
  }

  return {
    content: (
      <AppearanceSettingsSection
        darkPreset={darkPreset}
        lightPreset={lightPreset}
        locale={locale}
        localeOptions={localeOptions ?? []}
        theme={theme}
        themeOptions={themeOptions ?? []}
        onDarkPresetChange={onDarkPresetChange}
        onLightPresetChange={onLightPresetChange}
        onLocaleChange={onLocaleChange}
        onThemeChange={onThemeChange}
      />
    ),
    id: APPEARANCE_SETTINGS_CATEGORY_ID,
    label: 'Appearance',
  };
}

function AppearanceSettingsSection({
  darkPreset,
  lightPreset,
  locale,
  localeOptions,
  onDarkPresetChange,
  onLightPresetChange,
  onLocaleChange,
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  localeOptions: readonly WorkbenchLocaleOption[];
  themeOptions: readonly WorkbenchThemeOption[];
}) {
  const { extensionRegistry } = useWorkbench();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousThemeOverridesRef = useRef<Readonly<Record<string, string>> | undefined>(undefined);
  const usesAppearancePresets = lightPreset !== undefined && darkPreset !== undefined;
  const lightPresetOptions = useMemo<readonly WorkbenchThemePresetOption[]>(
    () => [
      ...LIGHT_THEME_PRESET_OPTIONS,
      ...extensionRegistry.themes
        .getThemes()
        .filter((contributedTheme) => contributedTheme.mode === 'light')
        .map((contributedTheme) => ({ id: contributedTheme.id, label: contributedTheme.label })),
    ],
    [extensionRegistry.themes],
  );
  const darkPresetOptions = useMemo<readonly WorkbenchThemePresetOption[]>(
    () => [
      ...DARK_THEME_PRESET_OPTIONS,
      ...extensionRegistry.themes
        .getThemes()
        .filter((contributedTheme) => contributedTheme.mode === 'dark')
        .map((contributedTheme) => ({ id: contributedTheme.id, label: contributedTheme.label })),
    ],
    [extensionRegistry.themes],
  );
  const selectedTheme = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];
  const selectedThemeId = selectedTheme?.id ?? '';
  const selectedColorScheme =
    WORKBENCH_COLOR_SCHEME_OPTIONS.find((option) => option.id === theme) ??
    WORKBENCH_COLOR_SCHEME_OPTIONS[0];
  const selectedColorSchemeId = (selectedColorScheme?.id ??
    'system') as WorkbenchColorSchemePreference;
  const selectedLightPreset =
    lightPresetOptions.find((option) => option.id === lightPreset) ?? lightPresetOptions[0];
  const selectedDarkPreset =
    darkPresetOptions.find((option) => option.id === darkPreset) ?? darkPresetOptions[0];
  const selectedLocale = localeOptions.find((option) => option.id === locale) ?? localeOptions[0];
  const selectedLocaleId = selectedLocale?.id ?? 'en';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let activeThemeId: string | undefined;

    if (usesAppearancePresets) {
      const { resolvedTheme } = applyWorkbenchAppearance(document.documentElement, {
        darkPreset: selectedDarkPreset.id,
        lightPreset: selectedLightPreset.id,
        themePreference: selectedColorSchemeId,
      });
      activeThemeId = resolvedTheme === 'light' ? selectedLightPreset.id : selectedDarkPreset.id;
    } else {
      activeThemeId = selectedThemeId;
    }

    const contributedTheme = activeThemeId
      ? extensionRegistry.themes.getTheme(activeThemeId)
      : undefined;

    // The actual workbench root (e.g. `.ide-root`) re-declares `data-theme-preset` locally,
    // which shadows inheritance from `documentElement` for everything rendered inside it.
    // Apply the override there too, or it only ever reaches stray document.body portals.
    const workbenchRoot = containerRef.current?.closest<HTMLElement>(
      '[data-theme-preset], [data-theme]',
    );
    const overrideTargets =
      workbenchRoot && workbenchRoot !== document.documentElement
        ? [document.documentElement, workbenchRoot]
        : [document.documentElement];

    for (const target of overrideTargets) {
      applyThemeTokenOverrides(
        target,
        contributedTheme?.tokenOverrides,
        previousThemeOverridesRef.current,
      );
    }
    previousThemeOverridesRef.current = contributedTheme?.tokenOverrides;
  }, [
    extensionRegistry.themes,
    selectedColorSchemeId,
    selectedDarkPreset.id,
    selectedLightPreset.id,
    selectedThemeId,
    usesAppearancePresets,
  ]);

  return (
    <WorkbenchSettingsSection
      id="workbench-settings-appearance"
      title="Appearance"
      description="Configure how the workbench is presented."
    >
      <div ref={containerRef} className="workbench-appearance-settings">
        {usesAppearancePresets ? (
          <>
            <Field
              className="workbench-appearance-settings__field"
              label="Color scheme"
              description="Choose System to follow the OS, or force Light or Dark mode."
            >
              <Select
                aria-label="Color scheme"
                controlWidth="full"
                disabled={!onThemeChange}
                value={selectedColorSchemeId}
                onValueChange={(nextTheme) => onThemeChange?.(nextTheme)}
              >
                {WORKBENCH_COLOR_SCHEME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              className="workbench-appearance-settings__field"
              label="Light preset"
              description="Palette used when the workbench resolves to light mode."
            >
              <Select
                aria-label="Light preset"
                controlWidth="full"
                disabled={!onLightPresetChange}
                value={selectedLightPreset.id}
                onValueChange={(nextPreset) => onLightPresetChange?.(nextPreset)}
              >
                {lightPresetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              className="workbench-appearance-settings__field"
              label="Dark preset"
              description="Palette used when the workbench resolves to dark mode."
            >
              <Select
                aria-label="Dark preset"
                controlWidth="full"
                disabled={!onDarkPresetChange}
                value={selectedDarkPreset.id}
                onValueChange={(nextPreset) => onDarkPresetChange?.(nextPreset)}
              >
                {darkPresetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : themeOptions.length ? (
          <Field
            className="workbench-appearance-settings__field"
            label="Color theme"
            description="Select the active workbench color theme."
          >
            <Select
              aria-label="Color theme"
              controlWidth="full"
              disabled={!onThemeChange}
              value={selectedThemeId}
              onValueChange={(nextTheme) => onThemeChange?.(nextTheme)}
            >
              {themeOptions.map((option) => (
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
          </Field>
        ) : null}
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
