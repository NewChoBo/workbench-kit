import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';

export interface WorkbenchThemeProviderProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  children: ReactNode;
  syncDocumentElement?: boolean | undefined;
  theme?: string | undefined;
}

export function WorkbenchThemeProvider({
  children,
  syncDocumentElement = false,
  theme,
  ...props
}: WorkbenchThemeProviderProps) {
  useEffect(() => {
    if (!syncDocumentElement || theme === undefined || typeof document === 'undefined') {
      return undefined;
    }

    const rootElement = document.documentElement;
    const previousTheme = rootElement.dataset.theme;
    rootElement.dataset.theme = theme;

    return () => {
      if (previousTheme === undefined) {
        delete rootElement.dataset.theme;
        return;
      }

      rootElement.dataset.theme = previousTheme;
    };
  }, [syncDocumentElement, theme]);

  return (
    <div {...props} data-theme={theme}>
      {children}
    </div>
  );
}
