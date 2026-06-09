import type { WidgetAssetCatalogContract } from '@workbench-kit/contracts';
import { createWidgetAssetCatalogFromWorkspaceFiles } from '@workbench-kit/json-widget';

import type { WorkspaceFile } from '../workbench/workspace/types.js';

export function resolveWidgetStudioAssetCatalog(
  files: readonly WorkspaceFile[],
): WidgetAssetCatalogContract {
  return createWidgetAssetCatalogFromWorkspaceFiles(
    files.map((file) => ({
      path: file.path,
      content: file.content,
    })),
  );
}
