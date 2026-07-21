import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  collectJsonWidgetChangedValuePaths,
  collectJsonWidgetInvalidations,
  expandJsonWidgetDocumentRefs,
  parseJsonWidgetData,
  resolveJsonWidgetValues,
  validateJsonWidgetNode,
  type LayoutConstraints,
  type JsonWidgetValueMap,
  type JsonWidgetInvalidation,
  type ValidationIssue,
  type WidgetPath,
} from '@workbench-kit/jdw';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout.js';
import { renderJdwWithLayout } from './cssRenderBackend.js';

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
  /**
   * When set, expand `type: "ref"` before validate/layout so composed documents
   * draw without mutating the authored JSON shown in Code/Form outline.
   */
  documentPath?: string | null | undefined;
  loadDocument?: ((path: string) => string | null) | undefined;
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

interface JdwPreviewState {
  readonly invalidations: readonly JsonWidgetInvalidation[];
  readonly issues: readonly ValidationIssue[];
  readonly renderOutput: ReactNode;
  readonly valid: boolean;
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
  documentPath = null,
  loadDocument,
}: JdwPreviewProps) {
  const previousValuesRef = useRef<JsonWidgetValueMap | undefined>(values);
  const onSelectPathRef = useRef(onSelectPath);
  onSelectPathRef.current = onSelectPath;

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

  const previewState = useMemo<JdwPreviewState>(() => {
    const parsed = parseJsonWidgetData(json);
    if (parsed.parseError !== null || parsed.value === null) {
      return {
        invalidations: [],
        issues: [
          {
            path: 'root',
            message: parsed.parseError ?? 'Invalid JSON widget data.',
          },
        ],
        renderOutput: null,
        valid: false,
      };
    }

    let drawableNode = parsed.value;
    if (loadDocument) {
      const expanded = expandJsonWidgetDocumentRefs(parsed.value, {
        documentPath,
        loadDocument,
      });
      if (expanded.issues.length > 0 || expanded.value === null) {
        return {
          invalidations: [],
          issues: expanded.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
          renderOutput: null,
          valid: false,
        };
      }
      drawableNode = expanded.value;
    }

    const resolvedNode = resolveJsonWidgetValues(drawableNode, values);
    const issues: ValidationIssue[] = [];
    validateJsonWidgetNode(resolvedNode, 'root', issues, {
      registeredTypes: registry?.types(),
      strictKnownTypes,
    });

    return {
      invalidations: collectJsonWidgetInvalidations(drawableNode, activeChangedValuePaths),
      issues,
      renderOutput:
        issues.length === 0
          ? renderJdwWithLayout(resolvedNode, {
              registry,
              emptyLabel,
              layoutConstraints,
              selectedPath,
              onSelectPath: (path) => onSelectPathRef.current?.(path),
            })
          : null,
      valid: issues.length === 0,
    };
  }, [
    activeChangedValuePaths,
    documentPath,
    emptyLabel,
    json,
    layoutConstraints,
    loadDocument,
    registry,
    selectedPath,
    strictKnownTypes,
    values,
  ]);

  if (!previewState.valid) {
    const firstIssue = previewState.issues[0];
    return (
      <WorkbenchParseError role="alert" data-testid="jdw-preview-error">
        {firstIssue ? formatValidationMessage(firstIssue) : 'Invalid JDW document.'}
      </WorkbenchParseError>
    );
  }

  return (
    <WorkbenchRenderSurface
      className={className}
      data-jdw-invalidations={
        previewState.invalidations.length > 0 ? previewState.invalidations.length : undefined
      }
      data-testid="jdw-preview-output"
    >
      {previewState.renderOutput ?? emptyLabel}
    </WorkbenchRenderSurface>
  );
}
