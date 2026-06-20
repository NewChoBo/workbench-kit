import { ExtensionManagementSidebar } from '@workbench-kit/react/workbench/management';

import {
  BUILTIN_EXTENSIONS_VIEW_RENDER_KIND,
  isBuiltinExtensionsViewRenderData,
  type BuiltinExtensionsViewRenderData,
} from './extensions-view-data.js';
import { useExtensionManagementModel } from './use-extension-management.js';

export type { BuiltinExtensionsViewRenderData };
export { BUILTIN_EXTENSIONS_VIEW_RENDER_KIND, isBuiltinExtensionsViewRenderData };

export function BuiltinExtensionsView({ catalogUrl }: { catalogUrl?: string | undefined }) {
  const {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    toggleInstalledEntry,
  } = useExtensionManagementModel({ catalogUrl });

  return (
    <ExtensionManagementSidebar
      browseEntries={browseEntries}
      catalogError={catalogError}
      catalogLoading={catalogLoading}
      installedEntries={installedEntries}
      onInstall={installCatalogEntry}
      onToggleEnabled={toggleInstalledEntry}
    />
  );
}
