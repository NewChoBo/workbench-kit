import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type Ref,
} from 'react';
import {
  createBuiltinValueTransformRegistry,
  createFieldRemapDocument,
  deserializeFieldRemapImport,
  FieldRemapImportAdmissionError,
  findParentChildMappingConflicts,
  projectSourceFields,
  projectTargetSlots,
  pruneMappingEdgesForShapes,
  serializeFieldRemapDocument,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  UnsupportedFieldRemapDocumentVersionError,
  type FieldRemapDocument,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { FieldRemapFlowMapper, type FieldRemapFlowMapperProps } from './flow.js';
import {
  FieldRemapIoClassBrowse,
  resolveFieldRemapIoChrome,
  type FieldRemapIoChrome,
} from './io-class-browse.js';
import {
  getFieldRemapSample,
  type FieldRemapSampleDefinition,
  type FieldRemapSampleId,
} from './samples.js';
import { jsonataValueTransform } from './jsonata-transform.js';
import {
  areFieldRemapHistorySnapshotsEqual,
  createFieldRemapHistorySnapshot,
  createFieldRemapHistoryState,
  recordFieldRemapHistory,
  redoFieldRemapHistory,
  undoFieldRemapHistory,
  type FieldRemapHistorySnapshot,
} from './history.js';
import {
  FieldRemapShapeIoEditor,
  ingestSourceShape,
  ingestTargetShape,
} from './shape-io-editor.js';
import { createFieldRemapPreviewController } from './preview-controller.js';
import type { FieldRemapPreviewState } from './preview.js';
import { isFieldRemapEditableShortcutTarget } from './keyboard.js';
import { FieldRemapDocumentIo, type FieldRemapDocumentImportActionResult } from './document-io.js';
import './view.css';

export type { FieldRemapHistorySnapshot } from './history.js';

export interface FieldRemapHistoryOwner {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly record: (current: FieldRemapHistorySnapshot, next: FieldRemapHistorySnapshot) => void;
  readonly reset: (next: FieldRemapHistorySnapshot) => void;
  readonly undo: () => FieldRemapHistorySnapshot | undefined;
  readonly redo: () => FieldRemapHistorySnapshot | undefined;
}

export interface FieldRemapHistoryActions {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
}

export interface FieldRemapHistoryAvailability {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface FieldRemapPanelProps {
  /** Catalog sample id, or a full sample definition. Defaults to `nested-ab` labels/ids. */
  readonly sample?: FieldRemapSampleId | FieldRemapSampleDefinition | undefined;
  /** Optional host-owned transform registry (defaults to builtins + JSONata). */
  readonly transforms?: ValueTransformRegistry | undefined;
  /** View-only authoring guard forwarded to Flow; this is not an authorization boundary. */
  readonly readOnly?: boolean | undefined;
  /**
   * When true (default), show paste-JSON / type editors for host-owned shapes.
   * Prefer {@link FieldRemapPanelProps.ioChrome} for browse-first hosts; when
   * `ioChrome` is omitted, `true` → `edit` and `false` → `none`.
   */
  readonly editableShapes?: boolean | undefined;
  /**
   * I/O chrome mode. `browse` = read-only class/field tree; `edit` = shape IO editor;
   * `none` = hide I/O chrome. Defaults from `editableShapes` when omitted.
   */
  readonly ioChrome?: FieldRemapIoChrome | undefined;
  /**
   * When `false` (default), Flow columns omit `hidden` fields/slots.
   * Browse chrome respects the same flag (show Hidden badges when true).
   */
  readonly includeHidden?: boolean | undefined;
  readonly onIncludeHiddenChange?: ((next: boolean) => void) | undefined;
  readonly className?: string | undefined;
  /**
   * Controlled mapping edges. When provided, the host is the source of truth;
   * pair with `onEdgesChange` for connect/disconnect/transform edits.
   */
  readonly edges?: readonly MappingEdge[] | undefined;
  readonly onEdgesChange?: ((edges: readonly MappingEdge[]) => void) | undefined;
  /** Optional controlled n→m operators (document v2). */
  readonly operators?: readonly MappingOperator[] | undefined;
  readonly onOperatorsChange?: ((operators: readonly MappingOperator[]) => void) | undefined;
  /**
   * Atomic whole-document replacement proposal for controlled or mixed-control imports.
   * Incremental edge/operator callbacks remain unchanged.
   */
  readonly onDocumentReplace?: ((document: FieldRemapDocument) => void) | undefined;
  /**
   * Composite history owner for controlled or mixed-control mapping state. When either durable
   * channel is controlled, the Panel never creates a partial private history.
   */
  readonly historyOwner?: FieldRemapHistoryOwner | undefined;
  /** Imperative semantic undo/redo actions for host chrome. */
  readonly historyActionsRef?: Ref<FieldRemapHistoryActions | null> | undefined;
  /** Reports the active history owner's current undo/redo availability. */
  readonly onHistoryAvailabilityChange?:
    ((availability: FieldRemapHistoryAvailability) => void) | undefined;
  /** Controlled source field tree (host-owned shapes). */
  readonly sources?: readonly SourceField[] | undefined;
  readonly onSourcesChange?: ((fields: readonly SourceField[]) => void) | undefined;
  /** Controlled target slot tree (host-owned shapes). */
  readonly targets?: readonly TargetSlot[] | undefined;
  readonly onTargetsChange?: ((slots: readonly TargetSlot[]) => void) | undefined;
  /** Preview input bag for the primary source shape. */
  readonly sourceSample?: unknown;
  /** Optional target shape sample JSON (shape editor seed; preview uses edges). */
  readonly targetShape?: unknown;
  /** Forwarded to {@link FieldRemapFlowMapper} (default true). */
  readonly showMinimap?: boolean | undefined;
  /** Forwarded Flow chrome preset. `embed` hides the hint and binding list by default. */
  readonly chrome?: FieldRemapFlowMapperProps['chrome'];
  /** Explicit Flow chrome overrides take precedence over {@link FieldRemapPanelProps.chrome}. */
  readonly showFlowHint?: FieldRemapFlowMapperProps['showFlowHint'];
  readonly showBindingsList?: FieldRemapFlowMapperProps['showBindingsList'];
  readonly showConvertPalette?: FieldRemapFlowMapperProps['showConvertPalette'];
  readonly emptyDetail?: FieldRemapFlowMapperProps['emptyDetail'];
  readonly detailPresentation?: FieldRemapFlowMapperProps['detailPresentation'];
  /** Show the controller-owned preview snapshot in the nested Flow rail. */
  readonly showFlowPreview?: boolean;
  /** Forwarded to {@link FieldRemapFlowMapper} Controls MiniMap toggle. */
  readonly onShowMinimapChange?: FieldRemapFlowMapperProps['onShowMinimapChange'];
  readonly onPaneContextMenu?: FieldRemapFlowMapperProps['onPaneContextMenu'];
  readonly onNodeContextMenu?: FieldRemapFlowMapperProps['onNodeContextMenu'];
  readonly onEdgeContextMenu?: FieldRemapFlowMapperProps['onEdgeContextMenu'];
  readonly flowActionsRef?: FieldRemapFlowMapperProps['flowActionsRef'];
  /** Forwarded to {@link FieldRemapFlowMapper} chrome label / `t()` injection. */
  readonly labels?: FieldRemapFlowMapperProps['labels'];
  readonly t?: FieldRemapFlowMapperProps['t'];
}

function resolveSample(sample: FieldRemapPanelProps['sample']): FieldRemapSampleDefinition {
  if (!sample) {
    return getFieldRemapSample('nested-ab');
  }
  if (typeof sample === 'string') {
    return getFieldRemapSample(sample);
  }
  return sample;
}

function createFieldRemapPreviewSignature(): (value: unknown) => string {
  const referenceIds = new WeakMap<object, number>();
  let nextReferenceId = 1;
  const referenceId = (value: object): number => {
    const current = referenceIds.get(value);
    if (current !== undefined) {
      return current;
    }
    const next = nextReferenceId;
    nextReferenceId += 1;
    referenceIds.set(value, next);
    return next;
  };

  const visit = (value: unknown, ancestors: Set<object>): string => {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number') {
      return Number.isNaN(value) ? 'number:NaN' : `number:${String(value)}`;
    }
    if (typeof value === 'boolean' || typeof value === 'bigint') {
      return `${typeof value}:${String(value)}`;
    }
    if (typeof value === 'undefined') {
      return 'undefined';
    }
    if (typeof value === 'symbol') {
      return `symbol:${String(value.description)}`;
    }
    if (typeof value === 'function') {
      return `function:${referenceId(value)}`;
    }

    if (ancestors.has(value)) {
      return `reference:${referenceId(value)}`;
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        return `[${value.map((item) => visit(item, ancestors)).join(',')}]`;
      }
      if (value instanceof Date) {
        return `date:${value.toISOString()}`;
      }
      if (value instanceof Map) {
        return `map:{${[...value.entries()]
          .map(([key, item]) => `${visit(key, ancestors)}=>${visit(item, ancestors)}`)
          .sort()
          .join(',')}}`;
      }
      if (value instanceof Set) {
        return `set:{${[...value.values()]
          .map((item) => visit(item, ancestors))
          .sort()
          .join(',')}}`;
      }

      const record = value as Record<string, unknown>;
      const tag = Object.prototype.toString.call(value);
      return `${tag}:{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${visit(record[key], ancestors)}`)
        .join(',')}}`;
    } catch {
      return `object:${referenceId(value)}`;
    } finally {
      ancestors.delete(value);
    }
  };

  return (value) => visit(value, new Set<object>());
}

/**
 * Self-contained field-remap workbench panel:
 * schema columns A/B + optional convert wires (XYFlow) and `convertToShape` preview.
 *
 * Uncontrolled: pass `sample=` (Storybook / demos). Remount with `key={sampleId}` when
 * switching catalog entries so edge state resets.
 *
 * Controlled: pass `edges` + `onEdgesChange` (and optionally shapes / operators) so an
 * integrating host can persist bindings without forking panel state.
 */
export function FieldRemapPanel({
  sample: sampleProp,
  transforms: transformsProp,
  readOnly = false,
  editableShapes = true,
  ioChrome: ioChromeProp,
  includeHidden: includeHiddenProp,
  onIncludeHiddenChange,
  className,
  edges: edgesProp,
  onEdgesChange,
  operators: operatorsProp,
  onOperatorsChange,
  onDocumentReplace,
  historyOwner,
  historyActionsRef,
  onHistoryAvailabilityChange,
  sources: sourcesProp,
  onSourcesChange,
  targets: targetsProp,
  onTargetsChange,
  sourceSample: sourceSampleProp,
  targetShape: targetShapeProp,
  showMinimap,
  chrome,
  showFlowHint,
  showBindingsList,
  showConvertPalette,
  emptyDetail,
  detailPresentation,
  showFlowPreview,
  onShowMinimapChange,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  flowActionsRef,
  labels,
  t,
}: FieldRemapPanelProps): JSX.Element {
  const configuredIoChrome = resolveFieldRemapIoChrome(ioChromeProp, editableShapes);
  const ioChrome = readOnly && configuredIoChrome === 'edit' ? 'browse' : configuredIoChrome;
  const [uncontrolledIncludeHidden, setUncontrolledIncludeHidden] = useState(false);
  const includeHiddenControlled = includeHiddenProp !== undefined;
  const includeHidden = includeHiddenControlled ? includeHiddenProp : uncontrolledIncludeHidden;
  const setIncludeHidden = (next: boolean) => {
    if (!includeHiddenControlled) {
      setUncontrolledIncludeHidden(next);
    }
    onIncludeHiddenChange?.(next);
  };
  const sample = resolveSample(sampleProp);
  const registry = useMemo(() => {
    if (transformsProp) {
      return transformsProp;
    }
    const next = createBuiltinValueTransformRegistry();
    next.register(jsonataValueTransform);
    return next;
  }, [transformsProp]);

  const edgesControlled = edgesProp !== undefined;
  const operatorsControlled = operatorsProp !== undefined;
  const sourcesControlled = sourcesProp !== undefined;
  const targetsControlled = targetsProp !== undefined;
  const sourceSampleControlled = sourceSampleProp !== undefined;

  const [uncontrolledEdges, setUncontrolledEdges] = useState<readonly MappingEdge[]>(() => [
    ...(edgesProp ?? sample.edges),
  ]);
  const [uncontrolledOperators, setUncontrolledOperators] = useState<readonly MappingOperator[]>(
    () => [...(operatorsProp ?? sample.operators ?? [])],
  );
  const [preview, setPreview] = useState<FieldRemapPreviewState>({ status: 'loading' });
  const [previewController] = useState(() => createFieldRemapPreviewController());
  const previewControllerDisposeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [previewSignature] = useState(() => createFieldRemapPreviewSignature());
  const [uncontrolledSourceSample, setUncontrolledSourceSample] = useState<unknown>(
    () => sourceSampleProp ?? sample.source,
  );
  const [, setTargetSample] = useState<unknown>(() => targetShapeProp ?? sample.targetShape);
  const [sourceJson, setSourceJson] = useState(() =>
    JSON.stringify(sourceSampleProp ?? sample.source, null, 2),
  );
  const [targetJson, setTargetJson] = useState(() =>
    JSON.stringify(targetShapeProp ?? sample.targetShape, null, 2),
  );
  const [uncontrolledSources, setUncontrolledSources] = useState<readonly SourceField[]>(() =>
    sourcesProp
      ? [...sourcesProp]
      : sourceFieldsFromPlainObject(sourceSampleProp ?? sample.source, {
          idPrefix: sample.sourceIdPrefix,
        }),
  );
  const [uncontrolledTargets, setUncontrolledTargets] = useState<readonly TargetSlot[]>(() =>
    targetsProp
      ? [...targetsProp]
      : targetSlotsFromPlainObject(targetShapeProp ?? sample.targetShape, {
          idPrefix: sample.targetIdPrefix,
        }),
  );

  const edges = edgesControlled ? edgesProp : uncontrolledEdges;
  const operators = operatorsControlled ? operatorsProp : uncontrolledOperators;
  const sourceFields = sourcesControlled ? sourcesProp : uncontrolledSources;
  const targetSlots = targetsControlled ? targetsProp : uncontrolledTargets;
  const sourceSample = sourceSampleControlled ? sourceSampleProp : uncontrolledSourceSample;
  const transformRegistryRevision = previewSignature(registry.list());
  const previewRevision = previewSignature({
    sources: sourceFields,
    targets: targetSlots,
    edges,
    operators,
    sourceSample,
    sourceShapeId: sample.sourceIdPrefix,
    targetShapeId: sample.targetIdPrefix,
    sourceLabel: sample.sourceLabel,
    targetLabel: sample.targetLabel,
    transformRegistryRevision,
  });
  const historyOwnedByPanel = !edgesControlled && !operatorsControlled;
  const [panelHistory, setPanelHistory] = useState(createFieldRemapHistoryState);
  const currentHistorySnapshot = useMemo(
    () => createFieldRemapHistorySnapshot(edges, operators),
    [edges, operators],
  );
  const shapeRefs = useRef({ sources: sourceFields, targets: targetSlots });

  const flowSources = useMemo(
    () => projectSourceFields(sourceFields, { includeHidden }),
    [includeHidden, sourceFields],
  );
  const flowTargets = useMemo(
    () => projectTargetSlots(targetSlots, { includeHidden }),
    [includeHidden, targetSlots],
  );
  const flowEdges = useMemo(
    () => pruneMappingEdgesForShapes(edges, flowSources, flowTargets),
    [edges, flowSources, flowTargets],
  );

  const commitEdges = (next: readonly MappingEdge[]) => {
    if (!edgesControlled) {
      setUncontrolledEdges(next);
    }
    onEdgesChange?.(next);
  };

  const commitOperators = (next: readonly MappingOperator[]) => {
    if (!operatorsControlled) {
      setUncontrolledOperators(next);
    }
    onOperatorsChange?.(next);
  };

  const applyHistorySnapshot = (next: FieldRemapHistorySnapshot) => {
    if (
      !areFieldRemapHistorySnapshotsEqual(
        createFieldRemapHistorySnapshot(edges, next.operators),
        next,
      )
    ) {
      commitEdges(next.edges);
    }
    if (
      !areFieldRemapHistorySnapshotsEqual(
        createFieldRemapHistorySnapshot(next.edges, operators),
        next,
      )
    ) {
      commitOperators(next.operators);
    }
  };

  const recordSemanticSnapshot = (next: FieldRemapHistorySnapshot) => {
    if (areFieldRemapHistorySnapshotsEqual(currentHistorySnapshot, next)) {
      return;
    }
    if (historyOwnedByPanel) {
      setPanelHistory((current) => recordFieldRemapHistory(current, currentHistorySnapshot, next));
    } else {
      historyOwner?.record(currentHistorySnapshot, next);
    }
    applyHistorySnapshot(next);
  };

  const documentImportAvailable =
    !readOnly && (historyOwnedByPanel || onDocumentReplace !== undefined);

  const importDocumentText = (text: string): FieldRemapDocumentImportActionResult => {
    let document: FieldRemapDocument;
    try {
      document = deserializeFieldRemapImport(text, {
        sources: sourceFields,
        targets: targetSlots,
        transforms: registry,
      });
    } catch (error) {
      if (error instanceof UnsupportedFieldRemapDocumentVersionError) {
        return { status: 'rejected', code: 'unsupported-version' };
      }
      if (error instanceof FieldRemapImportAdmissionError) {
        return { status: 'rejected', code: error.code };
      }
      return { status: 'rejected', code: 'invalid-document' };
    }

    if (historyOwnedByPanel) {
      recordSemanticSnapshot(
        createFieldRemapHistorySnapshot(document.edges, document.operators ?? []),
      );
      return { status: 'accepted' };
    }
    if (!onDocumentReplace) {
      return { status: 'rejected', code: 'invalid-document' };
    }
    onDocumentReplace(document);
    return { status: 'accepted' };
  };

  const commitFlowEdges = (next: readonly MappingEdge[]) => {
    if (includeHidden) {
      recordSemanticSnapshot(createFieldRemapHistorySnapshot(next, operators));
      return;
    }
    const visibleIds = new Set(flowEdges.map((edge) => edge.id));
    const preserved = edges.filter((edge) => !visibleIds.has(edge.id));
    recordSemanticSnapshot(createFieldRemapHistorySnapshot([...preserved, ...next], operators));
  };

  const resetHistory = (next: FieldRemapHistorySnapshot) => {
    if (historyOwnedByPanel) {
      setPanelHistory(createFieldRemapHistoryState());
    } else {
      historyOwner?.reset(next);
    }
  };

  const resetHistoryForShapes = (
    nextEdges: readonly MappingEdge[],
    nextSources: readonly SourceField[],
    nextTargets: readonly TargetSlot[],
  ) => {
    shapeRefs.current = { sources: nextSources, targets: nextTargets };
    const next = createFieldRemapHistorySnapshot(nextEdges, operators);
    resetHistory(next);
    applyHistorySnapshot(next);
  };

  const undo = () => {
    if (historyOwnedByPanel) {
      const result = undoFieldRemapHistory(panelHistory, currentHistorySnapshot);
      if (!result) {
        return;
      }
      setPanelHistory(result.state);
      applyHistorySnapshot(result.snapshot);
      return;
    }
    if (!historyOwner?.canUndo) {
      return;
    }
    const next = historyOwner.undo();
    if (next) {
      applyHistorySnapshot(next);
    }
  };

  const redo = () => {
    if (historyOwnedByPanel) {
      const result = redoFieldRemapHistory(panelHistory, currentHistorySnapshot);
      if (!result) {
        return;
      }
      setPanelHistory(result.state);
      applyHistorySnapshot(result.snapshot);
      return;
    }
    if (!historyOwner?.canRedo) {
      return;
    }
    const next = historyOwner.redo();
    if (next) {
      applyHistorySnapshot(next);
    }
  };

  const historyAvailability = {
    canUndo: historyOwnedByPanel ? panelHistory.past.length > 0 : (historyOwner?.canUndo ?? false),
    canRedo: historyOwnedByPanel
      ? panelHistory.future.length > 0
      : (historyOwner?.canRedo ?? false),
  };

  const handleHistoryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) {
      return;
    }
    if (
      event.defaultPrevented ||
      event.altKey ||
      (!event.ctrlKey && !event.metaKey) ||
      isFieldRemapEditableShortcutTarget(event.target)
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const requestsUndo = key === 'z' && !event.shiftKey;
    const requestsRedo =
      (key === 'z' && event.shiftKey) ||
      (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey);
    if (
      (!requestsUndo && !requestsRedo) ||
      (requestsUndo && !historyAvailability.canUndo) ||
      (requestsRedo && !historyAvailability.canRedo)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (requestsUndo) {
      undo();
    } else {
      redo();
    }
  };

  useImperativeHandle(historyActionsRef, () => ({ ...historyAvailability, undo, redo }), [
    historyAvailability.canRedo,
    historyAvailability.canUndo,
    panelHistory,
    currentHistorySnapshot,
    historyOwner,
  ]);

  useEffect(() => {
    onHistoryAvailabilityChange?.(historyAvailability);
  }, [historyAvailability.canRedo, historyAvailability.canUndo, onHistoryAvailabilityChange]);

  useEffect(() => {
    if (shapeRefs.current.sources === sourceFields && shapeRefs.current.targets === targetSlots) {
      return;
    }
    shapeRefs.current = { sources: sourceFields, targets: targetSlots };
    const nextEdges = pruneMappingEdgesForShapes(edges, sourceFields, targetSlots);
    const next = createFieldRemapHistorySnapshot(nextEdges, operators);
    if (historyOwnedByPanel) {
      setPanelHistory(createFieldRemapHistoryState());
    } else {
      historyOwner?.reset(next);
    }
    applyHistorySnapshot(next);
  }, [
    edges,
    historyOwnedByPanel,
    historyOwner,
    onEdgesChange,
    onOperatorsChange,
    operators,
    sourceFields,
    targetSlots,
  ]);

  const commitSources = (next: readonly SourceField[]) => {
    if (!sourcesControlled) {
      setUncontrolledSources(next);
    }
    onSourcesChange?.(next);
  };

  const commitTargets = (next: readonly TargetSlot[]) => {
    if (!targetsControlled) {
      setUncontrolledTargets(next);
    }
    onTargetsChange?.(next);
  };

  const conflicts = useMemo(
    () => findParentChildMappingConflicts(edges, sourceFields, targetSlots),
    [edges, sourceFields, targetSlots],
  );

  useEffect(() => {
    if (previewControllerDisposeTimer.current !== undefined) {
      clearTimeout(previewControllerDisposeTimer.current);
      previewControllerDisposeTimer.current = undefined;
    }
    const unsubscribe = previewController.subscribe(() => {
      setPreview(previewController.getSnapshot());
    });
    const currentSnapshot = previewController.getSnapshot();
    if (currentSnapshot.status !== 'unavailable') {
      setPreview(currentSnapshot);
    }

    return () => {
      unsubscribe();
      const timer = setTimeout(() => {
        if (previewControllerDisposeTimer.current === timer) {
          previewControllerDisposeTimer.current = undefined;
          previewController.dispose();
        }
      }, 0);
      previewControllerDisposeTimer.current = timer;
    };
  }, [previewController]);

  useEffect(() => {
    previewController.update({
      kind: 'evaluate',
      revision: previewRevision,
      input: {
        sources: sourceFields,
        targets: targetSlots,
        edges,
        operators,
        inputs: { [sample.sourceIdPrefix]: sourceSample },
        transforms: registry,
        sourceShapeIds: [sample.sourceIdPrefix],
        targetShapeId: sample.targetIdPrefix,
        sourceLabel: sample.sourceLabel,
        targetLabel: sample.targetLabel,
      },
    });
  }, [
    edges,
    operators,
    previewController,
    previewRevision,
    registry,
    sample,
    sourceFields,
    sourceSample,
    targetSlots,
  ]);

  const applySourceShape = (parsed: unknown) => {
    const ingested = ingestSourceShape(parsed, sample.sourceIdPrefix);
    if (!sourceSampleControlled) {
      setUncontrolledSourceSample(parsed);
    }
    setSourceJson(ingested.sampleJson);
    commitSources(ingested.fields);
    resetHistoryForShapes(
      pruneMappingEdgesForShapes(edges, ingested.fields, targetSlots),
      ingested.fields,
      targetSlots,
    );
  };

  const applyTargetShape = (parsed: unknown) => {
    const ingested = ingestTargetShape(parsed, sample.targetIdPrefix);
    setTargetSample(parsed);
    setTargetJson(ingested.sampleJson);
    commitTargets(ingested.fields);
    resetHistoryForShapes(
      pruneMappingEdgesForShapes(edges, sourceFields, ingested.fields),
      sourceFields,
      ingested.fields,
    );
  };

  return (
    <div
      className={['workbench-field-remap-demo', className].filter(Boolean).join(' ')}
      data-testid="field-remap-demo"
      data-sample-id={sample.id}
      data-edges-mode={edgesControlled ? 'controlled' : 'uncontrolled'}
      data-read-only={readOnly ? 'true' : 'false'}
      onKeyDown={handleHistoryKeyDown}
    >
      <header className="workbench-field-remap-demo__header">
        <h2 className="workbench-field-remap-demo__title">{sample.title}</h2>
        <p className="workbench-field-remap-demo__intro">{sample.description}</p>
        <FieldRemapDocumentIo
          getDocumentJson={() =>
            serializeFieldRemapDocument(
              createFieldRemapDocument(edges, {
                ...(operators.length > 0 ? { operators } : {}),
              }),
            )
          }
          importAvailable={documentImportAvailable}
          labels={labels}
          t={t}
          onImportText={importDocumentText}
        />
      </header>

      {ioChrome === 'edit' ? (
        <div className="workbench-field-remap-demo__shapes" data-testid="field-remap-shapes">
          <FieldRemapShapeIoEditor
            role="source"
            title={sample.sourceLabel}
            idPrefix={sample.sourceIdPrefix}
            sampleJson={sourceJson}
            fields={sourceFields}
            onSampleJsonChange={setSourceJson}
            onApplySample={applySourceShape}
            onFieldsChange={(next) => commitSources(next as readonly SourceField[])}
          />
          <FieldRemapShapeIoEditor
            role="target"
            title={sample.targetLabel}
            idPrefix={sample.targetIdPrefix}
            sampleJson={targetJson}
            fields={targetSlots}
            onSampleJsonChange={setTargetJson}
            onApplySample={applyTargetShape}
            onFieldsChange={(next) => commitTargets(next as readonly TargetSlot[])}
          />
        </div>
      ) : null}

      {ioChrome === 'browse' ? (
        <div
          className="workbench-field-remap-demo__shapes"
          data-testid="field-remap-io-browse-wrap"
        >
          <FieldRemapIoClassBrowse
            includeHidden={includeHidden}
            sources={sourceFields}
            sourcesTitle={sample.sourceLabel}
            targets={targetSlots}
            targetsTitle={sample.targetLabel}
          />
        </div>
      ) : null}

      <FieldRemapFlowMapper
        readOnly={readOnly}
        sources={flowSources}
        targets={flowTargets}
        edges={flowEdges}
        parentChildConflicts={conflicts}
        transforms={registry}
        onEdgesChange={commitFlowEdges}
        operators={operators}
        onOperatorsChange={(next) =>
          recordSemanticSnapshot(createFieldRemapHistorySnapshot(edges, next))
        }
        sourceTitle={sample.sourceLabel}
        targetTitle={sample.targetLabel}
        showMinimap={showMinimap}
        chrome={chrome}
        showFlowHint={showFlowHint}
        showBindingsList={showBindingsList}
        showConvertPalette={showConvertPalette}
        emptyDetail={emptyDetail}
        detailPresentation={detailPresentation}
        {...(showFlowPreview ? { preview, showPreview: true } : {})}
        onShowMinimapChange={onShowMinimapChange}
        includeHidden={includeHidden}
        onIncludeHiddenChange={setIncludeHidden}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        flowActionsRef={flowActionsRef}
        labels={labels}
        t={t}
      />

      {preview.status === 'error' ? (
        <p className="workbench-field-remap-demo__error" role="alert">
          {preview.message}
        </p>
      ) : null}

      <div className="workbench-field-remap-demo__panes">
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-source">
          <h3 id="field-remap-source">{sample.sourceLabel}</h3>
          <pre data-testid="field-remap-input">{JSON.stringify(sourceSample, null, 2)}</pre>
        </section>
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-target">
          <h3 id="field-remap-target">{sample.targetLabel}</h3>
          <pre data-testid="field-remap-result">
            {JSON.stringify(preview.status === 'ready' ? preview.result.output : {}, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
