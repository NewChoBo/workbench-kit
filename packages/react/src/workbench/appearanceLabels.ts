/**
 * Appearance settings copy aligned with VS Code Settings › Appearance terminology.
 *
 * VS Code maps:
 * - color scheme preference → `window.autoDetectColorScheme` + forced light/dark
 * - light/dark color presets → `workbench.preferredLightColorTheme` / `workbench.preferredDarkColorTheme`
 * - workbench layout preset → no first-class VS Code preset (scattered workbench/editor settings);
 *   workbench-kit groups metric tokens under `data-shell-preset` / `shellPreset`.
 *
 * Code identifiers (`themePreset`, `shellPreset`) stay stable; use these labels in UI only.
 */
export const WORKBENCH_APPEARANCE_FIELD_LABELS = {
  colorScheme: 'Color scheme',
  preferredLightColorTheme: 'Preferred Light Color Theme',
  preferredDarkColorTheme: 'Preferred Dark Color Theme',
  workbenchLayout: 'Workbench Layout',
} as const;

export const WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS = {
  colorScheme:
    'Match VS Code auto-detect: System follows the OS color scheme; Light and Dark force a mode.',
  preferredLightColorTheme:
    'Workbench color theme when resolved to light mode (VS Code: workbench.preferredLightColorTheme).',
  preferredDarkColorTheme:
    'Workbench color theme when resolved to dark mode (VS Code: workbench.preferredDarkColorTheme).',
  workbenchLayout:
    'Header height, control radius, spacing, and status bar density. Orthogonal to Color Theme; combine freely.',
} as const;
