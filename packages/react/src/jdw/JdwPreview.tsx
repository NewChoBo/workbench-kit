import { useEffect, useMemo, useRef } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  collectJsonWidgetChangedValuePaths,
  collectJsonWidgetInvalidations,
  parseJsonWidgetData,
  resolveJsonWidgetValues,
  validateJsonWidgetData,
  validateJsonWidgetNode,
  type LayoutConstraints,
  type JsonWidgetValueMap,
  type JsonWidgetInvalidation,
  type ValidationIssue,
  type WidgetPath,
} from '@workbench-kit/jdw';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout.js';
import { useRenderJdw } from './renderJdw.js';

const EMPTY_CHANGED_VALUE_PATHS: readonly string[] = [];

export interface JdwPreviewProps {
  json: string;
  registry?: WidgetRegistryContract<unknown> | undefined;
  emptyLabel?: string | undefined;
  className?: string | undefined;
  layoutConstraints?: LayoutConstraints | undefined;
  selectedPath?: WidgetPath | null | undefined;
  strictKnownTypes?: boolean | undefined;
  values?: JsonWidgetValueMap | undefined;
  changedValuePaths?: readonly string[] | undefined;
  onSelectPath?: ((path: WidgetPath) => void) | undefined;
}

function formatValidationMessage(issue: { readonly message: string; readonly path: string }) {
  return issue.path ? `${issue.path}: ${issue.message}` : issue.message;
}

export function getJdwPreviewInvalidations(
  json: string,
  changedValuePaths: readonly string[] = [],
): readonly JsonWidgetInvalidation[] {
  const parsed = parseJsonWidgetData(json);
  if (parsed.parseError !== null || parsed.value === null) {
    return [];
  }

  return collectJsonWidgetInvalidations(parsed.value, changedValuePaths);
}

function mergeChangedValuePaths(
  first: readonly string[],
  second: readonly string[],
): readonly string[] {
  return [
    ...new Set([...first, ...second].map((path) => path.trim()).filter((path) => path.length > 0)),
  ];
}

export function JdwPreview({
  json,
  registry,
  emptyLabel = 'No render output.',
  className,
  layoutConstraints,
  selectedPath = null,
  strictKnownTypes = true,
  values,
  changedValuePaths = EMPTY_CHANGED_VALUE_PATHS,
  onSelectPath,
}: JdwPreviewProps) {
  const previousValuesRef = useRef<JsonWidgetValueMap | undefined>(values);
  const changedValuePathsFromValues = useMemo(
    () => collectJsonWidgetChangedValuePaths(previousValuesRef.current, values),
    [values],
  );
  const activeChangedValuePaths = useMemo(
    () => mergeChangedValuePaths(changedValuePaths, changedValuePathsFromValues),
    [changedValuePaths, changedValuePathsFromValues],
  );

  useEffect(() => {
    previousValuesRef.current = values;
  }, [values]);

  const parsed = parseJsonWidgetData(json);
  const validation =
    parsed.parseError !== null || parsed.value === null
      ? validateJsonWidgetData(json, {
          registeredTypes: registry?.types(),
          strictKnownTypes,
        })
      : (() => {
          const issues: ValidationIssue[] = [];
          validateJsonWidgetNode(resolveJsonWidgetValues(parsed.value, values), 'root', issues, {
            registeredTypes: registry?.types(),
            strictKnownTypes,
          });
          return { issues, valid: issues.length === 0, value: parsed.value };
        })();
  const invalidations =
    parsed.value === null
      ? []
      : collectJsonWidgetInvalidations(parsed.value, activeChangedValuePaths);
  const renderOutput = useRenderJdw(json, {
    registry,
    emptyLabel,
    layoutConstraints,
    selectedPath,
    strictKnownTypes,
    values,
    onSelectPath,
  });

  if (!validation.valid) {
    const firstIssue = validation.issues[0];
    return (
      <WorkbenchParseError role="alert" data-testid="jdw-preview-error">
        {firstIssue ? formatValidationMessage(firstIssue) : 'Invalid JDW document.'}
      </WorkbenchParseError>
    );
  }

  return (
    <WorkbenchRenderSurface
      className={className}
      data-jdw-invalidations={invalidations.length > 0 ? invalidations.length : undefined}
      data-testid="jdw-preview-output"
    >
      {renderOutput ?? emptyLabel}
    </WorkbenchRenderSurface>
  );
}
