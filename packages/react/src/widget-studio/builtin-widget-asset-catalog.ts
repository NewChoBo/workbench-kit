import { widgetStudioBuiltinAssetFiles } from '@workbench-kit/adapters';
import type { WidgetAssetCatalogContract } from '@workbench-kit/contracts';
import { createWidgetAssetCatalogFromWorkspaceFiles } from '@workbench-kit/jdw';
/** Built-in palette assets shipped with the workbench demo and widget studio. */
export function createBuiltinWidgetAssetCatalog(): WidgetAssetCatalogContract {
  return createWidgetAssetCatalogFromWorkspaceFiles(
    widgetStudioBuiltinAssetFiles.map((file) => ({
      path: file.path,
      content: file.content,
    })),
  );
}
