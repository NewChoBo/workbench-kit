import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';

export interface WorkbenchThemeProviderProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  children: ReactNode;
  syncDocumentElement?: boolean | undefined;
  theme?: string | undefined;
  themePreset?: string | undefined;
  themePreference?: string | undefined;
}

export function WorkbenchThemeProvider({
  children,
  syncDocumentElement = false,
  theme,
  themePreset,
  themePreference,
  ...props
}: WorkbenchThemeProviderProps) {
  useEffect(() => {
    if (!syncDocumentElement || theme === undefined || typeof document === 'undefined') {
      return undefined;
    }

    const rootElement = document.documentElement;
    const previousTheme = rootElement.dataset.theme;
    const previousThemePreset = rootElement.dataset.themePreset;
    const previousThemePreference = rootElement.dataset.themePreference;

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
    };
  }, [syncDocumentElement, theme, themePreset, themePreference]);

  return (
    <div
      {...props}
      data-theme={theme}
      data-theme-preset={themePreset}
      data-theme-preference={themePreference}
    >
      {children}
    </div>
  );
}
