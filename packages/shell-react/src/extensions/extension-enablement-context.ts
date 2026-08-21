import { createContext, useContext } from 'react';

import type { ExtensionEnablementController } from './extension-enablement-controller.js';

export const ExtensionEnablementContext = createContext<ExtensionEnablementController | undefined>(
  undefined,
);

export function useExtensionEnablementController(): ExtensionEnablementController {
  const controller = useContext(ExtensionEnablementContext);
  if (!controller) {
    throw new Error('Extension enablement must be used inside WorkbenchProvider.');
  }
  return controller;
}
