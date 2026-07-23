import { useLayoutEffect } from 'react';

import { applyWorkbenchAppearance, type WorkbenchAppearanceSettings } from '../theme/themePresets';

/**
 * Keeps `document.documentElement` theme attributes aligned with appearance settings.
 * Use with host-owned settings state (e.g. settings store) for runtime theme changes.
 */
export function useWorkbenchAppearanceDocumentSync(settings: WorkbenchAppearanceSettings): void {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    applyWorkbenchAppearance(document.documentElement, settings);
  }, [settings.darkPreset, settings.lightPreset, settings.shellPreset, settings.themePreference]);
}
