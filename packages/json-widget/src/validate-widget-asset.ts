import { genericWidgetToJdwNode } from './jdw-node.js';
import type { GenericWidget } from './widget-tree.js';
import { parseWidgetAssetPackage, type WidgetAssetPackageFiles } from './widget-asset-package.js';
import {
  validateJsonWidgetNode,
  type ValidateJsonWidgetDataOptions,
  type ValidationIssue,
} from './validate-json-widget-data.js';

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
  const contentNode = genericWidgetToJdwNode(asset.defaultWidget as GenericWidget);
  validateJsonWidgetNode(contentNode, 'content', issues, {
    strictKnownTypes: true,
    ...options,
  });

  if (
    asset.kind === 'container' &&
    contentNode.type !== 'row' &&
    contentNode.type !== 'column' &&
    contentNode.type !== 'grid'
  ) {
    issues.push({
      path: 'kind',
      message: 'Container assets should use a layout type (row, column, or grid) in content.',
    });
  }

  if (asset.kind === 'leaf' && contentNode.type !== 'text') {
    issues.push({
      path: 'kind',
      message: 'Leaf assets should use a leaf widget type (text) in content.',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    parseError: null,
  };
}
