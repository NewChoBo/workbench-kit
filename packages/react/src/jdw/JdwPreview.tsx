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
  type JsonWidgetListenSchedule,
  type JsonWidgetListenSchedulerBatch,
  type JsonWidgetNode,
  type ValidationIssue,
  type WidgetPath,
} from '@workbench-kit/jdw';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout.js';
import { renderJdwWithLayout } from './cssRenderBackend.js';
import { useJdwListenScheduler } from './useJdwListenScheduler.js';

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
  invalidationSchedule?: JsonWidgetListenSchedule | undefined;
  onInvalidationBatch?: (batch: JsonWidgetListenSchedulerBatch) => void;
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
  return [...new Set([...first, ...second])];
}

interface JdwPreviewDocumentState {
  readonly issues: readonly ValidationIssue[];
  readonly node: JsonWidgetNode | null;
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
  invalidationSchedule,
  onInvalidationBatch,
  onSelectPath,
  documentPath = null,
  loadDocument,
}: JdwPreviewProps) {
  const previousValuesRef = useRef<JsonWidgetValueMap | undefined>(values);
  const onInvalidationBatchRef = useRef(onInvalidationBatch);
  const onSelectPathRef = useRef(onSelectPath);
  onInvalidationBatchRef.current = onInvalidationBatch;
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

  const documentState = useMemo<JdwPreviewDocumentState>(() => {
    const parsed = parseJsonWidgetData(json);
    if (parsed.parseError !== null || parsed.value === null) {
      return {
        issues: [
          {
            path: 'root',
            message: parsed.parseError ?? 'Invalid JSON widget data.',
          },
        ],
        node: null,
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
          issues: expanded.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
          node: null,
        };
      }
      drawableNode = expanded.value;
    }

    return { issues: [], node: drawableNode };
  }, [documentPath, json, loadDocument]);

  const scheduledBatch = useJdwListenScheduler({
    root: documentState.node,
    changedPaths: documentState.node ? activeChangedValuePaths : EMPTY_CHANGED_VALUE_PATHS,
    ...(invalidationSchedule ? { schedule: invalidationSchedule } : {}),
  });

  useEffect(() => {
    if (scheduledBatch) {
      onInvalidationBatchRef.current?.(scheduledBatch);
    }
  }, [scheduledBatch]);

  const previewState = useMemo<JdwPreviewState>(() => {
    if (documentState.node === null) {
      return {
        invalidations: [],
        issues: documentState.issues,
        renderOutput: null,
        valid: false,
      };
    }

    const resolvedNode = resolveJsonWidgetValues(documentState.node, values);
    const issues: ValidationIssue[] = [];
    validateJsonWidgetNode(resolvedNode, 'root', issues, {
      registeredTypes: registry?.types(),
      strictKnownTypes,
    });

    return {
      invalidations: collectJsonWidgetInvalidations(documentState.node, activeChangedValuePaths),
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
    documentState,
    emptyLabel,
    layoutConstraints,
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
