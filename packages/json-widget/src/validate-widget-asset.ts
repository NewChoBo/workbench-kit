import { parseJsonWidgetData } from './jdw-node.js';
import { parseWidgetAssetPackage, type WidgetAssetPackageFiles } from './widget-asset-package.js';
import {
  validateJsonWidgetNode,
  type ValidateJsonWidgetDataOptions,
  type ValidationIssue,
} from './validate-json-widget-data.js';

/** Content root types allowed for `kind: "leaf"` assets (profile leaf widgets). */
export const WIDGET_ASSET_LEAF_CONTENT_TYPES = ['text', 'image', 'icon', 'button'] as const;

/** Content root types allowed for `kind: "container"` assets (profile layout roots). */
export const WIDGET_ASSET_CONTAINER_CONTENT_TYPES = [
  'row',
  'column',
  'grid',
  'stack',
  'box',
] as const;

export type WidgetAssetLeafContentType = (typeof WIDGET_ASSET_LEAF_CONTENT_TYPES)[number];
export type WidgetAssetContainerContentType = (typeof WIDGET_ASSET_CONTAINER_CONTENT_TYPES)[number];

const LEAF_CONTENT_TYPE_SET = new Set<string>(WIDGET_ASSET_LEAF_CONTENT_TYPES);
const CONTAINER_CONTENT_TYPE_SET = new Set<string>(WIDGET_ASSET_CONTAINER_CONTENT_TYPES);

export interface ValidatedWidgetAsset {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly parseError: string | null;
}

export function validateWidgetAssetPackage(
  packageFiles: WidgetAssetPackageFiles,
  options: ValidateJsonWidgetDataOptions = {},
): ValidatedWidgetAsset {
  const parsed = parseWidgetAssetPackage(packageFiles);
  if (parsed.parseError !== null || parsed.value === null) {
    return {
      valid: false,
      issues: [{ path: 'root', message: parsed.parseError ?? 'Invalid widget asset package.' }],
      parseError: parsed.parseError,
    };
  }

  const issues: ValidationIssue[] = [];
  const asset = parsed.value;
  const contentParsed = parseJsonWidgetData(packageFiles.contentSource);
  if (contentParsed.parseError !== null || contentParsed.value === null) {
    issues.push({
      path: 'content',
      message: contentParsed.parseError ?? 'Invalid content.json.',
    });
  } else {
    validateJsonWidgetNode(contentParsed.value, 'content', issues, {
      strictKnownTypes: true,
      ...options,
    });
  }

  if (
    asset.kind === 'container' &&
    contentParsed.value !== null &&
    !CONTAINER_CONTENT_TYPE_SET.has(contentParsed.value.type)
  ) {
    issues.push({
      path: 'kind',
      message: `Container assets should use a layout type (${WIDGET_ASSET_CONTAINER_CONTENT_TYPES.join(', ')}) in content.`,
    });
  }

  if (
    asset.kind === 'leaf' &&
    contentParsed.value !== null &&
    !LEAF_CONTENT_TYPE_SET.has(contentParsed.value.type)
  ) {
    issues.push({
      path: 'kind',
      message: `Leaf assets should use a leaf widget type (${WIDGET_ASSET_LEAF_CONTENT_TYPES.join(', ')}) in content.`,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    parseError: null,
  };
}
