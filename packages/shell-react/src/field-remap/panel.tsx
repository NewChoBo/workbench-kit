import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
  type Ref,
} from 'react';
import {
  applyMappingOperators,
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  findParentChildMappingConflicts,
  normalizeMappingOperators,
  projectSourceFields,
  projectTargetSlots,
  pruneMappingEdgesForShapes,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  withConversionEdges,
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
   * Composite history owner for controlled or mixed-control mapping state. When either durable
   * channel is controlled, the Panel never creates a partial private history.
   */
  readonly historyOwner?: FieldRemapHistoryOwner | undefined;
  /** Imperative semantic undo/redo actions for host chrome. Keyboard routing remains host-owned. */
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

type FieldRemapPreviewResult = {
  readonly output: Record<string, unknown>;
  readonly error?: string;
};

function resolveSample(sample: FieldRemapPanelProps['sample']): FieldRemapSampleDefinition {
  if (!sample) {
    return getFieldRemapSample('nested-ab');
  }
  if (typeof sample === 'string') {
    return getFieldRemapSample(sample);
  }
  return sample;
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
  editableShapes = true,
  ioChrome: ioChromeProp,
  includeHidden: includeHiddenProp,
  onIncludeHiddenChange,
  className,
  edges: edgesProp,
  onEdgesChange,
  operators: operatorsProp,
  onOperatorsChange,
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
  onShowMinimapChange,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  flowActionsRef,
  labels,
  t,
}: FieldRemapPanelProps): JSX.Element {
  const ioChrome = resolveFieldRemapIoChrome(ioChromeProp, editableShapes);
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
  const [result, setResult] = useState<FieldRemapPreviewResult>({ output: {} });
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

  const shapes = useMemo(
    () => [
      defineDataShape({
        id: sample.sourceIdPrefix,
        label: sample.sourceLabel,
        role: 'source',
        fields: sourceFields,
      }),
      defineDataShape({
        id: sample.targetIdPrefix,
        label: sample.targetLabel,
        role: 'target',
        fields: targetSlots,
      }),
    ],
    [sample, sourceFields, targetSlots],
  );

  const conflicts = useMemo(
    () => findParentChildMappingConflicts(edges, sourceFields, targetSlots),
    [edges, sourceFields, targetSlots],
  );

  useEffect(() => {
    const controller = new AbortController();
    const conversion = withConversionEdges(
      defineConversion({
        id: `${sample.sourceIdPrefix}→${sample.targetIdPrefix}`,
        sourceShapeIds: [sample.sourceIdPrefix],
        targetShapeId: sample.targetIdPrefix,
        edges: [...sample.edges],
      }),
      edges,
    );

    void convertToShape({
      conversion,
      shapes,
      inputs: { [sample.sourceIdPrefix]: sourceSample },
      transforms: registry,
      signal: controller.signal,
    })
      .then(async (next) => {
        if (controller.signal.aborted) {
          return;
        }
        const normalizedOps = normalizeMappingOperators(operators);
        if (!normalizedOps?.length) {
          setResult({ output: next.output });
          return;
        }
        const merged = await applyMappingOperators({
          operators: normalizedOps,
          sources: sourceFields,
          targets: targetSlots,
          inputs: { [sample.sourceIdPrefix]: sourceSample },
          transforms: registry,
          output: next.output,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResult({ output: merged.output });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          output: {},
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      controller.abort();
    };
  }, [edges, operators, registry, sample, shapes, sourceFields, sourceSample, targetSlots]);

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
    >
      <header className="workbench-field-remap-demo__header">
        <h2 className="workbench-field-remap-demo__title">{sample.title}</h2>
        <p className="workbench-field-remap-demo__intro">{sample.description}</p>
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
        sources={flowSources}
        targets={flowTargets}
        edges={flowEdges}
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

      {conflicts.length > 0 ? (
        <p
          className="workbench-field-remap-demo__warn"
          role="status"
          data-testid="field-remap-conflicts"
        >
          Warning: parent and child fields are both mapped (
          {conflicts.map((item) => `${item.parentId} / ${item.childId}`).join('; ')}). Prefer one
          level.
        </p>
      ) : null}

      {result.error ? (
        <p className="workbench-field-remap-demo__error" role="alert">
          {result.error}
        </p>
      ) : null}

      <div className="workbench-field-remap-demo__panes">
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-source">
          <h3 id="field-remap-source">{sample.sourceLabel}</h3>
          <pre data-testid="field-remap-input">{JSON.stringify(sourceSample, null, 2)}</pre>
        </section>
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-target">
          <h3 id="field-remap-target">{sample.targetLabel}</h3>
          <pre data-testid="field-remap-result">{JSON.stringify(result.output, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
