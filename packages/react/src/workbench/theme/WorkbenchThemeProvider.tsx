import { useEffect, useMemo, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../chrome/workbench-host.css';
import '../chrome/workbench-platform-chrome.css';

import { WorkbenchPlatformProvider } from '../chrome/WorkbenchPlatformContext';
import {
  applyWorkbenchThemeProviderAttributes,
  type WorkbenchThemeProviderAttributes,
} from './themePresets';
import type { ResolvedWorkbenchTheme } from './theme';
import {
  resolveWorkbenchHostPlatform,
  type WorkbenchHostPlatform,
} from '../chrome/workbenchPlatformChrome';

export interface WorkbenchThemeProviderProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  children: ReactNode;
  platform?: WorkbenchHostPlatform | undefined;
  shellPreset?: string | undefined;
  syncDocumentElement?: boolean | undefined;
  theme?: string | undefined;
  themePreset?: string | undefined;
  themePreference?: string | undefined;
}

function toProviderAttributes({
  platform,
  shellPreset,
  theme,
  themePreset,
  themePreference,
}: Pick<
  WorkbenchThemeProviderProps,
  'platform' | 'shellPreset' | 'theme' | 'themePreset' | 'themePreference'
>): WorkbenchThemeProviderAttributes & { platform: WorkbenchHostPlatform } {
  const resolvedPlatform = resolveWorkbenchHostPlatform(platform ?? null);

  return {
    platform: resolvedPlatform,
    shellPreset,
    theme: (theme ?? 'dark') as ResolvedWorkbenchTheme,
    themePreference,
    themePreset: themePreset ?? undefined,
  };
}

export function WorkbenchThemeProvider({
  children,
  platform,
  shellPreset,
  syncDocumentElement = false,
  theme,
  themePreset,
  themePreference,
  ...props
}: WorkbenchThemeProviderProps) {
  const attributes = useMemo(
    () =>
      toProviderAttributes({
        platform,
        shellPreset,
        theme,
        themePreset,
        themePreference,
      }),
    [platform, shellPreset, theme, themePreset, themePreference],
  );

  useEffect(() => {
    if (!syncDocumentElement || theme === undefined || typeof document === 'undefined') {
      return undefined;
    }

    const rootElement = document.documentElement;
    const previousTheme = rootElement.dataset.theme;
    const previousThemePreset = rootElement.dataset.themePreset;
    const previousShellPreset = rootElement.dataset.shellPreset;
    const previousThemePreference = rootElement.dataset.themePreference;
    const previousPlatform = rootElement.dataset.workbenchPlatform;

    applyWorkbenchThemeProviderAttributes(rootElement, attributes);
    rootElement.dataset.workbenchPlatform = attributes.platform;

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

      if (previousShellPreset === undefined) {
        delete rootElement.dataset.shellPreset;
      } else {
        rootElement.dataset.shellPreset = previousShellPreset;
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
  }, [
    attributes.platform,
    attributes.shellPreset,
    attributes.theme,
    attributes.themePreference,
    attributes.themePreset,
    syncDocumentElement,
    theme,
  ]);

  return (
    <WorkbenchPlatformProvider platform={attributes.platform}>
      <div
        {...props}
        data-theme={theme}
        data-theme-preset={themePreset}
        data-shell-preset={shellPreset}
        data-theme-preference={themePreference}
        data-workbench-platform={attributes.platform}
      >
        {children}
      </div>
    </WorkbenchPlatformProvider>
  );
}
