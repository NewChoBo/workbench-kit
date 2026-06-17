import { parseJsonWidgetData } from './jdw-node.js';
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
    contentParsed.value.type !== 'row' &&
    contentParsed.value.type !== 'column' &&
    contentParsed.value.type !== 'grid'
  ) {
    issues.push({
      path: 'kind',
      message: 'Container assets should use a layout type (row, column, or grid) in content.',
    });
  }

  if (
    asset.kind === 'leaf' &&
    contentParsed.value !== null &&
    contentParsed.value.type !== 'text'
  ) {
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
