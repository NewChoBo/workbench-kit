import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { WorkbenchPlatformProvider } from './WorkbenchPlatformContext';
import {
  resolveWorkbenchHostPlatform,
  type WorkbenchHostPlatform,
} from './workbenchPlatformChrome';

export interface WorkbenchThemeProviderProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  children: ReactNode;
  platform?: WorkbenchHostPlatform | undefined;
  syncDocumentElement?: boolean | undefined;
  theme?: string | undefined;
  themePreset?: string | undefined;
  themePreference?: string | undefined;
}

export function WorkbenchThemeProvider({
  children,
  platform,
  syncDocumentElement = false,
  theme,
  themePreset,
  themePreference,
  ...props
}: WorkbenchThemeProviderProps) {
  const resolvedPlatform = resolveWorkbenchHostPlatform(platform ?? null);

  useEffect(() => {
    if (!syncDocumentElement || theme === undefined || typeof document === 'undefined') {
      return undefined;
    }

    const rootElement = document.documentElement;
    const previousTheme = rootElement.dataset.theme;
    const previousThemePreset = rootElement.dataset.themePreset;
    const previousThemePreference = rootElement.dataset.themePreference;
    const previousPlatform = rootElement.dataset.workbenchPlatform;

    rootElement.dataset.theme = theme;

    if (themePreset === undefined) {
      delete rootElement.dataset.themePreset;
    } else {
      rootElement.dataset.themePreset = themePreset;
    }

    if (themePreference === undefined) {
      delete rootElement.dataset.themePreference;
    } else {
      rootElement.dataset.themePreference = themePreference;
    }

    rootElement.dataset.workbenchPlatform = resolvedPlatform;

    return () => {
      if (previousTheme === undefined) {
        delete rootElement.dataset.theme;
      } else {
        rootElement.dataset.theme = previousTheme;
      }

      if (previousThemePreset === undefined) {
        delete rootElement.dataset.themePreset;
      } else {
        rootElement.dataset.themePreset = previousThemePreset;
      }

      if (previousThemePreference === undefined) {
        delete rootElement.dataset.themePreference;
      } else {
        rootElement.dataset.themePreference = previousThemePreference;
      }

      if (previousPlatform === undefined) {
        delete rootElement.dataset.workbenchPlatform;
      } else {
        rootElement.dataset.workbenchPlatform = previousPlatform;
      }
    };
  }, [resolvedPlatform, syncDocumentElement, theme, themePreset, themePreference]);

  return (
    <WorkbenchPlatformProvider platform={resolvedPlatform}>
      <div
        {...props}
        data-theme={theme}
        data-theme-preset={themePreset}
        data-theme-preference={themePreference}
        data-workbench-platform={resolvedPlatform}
      >
        {children}
      </div>
    </WorkbenchPlatformProvider>
  );
}
