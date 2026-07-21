import { useEffect, useState } from 'react';

import { monaco } from './monaco-loader.js';
import {
  defineMonacoWorkbenchTheme,
  getWorkbenchThemeAppearanceSignature,
  monacoThemeForWorkspaceTheme,
  type MonacoWorkbenchResolvedTheme,
} from './monacoWorkbenchTheme.js';

function useWorkbenchThemeAppearanceSignature(): string {
  const [signature, setSignature] = useState(() => getWorkbenchThemeAppearanceSignature());

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const updateSignature = () => {
      setSignature(getWorkbenchThemeAppearanceSignature(root));
    };

    updateSignature();

    const observer = new MutationObserver(updateSignature);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-theme-preset'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return signature;
}

export function useMonacoWorkbenchThemeSync(resolvedTheme: MonacoWorkbenchResolvedTheme) {
  const appearanceSignature = useWorkbenchThemeAppearanceSignature();

  useEffect(() => {
    defineMonacoWorkbenchTheme(monaco, resolvedTheme);
    monaco.editor.setTheme(monacoThemeForWorkspaceTheme(resolvedTheme));
  }, [appearanceSignature, resolvedTheme]);
}
