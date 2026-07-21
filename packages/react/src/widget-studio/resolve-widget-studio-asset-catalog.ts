import type { WidgetAssetCatalogContract } from '@workbench-kit/contracts';
import {
  createWidgetAssetCatalogFromJdwDocuments,
  createWidgetAssetCatalogFromWorkspaceFiles,
  mergeWidgetAssetCatalogs,
} from '@workbench-kit/jdw';

import type { WorkspaceFile } from '../workbench/workspace/types.js';
import { createBuiltinWidgetAssetCatalog } from './builtin-widget-asset-catalog.js';

export interface ResolveWidgetStudioAssetCatalogOptions {
  /** Paths to omit from the JDW-document catalog (usually the active editor file). */
  readonly excludeDocumentPaths?: readonly string[] | undefined;
}

/**
 * Resolves the widget studio / Form palette from:
 * 1. built-in assets
 * 2. workspace asset packages (`manifest.json` + `content.json`)
 * 3. workspace `*.jdw.json` documents (for example `jdw/parts/*`)
 *
 * Later catalogs override earlier entries when they share the same `id`.
 */
export function resolveWidgetStudioAssetCatalog(
  files: readonly WorkspaceFile[],
  options: ResolveWidgetStudioAssetCatalogOptions = {},
): WidgetAssetCatalogContract {
  const workspaceFiles = files.map((file) => ({
    path: file.path,
    content: file.content,
  }));

  const packageCatalog = createWidgetAssetCatalogFromWorkspaceFiles(workspaceFiles);
  const documentCatalog = createWidgetAssetCatalogFromJdwDocuments(workspaceFiles, {
    excludePaths: options.excludeDocumentPaths,
  });

  return mergeWidgetAssetCatalogs(
    createBuiltinWidgetAssetCatalog(),
    packageCatalog,
    documentCatalog,
  );
}
