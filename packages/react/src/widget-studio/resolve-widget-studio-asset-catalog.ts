import type { WidgetAssetCatalogContract } from '@workbench-kit/contracts';
import {
  createWidgetAssetCatalogFromWorkspaceFiles,
  mergeWidgetAssetCatalogs,
} from '@workbench-kit/jdw';

import type { WorkspaceFile } from '../workbench/workspace/types.js';
import { createBuiltinWidgetAssetCatalog } from './builtin-widget-asset-catalog.js';

/**
 * Resolves the widget studio palette from built-in assets plus workspace asset packages
 * (`<slug>/manifest.json` + `content.json`). Workspace assets override built-ins when they
 * share the same `name`.
 */
export function resolveWidgetStudioAssetCatalog(
  files: readonly WorkspaceFile[],
): WidgetAssetCatalogContract {
  const workspaceCatalog = createWidgetAssetCatalogFromWorkspaceFiles(
    files.map((file) => ({
      path: file.path,
      content: file.content,
    })),
  );

  return mergeWidgetAssetCatalogs(createBuiltinWidgetAssetCatalog(), workspaceCatalog);
}
