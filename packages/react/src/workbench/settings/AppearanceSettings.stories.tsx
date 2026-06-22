import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Field } from '../../primitives/Field';
import { Select } from '../../primitives/Select';
import {
  applyWorkbenchAppearance,
  DARK_THEME_PRESET_OPTIONS,
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  LIGHT_THEME_PRESET_OPTIONS,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
  type DarkThemePresetId,
  type LightThemePresetId,
  type WorkbenchAppearanceSettings,
  type WorkbenchColorSchemePreference,
} from '../themePresets';
import { WorkbenchSettingsSection } from './WorkbenchSettingsSection';

const meta = {
  title: 'React/Workbench/Settings/Appearance',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical Appearance settings surface for color scheme (System/Light/Dark) and light/dark theme presets. Host apps and samples should mirror this layout.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function WorkbenchAppearanceSettingsFields({
  appearance,
  onAppearanceChange,
}: {
  appearance: WorkbenchAppearanceSettings;
  onAppearanceChange: (nextAppearance: WorkbenchAppearanceSettings) => void;
}) {
  const updateAppearance = <TKey extends keyof WorkbenchAppearanceSettings>(
    key: TKey,
    value: WorkbenchAppearanceSettings[TKey],
  ) => {
    onAppearanceChange({ ...appearance, [key]: value });
  };

  return (
    <WorkbenchSettingsSection
      id="workbench-settings-appearance"
      title="Appearance"
      description="Configure how the workbench is presented."
    >
      <div className="workbench-appearance-settings">
        <Field
          className="workbench-appearance-settings__field"
          label="Color scheme"
          description="Follow the OS setting or force Light/Dark mode."
          htmlFor="appearance-color-scheme"
        >
          <Select
            id="appearance-color-scheme"
            aria-label="Color scheme"
            controlWidth="full"
            value={appearance.themePreference}
            onChange={(event) =>
              updateAppearance(
                'themePreference',
                event.currentTarget.value as WorkbenchColorSchemePreference,
              )
            }
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
          label="Light theme preset"
          description="Applied when the resolved color scheme is Light."
          htmlFor="appearance-light-preset"
        >
          <Select
            id="appearance-light-preset"
            aria-label="Light theme preset"
            controlWidth="full"
            value={appearance.lightPreset}
            onChange={(event) =>
              updateAppearance('lightPreset', event.currentTarget.value as LightThemePresetId)
            }
          >
            {LIGHT_THEME_PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          className="workbench-appearance-settings__field"
          label="Dark theme preset"
          description="Applied when the resolved color scheme is Dark."
          htmlFor="appearance-dark-preset"
        >
          <Select
            id="appearance-dark-preset"
            aria-label="Dark theme preset"
            controlWidth="full"
            value={appearance.darkPreset}
            onChange={(event) =>
              updateAppearance('darkPreset', event.currentTarget.value as DarkThemePresetId)
            }
          >
            {DARK_THEME_PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </WorkbenchSettingsSection>
  );
}

function AppearanceSettingsHarness() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [appearance, setAppearance] = useState<WorkbenchAppearanceSettings>({
    darkPreset: DEFAULT_DARK_THEME_PRESET,
    lightPreset: DEFAULT_LIGHT_THEME_PRESET,
    themePreference: 'system',
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    applyWorkbenchAppearance(root, appearance);
  }, [appearance]);

  return (
    <div
      ref={rootRef}
      className="workbench-story-shell"
      style={{
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        minHeight: 640,
        padding: 24,
      }}
    >
      <div
        aria-label="Appearance state"
        role="status"
        style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}
      >
        scheme={appearance.themePreference}; light={appearance.lightPreset}; dark=
        {appearance.darkPreset}
      </div>
      <div style={{ maxWidth: 560 }}>
        <WorkbenchAppearanceSettingsFields
          appearance={appearance}
          onAppearanceChange={setAppearance}
        />
      </div>
    </div>
  );
}

async function selectOption(
  canvas: ReturnType<typeof within>,
  comboboxName: string,
  optionName: string,
) {
  await userEvent.click(canvas.getByRole('combobox', { name: comboboxName }));
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByRole('option', { name: optionName }));
}

export const SchemeAndPresets: Story = {
  name: 'Appearance / Scheme & Presets',
  render: () => <AppearanceSettingsHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvasElement.querySelector('.workbench-story-shell');

    await expect(canvas.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(canvas.getByLabelText('Appearance state')).toHaveTextContent('scheme=system');

    await selectOption(canvas, 'Color scheme', 'Light');
    await expect(root).toHaveAttribute('data-theme', 'light');
    await expect(root).toHaveAttribute('data-theme-preference', 'light');
    await expect(root).toHaveAttribute('data-theme-preset', 'skyblue');

    await selectOption(canvas, 'Light theme preset', 'Light+');
    await expect(root).toHaveAttribute('data-theme-preset', 'light-plus');

    await selectOption(canvas, 'Light theme preset', 'Light Orange');
    await expect(root).toHaveAttribute('data-theme-preset', 'orange');

    await selectOption(canvas, 'Color scheme', 'Dark');
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect(root).toHaveAttribute('data-theme-preference', 'dark');
    await expect(root).toHaveAttribute('data-theme-preset', 'purple');

    await selectOption(canvas, 'Dark theme preset', 'Dark+');
    await expect(root).toHaveAttribute('data-theme-preset', 'dark-plus');

    await selectOption(canvas, 'Dark theme preset', 'Modern Dark');
    await expect(root).toHaveAttribute('data-theme-preset', 'modern');

    await selectOption(canvas, 'Color scheme', 'System');
    await expect(root).toHaveAttribute('data-theme-preference', 'system');
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
