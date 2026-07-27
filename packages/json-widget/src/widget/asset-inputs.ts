import type { WidgetPlacementAsset } from '@workbench-kit/contracts';

import { isObjectRecord } from '../is-object-record.js';
import {
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  resolveJsonWidgetValues,
  type JsonWidgetValueMap,
} from '../jdw/node.js';
import type { ValidationIssue } from '../validate/json-widget-data.js';
import type { GenericWidget } from './tree.js';

function readSchemaDefaults(schema: Record<string, unknown> | undefined): JsonWidgetValueMap {
  if (!schema || !isObjectRecord(schema.properties)) {
    return {};
  }

  const defaults: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!isObjectRecord(property) || property.default === undefined) {
      continue;
    }
    defaults[key] = property.default;
  }
  return defaults;
}

function readRequiredKeys(schema: Record<string, unknown> | undefined): readonly string[] {
  if (!schema || !Array.isArray(schema.required)) {
    return [];
  }
  return schema.required.filter((key): key is string => typeof key === 'string' && key.length > 0);
}

function validateInputType(
  key: string,
  value: unknown,
  property: Record<string, unknown>,
  issues: ValidationIssue[],
): void {
  const expected = property.type;
  if (typeof expected !== 'string') {
    return;
  }

  if (value === undefined) {
    return;
  }

  if (expected === 'string' && typeof value !== 'string') {
    issues.push({ path: `inputs.${key}`, message: `"${key}" must be a string.` });
    return;
  }
  if (expected === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
    issues.push({ path: `inputs.${key}`, message: `"${key}" must be a finite number.` });
    return;
  }
  if (expected === 'boolean' && typeof value !== 'boolean') {
    issues.push({ path: `inputs.${key}`, message: `"${key}" must be a boolean.` });
    return;
  }
  if (expected === 'object' && !isObjectRecord(value)) {
    issues.push({ path: `inputs.${key}`, message: `"${key}" must be an object.` });
    return;
  }
  if (expected === 'array' && !Array.isArray(value)) {
    issues.push({ path: `inputs.${key}`, message: `"${key}" must be an array.` });
  }
}

/**
 * Merges schema defaults with caller inputs and checks required / basic property types.
 * Full AJV validation is intentionally out of scope for JD-2.
 */
export function mergeWidgetAssetInputs(
  asset: WidgetPlacementAsset,
  inputs: JsonWidgetValueMap = {},
): {
  readonly inputs: JsonWidgetValueMap;
  readonly issues: readonly ValidationIssue[];
  readonly valid: boolean;
} {
  const schema = asset.inputsSchema;
  const merged: Record<string, unknown> = {
    ...readSchemaDefaults(schema),
    ...inputs,
  };
  const issues: ValidationIssue[] = [];

  for (const key of readRequiredKeys(schema)) {
    const value = merged[key];
    if (value === undefined || value === null || value === '') {
      issues.push({
        path: `inputs.${key}`,
        message: `"${key}" is required by the asset schema.`,
      });
    }
  }

  if (schema && isObjectRecord(schema.properties)) {
    for (const [key, property] of Object.entries(schema.properties)) {
      if (!isObjectRecord(property)) continue;
      validateInputType(key, merged[key], property, issues);
    }
  }

  return {
    inputs: merged,
    issues,
    valid: issues.length === 0,
  };
}

export interface ResolvedWidgetAssetContent {
  readonly widget: GenericWidget | null;
  readonly inputs: JsonWidgetValueMap;
  readonly issues: readonly ValidationIssue[];
  readonly valid: boolean;
}

/**
 * Applies asset `schema.json` defaults/required checks and resolves `${path}` expressions
 * in `content.json` into a drawable GenericWidget.
 */
export function resolveWidgetAssetContent(
  asset: WidgetPlacementAsset,
  inputs: JsonWidgetValueMap = {},
): ResolvedWidgetAssetContent {
  const merged = mergeWidgetAssetInputs(asset, inputs);
  if (!merged.valid) {
    return {
      widget: null,
      inputs: merged.inputs,
      issues: merged.issues,
      valid: false,
    };
  }

  const contentNode = genericWidgetToJdwNode(asset.content as GenericWidget);
  const resolvedNode = resolveJsonWidgetValues(contentNode, merged.inputs);

  return {
    widget: jdwNodeToGenericWidget(resolvedNode),
    inputs: merged.inputs,
    issues: [],
    valid: true,
  };
}
