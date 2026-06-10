import type { WorkspaceFile } from '@workbench-kit/workspace';

export const WIDGET_STUDIO_ASSETS_DIR = 'src/widgets/assets';
export const WIDGET_STUDIO_CUSTOM_ASSETS_DIR = 'src/widgets/assets/custom';

const MANIFEST_MIME = 'application/vnd.workbench-kit.widget-asset-manifest+json';
const CONTENT_MIME = 'application/vnd.workbench-kit.widget-asset-content+json';
const SCHEMA_MIME = 'application/vnd.workbench-kit.widget-asset-schema+json';

export interface WidgetStudioAssetPackageDefinition {
  readonly slug: string;
  readonly baseDir?: string | undefined;
  readonly updatedAt: string;
  readonly manifest: Record<string, unknown>;
  readonly content: Record<string, unknown>;
  readonly schema?: Record<string, unknown> | undefined;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createWidgetStudioAssetPackageFiles(
  definition: WidgetStudioAssetPackageDefinition,
): WorkspaceFile[] {
  const baseDir = definition.baseDir ?? WIDGET_STUDIO_ASSETS_DIR;
  const root = `${baseDir}/${definition.slug}`;
  const files: WorkspaceFile[] = [
    {
      path: `${root}/manifest.json`,
      mimeType: MANIFEST_MIME,
      updatedAt: definition.updatedAt,
      source: 'user',
      content: json({
        $schema: 'https://workbench-kit.dev/schemas/widget-asset-manifest.v1.json',
        ...definition.manifest,
      }),
    },
    {
      path: `${root}/content.json`,
      mimeType: CONTENT_MIME,
      updatedAt: definition.updatedAt,
      source: 'user',
      content: json(definition.content),
    },
  ];

  if (definition.schema) {
    files.push({
      path: `${root}/schema.json`,
      mimeType: SCHEMA_MIME,
      updatedAt: definition.updatedAt,
      source: 'user',
      content: json(definition.schema),
    });
  }

  return files;
}

export function flattenWidgetStudioAssetPackages(
  packages: readonly WidgetStudioAssetPackageDefinition[],
): WorkspaceFile[] {
  return packages.flatMap((definition) => createWidgetStudioAssetPackageFiles(definition));
}
