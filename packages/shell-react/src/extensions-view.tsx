import { ExtensionManagementSidebar } from '@workbench-kit/react/workbench/management';

import {
  BUILTIN_EXTENSIONS_VIEW_RENDER_KIND,
  isBuiltinExtensionsViewRenderData,
  type BuiltinExtensionsViewRenderData,
} from './extensions-view-data.js';
import { useExtensionManagementModel } from './use-extension-management.js';
import { useWorkbench } from './provider.js';

export type { BuiltinExtensionsViewRenderData };
export { BUILTIN_EXTENSIONS_VIEW_RENDER_KIND, isBuiltinExtensionsViewRenderData };

export function BuiltinExtensionsView({ catalogUrl }: { catalogUrl?: string | undefined }) {
  const { missingExtensionIds } = useWorkbench();
  const {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    pendingAction,
    toggleInstalledEntry,
  } = useExtensionManagementModel({ catalogUrl });

  return (
    <ExtensionManagementSidebar
      browseEntries={browseEntries}
      catalogError={catalogError}
      catalogLoading={catalogLoading}
      installedEntries={installedEntries}
      missingExtensionIds={missingExtensionIds}
      pendingAction={pendingAction}
      onInstall={installCatalogEntry}
      onToggleEnabled={toggleInstalledEntry}
    />
  );
}
