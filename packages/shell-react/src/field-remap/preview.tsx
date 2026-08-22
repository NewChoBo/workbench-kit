import { useMemo, type JSX } from 'react';
import type { ConvertToShapeResult, MappingEdge } from '@workbench-kit/field-remap';

import { defaultFieldRemapChromeLabels, type FieldRemapChromeLabels } from './chrome-labels.js';
import type { FieldRemapSelection } from './flow-ops.js';

export type FieldRemapPreviewState =
  | {
      readonly status: 'unavailable';
      readonly reason: 'hidden' | 'no-sample';
    }
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly result: ConvertToShapeResult;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type FieldRemapPreviewProjection =
  | FieldRemapPreviewState
  | {
      readonly status: 'unsupported';
      readonly reason: 'draft' | 'stale-selection';
    }
  | {
      readonly status: 'value';
      readonly scope: 'binding' | 'document';
      readonly value: unknown;
      readonly notice?: 'operator-intermediate' | 'transform-step-intermediate';
    };

export function resolveFieldRemapPreviewProjection(
  preview: FieldRemapPreviewState,
  selection: FieldRemapSelection,
  edges: readonly MappingEdge[],
  operatorExists: boolean,
): FieldRemapPreviewProjection {
  if (preview.status !== 'ready') {
    return preview;
  }
  if (!selection) {
    return { status: 'value', scope: 'document', value: preview.result.output };
  }
  if (selection.kind === 'draft') {
    return { status: 'unsupported', reason: 'draft' };
  }
  if (selection.kind === 'operator') {
    return operatorExists
      ? {
          status: 'value',
          scope: 'document',
          value: preview.result.output,
          notice: 'operator-intermediate',
        }
      : { status: 'unsupported', reason: 'stale-selection' };
  }

  const edge = edges.find((item) => item.id === selection.edgeId);
  if (!edge) {
    return { status: 'unsupported', reason: 'stale-selection' };
  }
  if (
    selection.kind === 'transformStep' &&
    (selection.stepIndex < 0 || selection.stepIndex >= (edge.transformIds?.length ?? 0))
  ) {
    return { status: 'unsupported', reason: 'stale-selection' };
  }

  const slot = preview.result.slots.find((item) => item.edgeId === edge.id);
  if (!slot) {
    return { status: 'unsupported', reason: 'stale-selection' };
  }
  return {
    status: 'value',
    scope: 'binding',
    value: slot.value,
    ...(selection.kind === 'transformStep'
      ? { notice: 'transform-step-intermediate' as const }
      : {}),
  };
}

function previewLabel(labels: FieldRemapChromeLabels, key: keyof FieldRemapChromeLabels): string {
  return labels[key] ?? defaultFieldRemapChromeLabels[key];
}

function formatPreviewValue(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export interface FieldRemapPreviewRailProps {
  readonly preview: FieldRemapPreviewState;
  readonly selection: FieldRemapSelection;
  readonly edges: readonly MappingEdge[];
  readonly operatorExists: boolean;
  readonly labels: FieldRemapChromeLabels;
}

export function FieldRemapPreviewRail({
  preview,
  selection,
  edges,
  operatorExists,
  labels,
}: FieldRemapPreviewRailProps): JSX.Element {
  const projection = useMemo(
    () => resolveFieldRemapPreviewProjection(preview, selection, edges, operatorExists),
    [edges, operatorExists, preview, selection],
  );

  return (
    <aside
      className="workbench-field-remap-preview"
      data-testid="field-remap-preview"
      aria-label={previewLabel(labels, 'previewTitle')}
    >
      <h4>{previewLabel(labels, 'previewTitle')}</h4>
      {projection.status === 'loading' ? (
        <p role="status" data-testid="field-remap-preview-loading">
          {previewLabel(labels, 'previewLoading')}
        </p>
      ) : null}
      {projection.status === 'error' ? (
        <p role="alert" data-testid="field-remap-preview-error">
          {previewLabel(labels, 'previewError')}: {projection.message}
        </p>
      ) : null}
      {projection.status === 'unsupported' ? (
        <p role="status" data-testid="field-remap-preview-unavailable">
          {previewLabel(
            labels,
            projection.reason === 'draft'
              ? 'previewDraftUnavailable'
              : 'previewSelectionUnavailable',
          )}
        </p>
      ) : null}
      {projection.status === 'value' ? (
        <>
          <p className="workbench-field-remap-preview__scope">
            {previewLabel(
              labels,
              projection.scope === 'binding' ? 'previewBindingResult' : 'previewDocumentResult',
            )}
          </p>
          {projection.notice ? (
            <p
              className="workbench-field-remap-preview__notice"
              data-testid="field-remap-preview-notice"
            >
              {previewLabel(
                labels,
                projection.notice === 'transform-step-intermediate'
                  ? 'previewStepIntermediateUnavailable'
                  : 'previewOperatorIntermediateUnavailable',
              )}
            </p>
          ) : null}
          <pre data-testid="field-remap-preview-value">{formatPreviewValue(projection.value)}</pre>
        </>
      ) : null}
    </aside>
  );
}
