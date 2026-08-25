import {
  Children,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type ReactNode,
} from 'react';
import {
  Background,
  ControlButton,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SmoothStepEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type FinalConnectionState,
  type Node,
  type NodeProps,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge, IconButton } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import {
  MAX_TRANSFORM_CHAIN,
  findParentChildMappingConflicts,
  type MappingConflict,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { FieldRemapConvertPalette } from './convert-palette.js';
import { hasFieldRemapTransformDragType, readFieldRemapTransformDragData } from './drag-payload.js';
import {
  resolveFieldRemapChromeLabels,
  type FieldRemapChromeLabels,
  type FieldRemapTranslate,
} from './chrome-labels.js';
import { FieldRemapDetailPanel } from './detail-panel.js';
import {
  applyFieldRemapFlowConnection,
  evaluateFieldRemapFlowConnection,
  isValidFieldRemapFlowConnection,
  mappingToFlowGraph,
  parseDraftTransformNodeId,
  parseOperatorNodeId,
  type FieldRemapCombineOperatorNodeData,
  type FieldRemapDraftTransformNodeData,
  type FieldRemapFlowEdgeData,
  type FieldRemapFlowConnectionRejectionReason,
  type FieldRemapFlowNodeData,
  type FieldRemapSourceObjectNodeData,
  type FieldRemapSplitOperatorNodeData,
  type FieldRemapTargetObjectNodeData,
  type FieldRemapTransformNodeData,
} from './flow-adapter.js';
import { createFieldRemapGraphSyncKey, createTransformRegistrySignature } from './flow-sync-key.js';
import {
  addTransformStepToEdge,
  bindDraftSource,
  bindDraftTarget,
  bindOperatorInput,
  bindOperatorOutput,
  canEditListContext,
  createCombineOperator,
  createDraftTransform,
  createSplitOperator,
  edgePortTypes,
  enableListContextOnEdge,
  finalizeDraftTransform,
  asFieldRemapBulkSelectionRef,
  fieldRemapBulkSelectionKey,
  fieldRemapSelectionKey,
  listCompatibleTransforms,
  listFieldRemapBulkSelectionRefs,
  normalizeFieldRemapBulkSelection,
  planFieldRemapBulkDelete,
  removeMappingOperator,
  updateFieldRemapBulkSelection,
  updateMappingOperator,
  type FieldRemapBulkSelectionRef,
  type FieldRemapDraftTransform,
  type FieldRemapSelection,
} from './flow-ops.js';
import { isFieldRemapEditableShortcutTarget } from './keyboard.js';
import { FieldRemapPreviewRail, type FieldRemapPreviewState } from './preview.js';
import './view.css';

type FieldRemapFocusSurface = 'graph' | 'list';
type FieldRemapFocusableElement = HTMLElement | SVGElement;
type RegisterFieldRemapFocusTarget = (
  key: string,
  surface: FieldRemapFocusSurface,
  element: FieldRemapFocusableElement | null,
) => void;

const loadFieldRemapModalDetail = async () => {
  const module = await import('./modal-detail.js');
  return { default: module.FieldRemapModalDetail };
};
const FieldRemapModalDetail = lazy(loadFieldRemapModalDetail);

function TypeBadge({ dataType }: { readonly dataType?: string }): JSX.Element | null {
  if (dataType !== 'object' && dataType !== 'array') {
    return null;
  }
  return <Badge variant="muted">{dataType}</Badge>;
}

function SourceObjectNode({ data }: NodeProps<Node<FieldRemapSourceObjectNodeData>>): JSX.Element {
  return (
    <div
      className="workbench-field-remap-flow-node workbench-field-remap-flow-node--object workbench-field-remap-flow-node--source"
      data-testid="field-remap-source-schema"
    >
      <div className="workbench-field-remap-flow-node__header">
        <strong>{data.title}</strong>
        <span className="workbench-field-remap-flow-node__hint">
          {data.schemaRole ?? 'Source schema'}
        </span>
      </div>
      <ul className="workbench-field-remap-flow-node__ports">
        {data.ports.map((port) => (
          <li key={port.fieldId} className="workbench-field-remap-flow-node__port">
            <span className="workbench-field-remap-flow-node__port-label">
              <span>{port.label}</span>
              <TypeBadge dataType={port.dataType} />
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={port.fieldId}
              className="workbench-field-remap-flow-node__handle"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TargetObjectNode({ data }: NodeProps<Node<FieldRemapTargetObjectNodeData>>): JSX.Element {
  return (
    <div
      className="workbench-field-remap-flow-node workbench-field-remap-flow-node--object workbench-field-remap-flow-node--target"
      data-testid="field-remap-target-schema"
    >
      <div className="workbench-field-remap-flow-node__header">
        <strong>{data.title}</strong>
        <span className="workbench-field-remap-flow-node__hint">
          {data.schemaRole ?? 'Target schema'}
        </span>
      </div>
      <ul className="workbench-field-remap-flow-node__ports">
        {data.ports.map((port) => (
          <li key={port.fieldId} className="workbench-field-remap-flow-node__port">
            <Handle
              type="target"
              position={Position.Left}
              id={port.fieldId}
              className="workbench-field-remap-flow-node__handle"
            />
            <span className="workbench-field-remap-flow-node__port-label">
              <span>{port.label}</span>
              <TypeBadge dataType={port.dataType} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TransformNode({ data }: NodeProps<Node<FieldRemapTransformNodeData>>): JSX.Element {
  const registerFocusTarget = data.registerFocusTarget as RegisterFieldRemapFocusTarget | undefined;
  const selectionKey = fieldRemapBulkSelectionKey({
    kind: 'transformStep',
    edgeId: data.mappingEdgeId,
    stepIndex: data.stepIndex,
  });
  const registerRoot = useCallback(
    (element: HTMLDivElement | null) => {
      registerFocusTarget?.(selectionKey, 'graph', element?.parentElement ?? null);
    },
    [registerFocusTarget, selectionKey],
  );
  return (
    <div
      ref={registerRoot}
      className={
        data.selected
          ? 'workbench-field-remap-flow-node workbench-field-remap-flow-node--transform is-selected'
          : 'workbench-field-remap-flow-node workbench-field-remap-flow-node--transform'
      }
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="workbench-field-remap-flow-node__title">
        <strong>{data.label}</strong>
      </div>
      <code className="workbench-field-remap-flow-node__id">{data.transformId}</code>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function FieldRemapSmoothStepEdge(props: EdgeProps<Edge<FieldRemapFlowEdgeData>>): JSX.Element {
  const registerFocusTarget = props.data?.registerFocusTarget as
    RegisterFieldRemapFocusTarget | undefined;
  const mappingEdgeId = props.data?.mappingEdgeId;
  const canonicalSegment = props.data?.segment === 'direct' || props.data?.segment === 'in';
  const selectionKey =
    mappingEdgeId && canonicalSegment
      ? fieldRemapBulkSelectionKey({ kind: 'edge', edgeId: mappingEdgeId })
      : undefined;
  const registerRoot = useCallback(
    (element: SVGGElement | null) => {
      if (selectionKey) {
        registerFocusTarget?.(selectionKey, 'graph', element?.parentElement ?? null);
      }
    },
    [registerFocusTarget, selectionKey],
  );

  return (
    <g ref={selectionKey ? registerRoot : undefined}>
      <SmoothStepEdge {...props} />
    </g>
  );
}

function DraftTransformNode({
  data,
}: NodeProps<Node<FieldRemapDraftTransformNodeData>>): JSX.Element {
  return (
    <div
      className="workbench-field-remap-flow-node workbench-field-remap-flow-node--transform workbench-field-remap-flow-node--draft"
      data-testid={`field-remap-draft-${data.localId}`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="workbench-field-remap-flow-node__title">
        <strong>{data.label}</strong>
        <Badge variant="muted">draft</Badge>
      </div>
      <code className="workbench-field-remap-flow-node__id">{data.transformId}</code>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function CombineOperatorNode({
  data,
}: NodeProps<Node<FieldRemapCombineOperatorNodeData>>): JSX.Element {
  return (
    <div
      className="workbench-field-remap-flow-node workbench-field-remap-flow-node--operator workbench-field-remap-flow-node--combine"
      data-testid={`field-remap-op-${data.operatorId}`}
    >
      <div className="workbench-field-remap-flow-node__title">
        <strong>{data.label}</strong>
        <Badge variant="muted">n→1</Badge>
      </div>
      <ul className="workbench-field-remap-flow-node__ports">
        {data.inputFieldIds.map((fieldId) => (
          <li key={fieldId} className="workbench-field-remap-flow-node__port">
            <Handle
              type="target"
              position={Position.Left}
              id={fieldId}
              className="workbench-field-remap-flow-node__handle"
            />
            <span className="workbench-field-remap-flow-node__port-label">
              <code>{fieldId}</code>
            </span>
          </li>
        ))}
      </ul>
      <div className="workbench-field-remap-flow-node__port workbench-field-remap-flow-node__port--out">
        <span className="workbench-field-remap-flow-node__port-label">
          <code>{data.outputSlotId}</code>
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="workbench-field-remap-flow-node__handle"
        />
      </div>
    </div>
  );
}

function SplitOperatorNode({
  data,
}: NodeProps<Node<FieldRemapSplitOperatorNodeData>>): JSX.Element {
  return (
    <div
      className="workbench-field-remap-flow-node workbench-field-remap-flow-node--operator workbench-field-remap-flow-node--split"
      data-testid={`field-remap-op-${data.operatorId}`}
    >
      <div className="workbench-field-remap-flow-node__title">
        <strong>{data.label}</strong>
        <Badge variant="muted">1→n</Badge>
      </div>
      <div className="workbench-field-remap-flow-node__port workbench-field-remap-flow-node__port--in">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="workbench-field-remap-flow-node__handle"
        />
        <span className="workbench-field-remap-flow-node__port-label">
          <code>{data.inputFieldId}</code>
        </span>
      </div>
      <ul className="workbench-field-remap-flow-node__ports">
        {data.outputSlotIds.map((slotId) => (
          <li key={slotId} className="workbench-field-remap-flow-node__port">
            <span className="workbench-field-remap-flow-node__port-label">
              <code>{slotId}</code>
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={slotId}
              className="workbench-field-remap-flow-node__handle"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const nodeTypes = {
  fieldRemapSourceObject: SourceObjectNode,
  fieldRemapTargetObject: TargetObjectNode,
  fieldRemapTransform: TransformNode,
  fieldRemapDraftTransform: DraftTransformNode,
  fieldRemapCombineOperator: CombineOperatorNode,
  fieldRemapSplitOperator: SplitOperatorNode,
};

const edgeTypes = {
  smoothstep: FieldRemapSmoothStepEdge,
};

/** Imperative Flow chrome actions for integrating hosts (fit-view without Controls DOM). */
export interface FieldRemapFlowActions {
  fitView: (options?: { padding?: number; maxZoom?: number }) => void;
}

const DEFAULT_FIT_VIEW_OPTIONS = { padding: 0.12, maxZoom: 1.15 } as const;

/**
 * Bridges imperative fit-view to hosts without subscribing the whole canvas
 * to the React Flow store (avoids update loops with controlled nodes).
 */
function FieldRemapFlowActionsBridge({
  flowActionsRef,
}: {
  readonly flowActionsRef?: Ref<FieldRemapFlowActions | null> | undefined;
}): null {
  const { fitView } = useReactFlow();
  useImperativeHandle(
    flowActionsRef,
    () => ({
      fitView: (options) => {
        void fitView({
          padding: options?.padding ?? DEFAULT_FIT_VIEW_OPTIONS.padding,
          maxZoom: options?.maxZoom ?? DEFAULT_FIT_VIEW_OPTIONS.maxZoom,
        });
      },
    }),
    [fitView],
  );
  return null;
}

export interface FieldRemapFlowMapperProps {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
  /** Existing target/donor edges are replaced by default; `reject` preserves them unchanged. */
  readonly rewirePolicy?: 'replace' | 'reject' | undefined;
  /** Structured completed-attempt feedback; hover validation never invokes this callback. */
  readonly onConnectionFeedback?:
    ((feedback: FieldRemapConnectionFeedback | null) => void) | undefined;
  /**
   * Authoritative parent/child conflict projection. `undefined` derives from supplied Flow inputs;
   * an explicit empty array suppresses fallback derivation.
   */
  readonly parentChildConflicts?: readonly MappingConflict[] | undefined;
  /**
   * `card` preserves the demo chrome. `embed` omits the flow hint and binding list;
   * explicit `show*` props below take precedence.
   */
  readonly chrome?: 'card' | 'embed' | undefined;
  /** Show the empty-selection detail hint, or collapse that rail until a selection exists. */
  readonly emptyDetail?: 'hint' | 'collapse' | undefined;
  /** Render selection detail in the resizable rail (default) or the shared workbench Modal. */
  readonly detailPresentation?: 'rail' | 'modal' | undefined;
  /** Show the convert-first hint. Defaults to true for `card`, false for `embed`. */
  readonly showFlowHint?: boolean | undefined;
  /** Show the bottom binding list. Defaults to true for `card`, false for `embed`. */
  readonly showBindingsList?: boolean | undefined;
  /**
   * Mount the primary Convert palette. Defaults to true for both chrome modes; when false,
   * the workspace expands without leaving an empty grid track.
   */
  readonly showConvertPalette?: boolean | undefined;
  /**
   * View-only authoring guard. Existing mappings remain inspectable, while durable mutations and
   * mapper-local drafts are disabled. This is not an authorization boundary.
   */
  readonly readOnly?: boolean | undefined;
  /** Document v2 n→m operators (display + authoring when onOperatorsChange is set). */
  readonly operators?: readonly MappingOperator[] | undefined;
  readonly onOperatorsChange?: ((operators: readonly MappingOperator[]) => void) | undefined;
  readonly sourceTitle?: string | undefined;
  readonly targetTitle?: string | undefined;
  readonly selection?: FieldRemapSelection | undefined;
  readonly onSelectionChange?: ((next: FieldRemapSelection) => void) | undefined;
  /** Precomputed runtime-only preview. Flow never evaluates mappings itself. */
  readonly preview?: FieldRemapPreviewState;
  /** Explicitly hide an injected preview without reserving a splitter track. */
  readonly showPreview?: boolean;
  /**
   * When false, MiniMap is not mounted (not CSS-hidden). Defaults to true for
   * backward compatibility with existing samples.
   */
  readonly showMinimap?: boolean | undefined;
  /**
   * When set, Flow Controls (+/−/fit) include a MiniMap toggle button in the same
   * panel. Hosts should prefer this over a separate toolbar control.
   */
  readonly onShowMinimapChange?: ((show: boolean) => void) | undefined;
  /**
   * When false (default), hosts should project shapes with hidden fields omitted
   * before passing `sources` / `targets`. Flow itself does not filter — this flag
   * drives the Controls toggle pressed state only.
   */
  readonly includeHidden?: boolean | undefined;
  /**
   * When set, Flow Controls include a hidden-fields toggle next to zoom / MiniMap.
   * Pair with host (or Panel) shape projection on `includeHidden`.
   */
  readonly onIncludeHiddenChange?: ((includeHidden: boolean) => void) | undefined;
  /** Pane context menu; host owns menu UI. Receives current Field Remap selection. */
  readonly onPaneContextMenu?:
    | ((event: MouseEvent | globalThis.MouseEvent, ctx: { selection: FieldRemapSelection }) => void)
    | undefined;
  /** Node context menu; host owns menu UI. */
  readonly onNodeContextMenu?:
    | ((
        event: MouseEvent | globalThis.MouseEvent,
        ctx: { nodeId: string; selection: FieldRemapSelection },
      ) => void)
    | undefined;
  /** Edge context menu; host owns menu UI. */
  readonly onEdgeContextMenu?:
    | ((
        event: MouseEvent | globalThis.MouseEvent,
        ctx: { edgeId: string; selection: FieldRemapSelection },
      ) => void)
    | undefined;
  /** Imperative fit-view (same defaults as Controls fit-view). */
  readonly flowActionsRef?: Ref<FieldRemapFlowActions | null> | undefined;
  /**
   * Override high-visibility chrome strings (edge-list heading, Convert palette).
   * Prefer this over CSS text hacks when the host product noun is not “Bindings”.
   */
  readonly labels?: Partial<FieldRemapChromeLabels> | undefined;
  /** Optional `t(key, fallback)` injection; `labels` wins when both are set. */
  readonly t?: FieldRemapTranslate | undefined;
}

export type FieldRemapConnectionFeedbackReason =
  FieldRemapFlowConnectionRejectionReason | 'rewire-policy-rejected';

export interface FieldRemapConnectionFeedback {
  readonly reason: FieldRemapConnectionFeedbackReason;
  readonly impactedEdgeIds?: readonly string[];
}

function areFieldRemapBulkSelectionsEqual(
  left: readonly FieldRemapBulkSelectionRef[],
  right: readonly FieldRemapBulkSelectionRef[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (ref, index) => fieldRemapBulkSelectionKey(ref) === fieldRemapBulkSelectionKey(right[index]!),
    )
  );
}

function fieldRemapBulkDomainKey(refs: readonly FieldRemapBulkSelectionRef[]): string {
  return refs
    .map(fieldRemapBulkSelectionKey)
    .map((key) => `${key.length}:${key}`)
    .join('');
}

function fieldRemapBulkRefFromKeyboardTarget(
  target: EventTarget | null,
): FieldRemapBulkSelectionRef | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const explicit = target.closest<HTMLElement>('[data-field-remap-bulk-kind]');
  const explicitKind = explicit?.dataset.fieldRemapBulkKind;
  const explicitEdgeId = explicit?.dataset.fieldRemapBulkEdgeId;
  if (explicitKind === 'edge' && explicitEdgeId) {
    return { kind: 'edge', edgeId: explicitEdgeId };
  }
  if (explicitKind === 'transformStep' && explicitEdgeId) {
    const stepIndex = Number(explicit.dataset.fieldRemapBulkStepIndex);
    if (Number.isInteger(stepIndex) && stepIndex >= 0) {
      return { kind: 'transformStep', edgeId: explicitEdgeId, stepIndex };
    }
  }
  return undefined;
}

function connectionFromFinalState(state: FinalConnectionState): Connection | null {
  if (!state.fromNode || !state.fromHandle || !state.toNode || !state.toHandle) {
    return null;
  }
  const reversed = state.fromHandle.type === 'target';
  return {
    source: (reversed ? state.toNode : state.fromNode).id,
    sourceHandle: (reversed ? state.toHandle : state.fromHandle).id ?? null,
    target: (reversed ? state.fromNode : state.toNode).id,
    targetHandle: (reversed ? state.fromHandle : state.toHandle).id ?? null,
  };
}

interface FieldRemapSplitWorkspaceProps {
  readonly children: ReactNode;
  readonly layout: 'wide' | 'medium' | 'narrow';
  readonly reserveHiddenDetailSplit: boolean;
  readonly showConvertPalette: boolean;
  readonly showDetail: boolean;
  readonly surface: 'binding' | 'convert-note' | 'draft-convert' | 'operator';
}

/**
 * The Flow rails are deliberately composed from the shared SplitView primitive so keyboard and
 * pointer resizing stay consistent with the rest of the workbench. At narrower host widths the
 * palette and/or detail move above or below the canvas rather than squeezing its usable width.
 */
function FieldRemapSplitWorkspace({
  children,
  layout,
  reserveHiddenDetailSplit,
  showConvertPalette,
  showDetail,
  surface,
}: FieldRemapSplitWorkspaceProps): JSX.Element {
  const [palette, canvas, detail] = Children.toArray(children);
  const isNarrow = layout === 'narrow';
  const [paletteSizeByLayout, setPaletteSizeByLayout] = useState({
    wide: 240,
    medium: 240,
    narrow: 192,
  });
  const [detailSizeByLayout, setDetailSizeByLayout] = useState({
    wide: 320,
    medium: 320,
    narrow: 220,
  });
  const paletteSizePx = paletteSizeByLayout[layout];
  const detailSizePx = detailSizeByLayout[layout];
  const canvasWithDetail =
    showDetail || reserveHiddenDetailSplit ? (
      <SplitView
        className={
          showDetail
            ? 'workbench-field-remap-flow__canvas-detail-split'
            : 'workbench-field-remap-flow__canvas-detail-split ui-workbench-split-view--secondary-collapsed'
        }
        layoutMode="secondary-fixed"
        maxSecondarySizePx={isNarrow ? 320 : 480}
        minPrimarySizePx={isNarrow ? 200 : 280}
        minSecondarySizePx={isNarrow ? 160 : 256}
        onSecondarySizePxChange={(nextSize) => {
          setDetailSizeByLayout((current) => ({ ...current, [layout]: nextSize }));
        }}
        orientation={isNarrow ? 'vertical' : 'horizontal'}
        primary={canvas}
        secondary={detail}
        secondarySizePx={detailSizePx}
      />
    ) : (
      canvas
    );

  const content = (
    <SplitView
      className={
        showConvertPalette
          ? 'workbench-field-remap-flow__palette-split'
          : 'workbench-field-remap-flow__palette-split ui-workbench-split-view--primary-collapsed'
      }
      maxPrimarySizePx={isNarrow ? 288 : 320}
      minPrimarySizePx={isNarrow ? 160 : 192}
      minSecondarySizePx={isNarrow ? 200 : 280}
      onPrimarySizePxChange={(nextSize) => {
        setPaletteSizeByLayout((current) => ({ ...current, [layout]: nextSize }));
      }}
      orientation={layout === 'wide' ? 'horizontal' : 'vertical'}
      primary={palette}
      primarySizePx={paletteSizePx}
      primarySizeUnit="pixels"
      secondary={canvasWithDetail}
    />
  );

  return (
    <div
      className={
        showConvertPalette
          ? 'workbench-field-remap-flow__workspace workbench-field-remap-flow__workspace--split'
          : 'workbench-field-remap-flow__workspace workbench-field-remap-flow__workspace--split workbench-field-remap-flow__workspace--without-palette'
      }
      data-layout={layout}
      data-surface={surface}
      data-testid="field-remap-workspace"
    >
      {content}
    </div>
  );
}

function FieldRemapFlowCanvas({
  sources,
  targets,
  edges,
  transforms,
  onEdgesChange,
  rewirePolicy = 'replace',
  onConnectionFeedback,
  parentChildConflicts,
  chrome = 'card',
  emptyDetail: emptyDetailProp,
  detailPresentation = 'rail',
  showFlowHint: showFlowHintProp,
  showBindingsList: showBindingsListProp,
  showConvertPalette = true,
  readOnly = false,
  operators = [],
  onOperatorsChange,
  sourceTitle,
  targetTitle,
  selection: selectionProp,
  onSelectionChange: onSelectionChangeProp,
  preview,
  showPreview = true,
  showMinimap = true,
  onShowMinimapChange,
  includeHidden = false,
  onIncludeHiddenChange,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  flowActionsRef,
  labels: labelOverrides,
  t,
}: FieldRemapFlowMapperProps): JSX.Element {
  const chromeLabels = useMemo(
    () => resolveFieldRemapChromeLabels(labelOverrides, t),
    [labelOverrides, t],
  );
  const showFlowHint = !readOnly && (showFlowHintProp ?? chrome !== 'embed');
  const showBindingsList = showBindingsListProp ?? chrome !== 'embed';
  const showAuthoringPalette = showConvertPalette && !readOnly;
  const emptyDetail = emptyDetailProp ?? (chrome === 'embed' ? 'collapse' : 'hint');
  const mapperRef = useRef<HTMLDivElement>(null);
  const restoreMapperFocusRef = useRef(false);
  const [workspaceLayout, setWorkspaceLayout] = useState<'wide' | 'medium' | 'narrow'>('wide');
  const [internalSelection, setInternalSelection] = useState<FieldRemapSelection>(null);
  const authoritativeSelection = selectionProp !== undefined ? selectionProp : internalSelection;
  const selectionExternallyManaged =
    selectionProp !== undefined || onSelectionChangeProp !== undefined;
  const [bulkSelection, setBulkSelection] = useState<readonly FieldRemapBulkSelectionRef[]>(() => {
    const initial = asFieldRemapBulkSelectionRef(selectionProp ?? null);
    return initial ? normalizeFieldRemapBulkSelection(edges, [initial]) : [];
  });
  const selection = authoritativeSelection;
  const selectionRef = useRef(authoritativeSelection);
  selectionRef.current = authoritativeSelection;
  const setSelection = useCallback(
    (next: FieldRemapSelection) => {
      if (fieldRemapSelectionKey(selectionRef.current) === fieldRemapSelectionKey(next)) {
        return;
      }
      if (!selectionExternallyManaged) {
        setInternalSelection(next);
        const nextRef = asFieldRemapBulkSelectionRef(next);
        setBulkSelection(nextRef ? normalizeFieldRemapBulkSelection(edges, [nextRef]) : []);
      }
      onSelectionChangeProp?.(next);
    },
    [edges, onSelectionChangeProp, selectionExternallyManaged],
  );
  const setSelectionRef = useRef(setSelection);
  setSelectionRef.current = setSelection;
  const closeModalDetail = useCallback(() => setSelectionRef.current(null), []);
  const canonicalBulkRefs = useMemo(() => listFieldRemapBulkSelectionRefs(edges), [edges]);
  const bulkDomainKey = useMemo(
    () => fieldRemapBulkDomainKey(canonicalBulkRefs),
    [canonicalBulkRefs],
  );
  const bulkSelectionKeys = useMemo(
    () => new Set(bulkSelection.map(fieldRemapBulkSelectionKey)),
    [bulkSelection],
  );
  const authoritativeSelectionKey = fieldRemapSelectionKey(authoritativeSelection);
  const previousAuthoritativeSelectionKeyRef = useRef(authoritativeSelectionKey);
  const bulkFocusTargetsRef = useRef(
    new Map<string, Partial<Record<FieldRemapFocusSurface, FieldRemapFocusableElement>>>(),
  );
  const registerBulkFocusTarget = useCallback<RegisterFieldRemapFocusTarget>(
    (key, surface, element) => {
      const current = bulkFocusTargetsRef.current.get(key) ?? {};
      if (element) {
        current[surface] = element;
        bulkFocusTargetsRef.current.set(key, current);
        return;
      }
      delete current[surface];
      if (current.graph || current.list) {
        bulkFocusTargetsRef.current.set(key, current);
      } else {
        bulkFocusTargetsRef.current.delete(key);
      }
    },
    [],
  );
  const focusBulkTarget = useCallback(
    (ref: FieldRemapBulkSelectionRef, preferredSurface?: FieldRemapFocusSurface) => {
      const targets = bulkFocusTargetsRef.current.get(fieldRemapBulkSelectionKey(ref));
      const target =
        (preferredSurface ? targets?.[preferredSurface] : undefined) ??
        targets?.list ??
        targets?.graph;
      target?.focus({ preventScroll: true });
    },
    [],
  );
  const lastPrimaryCorrectionRef = useRef<string | undefined>(undefined);
  const pendingPrimaryCorrectionAckRef = useRef<
    { readonly domainKey: string; readonly selectionKey: string } | undefined
  >(undefined);
  const pendingBulkFocusRef = useRef<
    | {
        readonly domainKey: string;
        readonly target: FieldRemapBulkSelectionRef | null;
      }
    | undefined
  >(undefined);
  const pendingBulkCommitRef = useRef<
    | {
        readonly domainKey: string;
        readonly membership: readonly FieldRemapBulkSelectionRef[];
        readonly primary: FieldRemapSelection;
      }
    | undefined
  >(undefined);
  const previewVisible = showPreview && preview !== undefined && preview.status !== 'unavailable';
  const flowAriaLabelConfig = useMemo(
    () => ({
      'node.a11yDescription.default': readOnly
        ? 'Press Enter or Space to inspect this item. Control or Command toggles a non-primary item; Shift adds it.'
        : 'Press Enter or Space to select this item. Control or Command toggles a non-primary item; Shift adds it.',
      'node.a11yDescription.keyboardDisabled': readOnly
        ? 'Press Enter or Space to inspect this item. Workbench editing is read only.'
        : 'Press Enter or Space to select this item. Use the Workbench controls to edit it.',
      'edge.a11yDescription.default': readOnly
        ? 'Press Enter or Space to inspect this mapping. Control or Command toggles a non-primary mapping; Shift adds it.'
        : 'Press Enter or Space to select this mapping. Control or Command toggles a non-primary mapping; Shift adds it.',
    }),
    [readOnly],
  );
  const detailVisible = emptyDetail === 'hint' || selection !== null;
  const sideRailVisible = previewVisible || (detailPresentation === 'rail' && detailVisible);
  const [drafts, setDrafts] = useState<readonly FieldRemapDraftTransform[]>([]);
  const [draftPositions, setDraftPositions] = useState<ReadonlyMap<string, XYPosition>>(
    () => new Map(),
  );
  const [connectionFeedback, setConnectionFeedback] = useState<FieldRemapConnectionFeedback | null>(
    null,
  );
  const connectionAttemptCompletedRef = useRef(false);
  const [placeTransformId, setPlaceTransformId] = useState(() => {
    const first = transforms.list().find((definition) => definition.id !== 'identity');
    return first?.id ?? '';
  });
  const transformRegistrySignature = createTransformRegistrySignature(transforms);
  const { screenToFlowPosition } = useReactFlow();

  const removeDraftPosition = useCallback((localId: string) => {
    setDraftPositions((current) => {
      if (!current.has(localId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(localId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (detailPresentation === 'modal') {
      void loadFieldRemapModalDetail().catch(() => undefined);
    }
  }, [detailPresentation]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }
    setDrafts([]);
    setDraftPositions(new Map());
    setConnectionFeedback(null);
    connectionAttemptCompletedRef.current = false;
    if (selectionProp === undefined) {
      setInternalSelection((current) => (current?.kind === 'draft' ? null : current));
    }
  }, [readOnly, selectionProp]);

  useEffect(() => {
    let authoritativeReset: readonly FieldRemapBulkSelectionRef[] | undefined;
    if (previousAuthoritativeSelectionKeyRef.current !== authoritativeSelectionKey) {
      previousAuthoritativeSelectionKeyRef.current = authoritativeSelectionKey;
      lastPrimaryCorrectionRef.current = undefined;
      const pendingAck = pendingPrimaryCorrectionAckRef.current;
      const acceptsCorrection =
        pendingAck?.selectionKey === authoritativeSelectionKey &&
        (pendingAck.domainKey === bulkDomainKey ||
          pendingAck.domainKey === pendingBulkCommitRef.current?.domainKey);
      pendingPrimaryCorrectionAckRef.current = undefined;
      if (!acceptsCorrection) {
        pendingBulkCommitRef.current = undefined;
        const authoritativeRef = asFieldRemapBulkSelectionRef(authoritativeSelection);
        const next = authoritativeRef
          ? normalizeFieldRemapBulkSelection(edges, [authoritativeRef])
          : [];
        authoritativeReset = next;
        setBulkSelection((current) =>
          areFieldRemapBulkSelectionsEqual(current, next) ? current : next,
        );
        if (!authoritativeRef || next.length > 0) {
          return;
        }
      }
    }

    const pendingCommit = pendingBulkCommitRef.current;
    if (pendingCommit) {
      const primaryAccepted =
        fieldRemapSelectionKey(authoritativeSelection) ===
        fieldRemapSelectionKey(pendingCommit.primary);
      if (primaryAccepted || bulkDomainKey === pendingCommit.domainKey) {
        setBulkSelection((current) =>
          areFieldRemapBulkSelectionsEqual(current, pendingCommit.membership)
            ? current
            : pendingCommit.membership,
        );
      }
      if (bulkDomainKey !== pendingCommit.domainKey) {
        return;
      }
      pendingBulkCommitRef.current = undefined;
    }

    const primaryRef = asFieldRemapBulkSelectionRef(authoritativeSelection);
    if (!primaryRef) {
      setBulkSelection((current) => (current.length === 0 ? current : []));
      return;
    }

    const primaryKey = fieldRemapBulkSelectionKey(primaryRef);
    const primaryIsValid = canonicalBulkRefs.some(
      (ref) => fieldRemapBulkSelectionKey(ref) === primaryKey,
    );
    let next = authoritativeReset ?? normalizeFieldRemapBulkSelection(edges, bulkSelection);
    if (primaryIsValid && !next.some((ref) => fieldRemapBulkSelectionKey(ref) === primaryKey)) {
      next = normalizeFieldRemapBulkSelection(edges, [...next, primaryRef]);
    }
    setBulkSelection((current) =>
      areFieldRemapBulkSelectionsEqual(current, next) ? current : next,
    );

    if (primaryIsValid) {
      lastPrimaryCorrectionRef.current = undefined;
      return;
    }

    const nextPrimary = next[0] ?? null;
    const correctionKey = `${bulkDomainKey}\u0001${fieldRemapSelectionKey(authoritativeSelection)}\u0001${fieldRemapSelectionKey(nextPrimary)}`;
    if (lastPrimaryCorrectionRef.current === correctionKey) {
      return;
    }
    lastPrimaryCorrectionRef.current = correctionKey;
    pendingPrimaryCorrectionAckRef.current = onSelectionChangeProp
      ? {
          domainKey: bulkDomainKey,
          selectionKey: fieldRemapSelectionKey(nextPrimary),
        }
      : undefined;
    if (!selectionExternallyManaged) {
      setInternalSelection(nextPrimary);
    } else {
      setSelection(nextPrimary);
    }
  }, [
    bulkDomainKey,
    bulkSelection,
    canonicalBulkRefs,
    authoritativeSelectionKey,
    edges,
    onSelectionChangeProp,
    authoritativeSelection,
    selection,
    selectionExternallyManaged,
    setSelection,
  ]);

  useEffect(() => {
    if (!restoreMapperFocusRef.current || selection !== null || drafts.length > 0) {
      return;
    }
    restoreMapperFocusRef.current = false;
    mapperRef.current?.focus({ preventScroll: true });
  }, [drafts.length, selection]);

  useEffect(() => {
    const element = mapperRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateLayout = () => {
      const remSize = Number.parseFloat(getComputedStyle(element).fontSize) || 16;
      const width = element.getBoundingClientRect().width;
      if (width <= 0) {
        return;
      }
      const nextLayout =
        width <= 60 * remSize ? 'narrow' : width <= 68.75 * remSize ? 'medium' : 'wide';
      setWorkspaceLayout((current) => (current === nextLayout ? current : nextLayout));
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const graph = useMemo(
    () =>
      mappingToFlowGraph({
        sources,
        targets,
        edges,
        transforms,
        operators,
        sourceTitle,
        targetTitle,
        drafts,
        draftPositions,
      }),
    [
      sources,
      targets,
      edges,
      transforms,
      operators,
      sourceTitle,
      targetTitle,
      drafts,
      draftPositions,
      transformRegistrySignature,
    ],
  );

  const applyBulkSelectionGesture = useCallback(
    (
      target: FieldRemapBulkSelectionRef,
      modifiers: {
        readonly ctrlKey: boolean;
        readonly metaKey: boolean;
        readonly shiftKey: boolean;
      },
    ) => {
      pendingPrimaryCorrectionAckRef.current = undefined;
      const gesture =
        modifiers.ctrlKey || modifiers.metaKey ? 'toggle' : modifiers.shiftKey ? 'add' : 'plain';
      const next = updateFieldRemapBulkSelection({
        edges,
        membership: bulkSelection,
        primary: selection,
        target,
        gesture,
      });
      const primaryChanged =
        fieldRemapSelectionKey(next.primary) !== fieldRemapSelectionKey(selection);
      if (!primaryChanged || !selectionExternallyManaged) {
        setBulkSelection((current) =>
          areFieldRemapBulkSelectionsEqual(current, next.membership) ? current : next.membership,
        );
      }
      if (primaryChanged) {
        setSelection(next.primary);
      }
    },
    [bulkSelection, edges, selection, selectionExternallyManaged, setSelection],
  );

  const nodesWithSelection = useMemo(
    () =>
      graph.nodes.map((node) => {
        if (node.data.kind === 'transform') {
          const ref = {
            kind: 'transformStep',
            edgeId: node.data.mappingEdgeId,
            stepIndex: node.data.stepIndex,
          } as const;
          const selected = bulkSelectionKeys.has(fieldRemapBulkSelectionKey(ref));
          return {
            ...node,
            data: { ...node.data, selected, registerFocusTarget: registerBulkFocusTarget },
            selected,
            selectable: false,
            focusable: true,
            ariaRole: 'button' as const,
            ariaLabel: `${node.data.label} convert step`,
            domAttributes: {
              'aria-pressed': selected,
              'data-field-remap-bulk-kind': ref.kind,
              'data-field-remap-bulk-edge-id': ref.edgeId,
              'data-field-remap-bulk-step-index': ref.stepIndex,
            },
          };
        }
        if (node.data.kind === 'draft-transform') {
          const selected = selection?.kind === 'draft' && selection.localId === node.data.localId;
          return { ...node, selected };
        }
        if (node.data.kind === 'combine-operator' || node.data.kind === 'split-operator') {
          const selected =
            selection?.kind === 'operator' && selection.operatorId === node.data.operatorId;
          return { ...node, selected };
        }
        return node;
      }),
    [bulkSelectionKeys, graph.nodes, registerBulkFocusTarget, selection],
  );

  const flowEdgesWithSelection = useMemo(
    () =>
      graph.edges.map((edge) => {
        const data = edge.data as FieldRemapFlowEdgeData | undefined;
        const mappingEdgeId = data?.mappingEdgeId;
        const selected = mappingEdgeId
          ? bulkSelectionKeys.has(
              fieldRemapBulkSelectionKey({ kind: 'edge', edgeId: mappingEdgeId }),
            )
          : false;
        if (!mappingEdgeId) {
          return { ...edge, selected };
        }
        const canonicalSegment = data?.segment === 'direct' || data?.segment === 'in';
        return {
          ...edge,
          data: { ...data, registerFocusTarget: registerBulkFocusTarget },
          selected,
          selectable: false,
          focusable: canonicalSegment,
          ariaRole: canonicalSegment ? ('button' as const) : ('presentation' as const),
          ariaLabel: canonicalSegment ? `Mapping ${mappingEdgeId}` : undefined,
          domAttributes: canonicalSegment
            ? {
                'aria-pressed': selected,
                'data-field-remap-bulk-kind': 'edge',
                'data-field-remap-bulk-edge-id': mappingEdgeId,
              }
            : { 'aria-hidden': true },
        };
      }),
    [bulkSelectionKeys, graph.edges, registerBulkFocusTarget],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(flowEdgesWithSelection);
  const onProjectedNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes.filter((change) => change.type !== 'select'));
    },
    [onNodesChange],
  );
  const onProjectedFlowEdgesChange = useCallback(
    (changes: Parameters<typeof onFlowEdgesChange>[0]) => {
      onFlowEdgesChange(changes.filter((change) => change.type !== 'select'));
    },
    [onFlowEdgesChange],
  );

  // Depending directly on `nodesWithSelection` (a new array after each graph
  // calculation) re-enters XYFlow's StoreUpdater. The explicit signature keeps
  // that loop guard while still tracking every value copied into rendered nodes.
  const graphSyncKey = createFieldRemapGraphSyncKey({
    nodes: nodesWithSelection,
    edges: flowEdgesWithSelection,
    selection,
    transformRegistrySignature,
  });
  const nodesWithSelectionRef = useRef(nodesWithSelection);
  const graphEdgesRef = useRef(flowEdgesWithSelection);
  nodesWithSelectionRef.current = nodesWithSelection;
  graphEdgesRef.current = flowEdgesWithSelection;

  useEffect(() => {
    setNodes(nodesWithSelectionRef.current);
    setFlowEdges(graphEdgesRef.current);
  }, [graphSyncKey, setFlowEdges, setNodes]);

  useEffect(() => {
    const pending = pendingBulkFocusRef.current;
    const mapper = mapperRef.current;
    if (!pending || !mapper || pending.domainKey !== bulkDomainKey) {
      return;
    }
    pendingBulkFocusRef.current = undefined;
    if (!pending.target) {
      mapper.focus({ preventScroll: true });
      return;
    }
    const targets = bulkFocusTargetsRef.current.get(fieldRemapBulkSelectionKey(pending.target));
    (targets?.list ?? targets?.graph ?? mapper).focus({ preventScroll: true });
  }, [bulkDomainKey]);

  const connectionContext = useMemo(
    () => ({ sources, targets, edges, transforms, drafts, operators }),
    [sources, targets, edges, transforms, drafts, operators],
  );

  const conflicts = useMemo(
    () => parentChildConflicts ?? findParentChildMappingConflicts(edges, sources, targets),
    [edges, parentChildConflicts, sources, targets],
  );

  const publishConnectionFeedback = useCallback(
    (feedback: FieldRemapConnectionFeedback | null) => {
      setConnectionFeedback(feedback);
      onConnectionFeedback?.(feedback);
    },
    [onConnectionFeedback],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      !readOnly && isValidFieldRemapFlowConnection(connection, connectionContext),
    [connectionContext, readOnly],
  );

  const onConnectStart = useCallback(() => {
    if (readOnly) {
      return;
    }
    // Clearing at attempt start lets an identical later rejection be announced once at completion.
    connectionAttemptCompletedRef.current = false;
    setConnectionFeedback(null);
  }, [readOnly]);

  const onConnectEnd = useCallback(
    (_event: globalThis.MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (readOnly) {
        return;
      }
      if (connectionAttemptCompletedRef.current) {
        return;
      }
      connectionAttemptCompletedRef.current = true;
      const connection = connectionFromFinalState(state);
      if (!connection) {
        return;
      }
      const evaluation = evaluateFieldRemapFlowConnection(connection, connectionContext);
      if (evaluation.status === 'rejected') {
        publishConnectionFeedback({ reason: evaluation.reason });
      }
    },
    [connectionContext, publishConnectionFeedback, readOnly],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) {
        return;
      }
      if (!connection.source || !connection.target) {
        return;
      }
      const evaluation = evaluateFieldRemapFlowConnection(connection, connectionContext);
      if (evaluation.status === 'rejected') {
        return;
      }
      if (evaluation.status === 'rewire' && rewirePolicy === 'reject') {
        connectionAttemptCompletedRef.current = true;
        publishConnectionFeedback({
          reason: 'rewire-policy-rejected',
          impactedEdgeIds: evaluation.impactedEdgeIds,
        });
        return;
      }
      connectionAttemptCompletedRef.current = true;
      publishConnectionFeedback(null);

      const draftAsTarget = parseDraftTransformNodeId(connection.target);
      if (draftAsTarget && connection.sourceHandle) {
        const draft = drafts.find((item) => item.localId === draftAsTarget);
        if (!draft) {
          return;
        }
        const bound = bindDraftSource(draft, connection.sourceHandle);
        const finalized = finalizeDraftTransform(bound, {
          registry: transforms,
          sources,
          targets,
          existing: edges,
        });
        if (finalized) {
          const withoutTarget = edges.filter(
            (edge) => edge.targetSlotId !== finalized.targetSlotId,
          );
          onEdgesChange([...withoutTarget, finalized]);
          setDrafts(drafts.filter((item) => item.localId !== draft.localId));
          removeDraftPosition(draft.localId);
          setSelection({
            kind: 'transformStep',
            edgeId: finalized.id,
            stepIndex: 0,
          });
          return;
        }
        setDrafts(drafts.map((item) => (item.localId === draft.localId ? bound : item)));
        setSelection({ kind: 'draft', localId: draft.localId });
        return;
      }

      const draftAsSource = parseDraftTransformNodeId(connection.source);
      if (draftAsSource && connection.targetHandle) {
        const draft = drafts.find((item) => item.localId === draftAsSource);
        if (!draft) {
          return;
        }
        const bound = bindDraftTarget(draft, connection.targetHandle);
        const finalized = finalizeDraftTransform(bound, {
          registry: transforms,
          sources,
          targets,
          existing: edges,
        });
        if (finalized) {
          const withoutTarget = edges.filter(
            (edge) => edge.targetSlotId !== finalized.targetSlotId,
          );
          onEdgesChange([...withoutTarget, finalized]);
          setDrafts(drafts.filter((item) => item.localId !== draft.localId));
          removeDraftPosition(draft.localId);
          setSelection({
            kind: 'transformStep',
            edgeId: finalized.id,
            stepIndex: 0,
          });
          return;
        }
        setDrafts(drafts.map((item) => (item.localId === draft.localId ? bound : item)));
        setSelection({ kind: 'draft', localId: draft.localId });
        return;
      }

      const operatorAsTarget = parseOperatorNodeId(connection.target);
      if (operatorAsTarget && connection.sourceHandle && onOperatorsChange) {
        onOperatorsChange(
          updateMappingOperator(operators, operatorAsTarget, (operator) =>
            bindOperatorInput(operator, connection.sourceHandle!),
          ),
        );
        setSelection({ kind: 'operator', operatorId: operatorAsTarget });
        return;
      }

      const operatorAsSource = parseOperatorNodeId(connection.source);
      if (operatorAsSource && connection.targetHandle && onOperatorsChange) {
        onOperatorsChange(
          updateMappingOperator(operators, operatorAsSource, (operator) =>
            bindOperatorOutput(operator, connection.targetHandle!),
          ),
        );
        setSelection({ kind: 'operator', operatorId: operatorAsSource });
        return;
      }

      const result = applyFieldRemapFlowConnection({
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        existing: edges,
      });
      if (!result) {
        return;
      }
      const removeIds = new Set(result.removeEdgeIds ?? []);
      const withoutTarget = edges.filter(
        (edge) =>
          edge.targetSlotId !== result.edge.targetSlotId &&
          edge.id !== result.edge.id &&
          !removeIds.has(edge.id),
      );
      onEdgesChange([...withoutTarget, result.edge]);
      setSelection({ kind: 'edge', edgeId: result.edge.id });
    },
    [
      connectionContext,
      drafts,
      edges,
      onEdgesChange,
      onOperatorsChange,
      operators,
      publishConnectionFeedback,
      readOnly,
      removeDraftPosition,
      rewirePolicy,
      setSelection,
      sources,
      targets,
      transforms,
    ],
  );

  const commitBulkDelete = useCallback(
    (refs: readonly FieldRemapBulkSelectionRef[]): boolean => {
      const plan = planFieldRemapBulkDelete(edges, refs);
      if (plan.status !== 'changed') {
        return false;
      }

      const removedEdgeIds = new Set(
        refs.filter((ref) => ref.kind === 'edge').map((ref) => ref.edgeId),
      );
      const removedKeys = new Set(refs.map(fieldRemapBulkSelectionKey));
      let survivingMembership = normalizeFieldRemapBulkSelection(
        plan.edges,
        bulkSelection.filter(
          (ref) =>
            !removedKeys.has(fieldRemapBulkSelectionKey(ref)) && !removedEdgeIds.has(ref.edgeId),
        ),
      );
      const primaryRef = asFieldRemapBulkSelectionRef(selection);
      const primaryRemoved = primaryRef
        ? removedKeys.has(fieldRemapBulkSelectionKey(primaryRef)) ||
          removedEdgeIds.has(primaryRef.edgeId)
        : false;
      const preservesSingleStepFallback =
        refs.length === 1 &&
        refs[0]?.kind === 'transformStep' &&
        primaryRef?.kind === 'transformStep' &&
        fieldRemapBulkSelectionKey(refs[0]) === fieldRemapBulkSelectionKey(primaryRef);
      let nextPrimary = primaryRemoved ? (survivingMembership[0] ?? null) : selection;
      if (preservesSingleStepFallback) {
        const removedStep = refs[0] as Extract<
          FieldRemapBulkSelectionRef,
          { readonly kind: 'transformStep' }
        >;
        const nextEdge = plan.edges.find((edge) => edge.id === removedStep.edgeId);
        nextPrimary =
          (nextEdge?.transformIds?.length ?? 0) > 0
            ? {
                kind: 'transformStep',
                edgeId: removedStep.edgeId,
                stepIndex: Math.min(
                  removedStep.stepIndex,
                  (nextEdge?.transformIds?.length ?? 1) - 1,
                ),
              }
            : nextEdge
              ? { kind: 'edge', edgeId: nextEdge.id }
              : null;
        const fallbackRef = asFieldRemapBulkSelectionRef(nextPrimary);
        survivingMembership = fallbackRef
          ? normalizeFieldRemapBulkSelection(plan.edges, [fallbackRef])
          : [];
      }
      const nextDomainKey = fieldRemapBulkDomainKey(listFieldRemapBulkSelectionRefs(plan.edges));
      const primaryKeyChanged =
        fieldRemapSelectionKey(nextPrimary) !== fieldRemapSelectionKey(selection);

      pendingBulkCommitRef.current = {
        domainKey: nextDomainKey,
        membership: survivingMembership,
        primary: nextPrimary,
      };
      pendingBulkFocusRef.current = {
        domainKey: nextDomainKey,
        target: asFieldRemapBulkSelectionRef(nextPrimary) ?? null,
      };
      if (primaryKeyChanged) {
        lastPrimaryCorrectionRef.current = `${nextDomainKey}\u0001${fieldRemapSelectionKey(selection)}\u0001${fieldRemapSelectionKey(nextPrimary)}`;
        pendingPrimaryCorrectionAckRef.current = onSelectionChangeProp
          ? {
              domainKey: nextDomainKey,
              selectionKey: fieldRemapSelectionKey(nextPrimary),
            }
          : undefined;
      }
      onEdgesChange(plan.edges);

      if (primaryKeyChanged) {
        if (!selectionExternallyManaged) {
          setInternalSelection(nextPrimary);
        } else {
          onSelectionChangeProp?.(nextPrimary);
        }
      }
      return true;
    },
    [
      bulkSelection,
      edges,
      onEdgesChange,
      onSelectionChangeProp,
      selection,
      selectionExternallyManaged,
    ],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (readOnly) {
        return;
      }
      const mappingIds = new Set(
        deleted
          .map((edge) => {
            const data = edge.data as FieldRemapFlowEdgeData | undefined;
            return data?.mappingEdgeId;
          })
          .filter((id): id is string => typeof id === 'string'),
      );
      if (mappingIds.size === 0) {
        return;
      }
      commitBulkDelete([...mappingIds].map((edgeId) => ({ kind: 'edge' as const, edgeId })));
    },
    [commitBulkDelete, readOnly],
  );

  const placeDraft = useCallback(
    (transformId: string, position?: XYPosition) => {
      if (readOnly) {
        return;
      }
      const draft = createDraftTransform(transformId);
      setDrafts((current) => [...current, draft]);
      if (position) {
        setDraftPositions((current) => new Map(current).set(draft.localId, position));
      }
      setSelection({ kind: 'draft', localId: draft.localId });
      setPlaceTransformId(transformId);
    },
    [readOnly, setSelection],
  );

  const resolveDroppedTransformId = useCallback(
    (dataTransfer: DataTransfer) => {
      const transformId = readFieldRemapTransformDragData(dataTransfer);
      const definition = transformId ? transforms.get(transformId) : undefined;
      if (!transformId || transformId === 'identity' || definition?.id !== transformId) {
        return undefined;
      }
      return transformId;
    },
    [transforms],
  );

  const onCanvasDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (readOnly || !hasFieldRemapTransformDragType(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [readOnly],
  );

  const onCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (readOnly) {
        return;
      }
      const transformId = resolveDroppedTransformId(event.dataTransfer);
      if (!transformId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      placeDraft(transformId, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [placeDraft, readOnly, resolveDroppedTransformId, screenToFlowPosition],
  );

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      const data = node.data as FieldRemapFlowNodeData;
      if (data.kind === 'draft-transform') {
        setSelection({ kind: 'draft', localId: data.localId });
        return;
      }
      if (data.kind === 'combine-operator' || data.kind === 'split-operator') {
        if (!readOnly && event.altKey && onOperatorsChange) {
          onOperatorsChange(removeMappingOperator(operators, data.operatorId));
          if (selection?.kind === 'operator' && selection.operatorId === data.operatorId) {
            setSelection(null);
          }
          return;
        }
        setSelection({ kind: 'operator', operatorId: data.operatorId });
        return;
      }
      if (data.kind !== 'transform') {
        return;
      }
      const target = {
        kind: 'transformStep',
        edgeId: data.mappingEdgeId,
        stepIndex: data.stepIndex,
      } as const;
      if (!readOnly && event.altKey) {
        commitBulkDelete([target]);
        return;
      }
      applyBulkSelectionGesture(target, event);
      focusBulkTarget(target, 'graph');
    },
    [
      applyBulkSelectionGesture,
      commitBulkDelete,
      focusBulkTarget,
      onOperatorsChange,
      operators,
      readOnly,
      selection,
      setSelection,
    ],
  );

  const onEdgeClick = useCallback(
    (event: MouseEvent, edge: Edge) => {
      const mappingEdgeId = (edge.data as FieldRemapFlowEdgeData | undefined)?.mappingEdgeId;
      if (!mappingEdgeId) {
        return;
      }
      const target = { kind: 'edge', edgeId: mappingEdgeId } as const;
      applyBulkSelectionGesture(target, event);
      focusBulkTarget(target, 'graph');
    },
    [applyBulkSelectionGesture, focusBulkTarget],
  );

  const onBulkSelectionKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.defaultPrevented || event.altKey) {
        return;
      }
      const target = fieldRemapBulkRefFromKeyboardTarget(event.target);
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pendingPrimaryCorrectionAckRef.current = undefined;
      applyBulkSelectionGesture(target, event);
    },
    [applyBulkSelectionGesture],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        if (event.defaultPrevented || (selection === null && drafts.length === 0)) {
          return;
        }
        const mapper = mapperRef.current;
        const focused = mapper?.ownerDocument.activeElement;
        const detail = mapper?.querySelector<HTMLElement>(
          '[data-testid="field-remap-detail"], [data-testid="field-remap-convert-note"]',
        );
        const detailSeparator = mapper?.querySelector<HTMLElement>(
          '.workbench-field-remap-flow__canvas-detail-split > [role="separator"]',
        );
        restoreMapperFocusRef.current =
          detailPresentation === 'rail' &&
          emptyDetail === 'collapse' &&
          focused instanceof Element &&
          (detail?.contains(focused) === true ||
            (!previewVisible && detailSeparator?.contains(focused) === true));
        event.preventDefault();
        event.stopPropagation();
        setSelection(null);
        setDrafts([]);
        setDraftPositions(new Map());
        return;
      }

      if (readOnly) {
        return;
      }

      if (
        (event.key !== 'Delete' && event.key !== 'Backspace') ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.defaultPrevented ||
        isFieldRemapEditableShortcutTarget(event.target) ||
        selection === null
      ) {
        return;
      }

      let consumed = false;
      if (selection.kind === 'edge' || selection.kind === 'transformStep') {
        const primaryKey = fieldRemapBulkSelectionKey(selection);
        const refs = bulkSelection.some((ref) => fieldRemapBulkSelectionKey(ref) === primaryKey)
          ? bulkSelection
          : [...bulkSelection, selection];
        consumed = commitBulkDelete(refs);
      } else if (selection.kind === 'operator') {
        if (
          onOperatorsChange &&
          operators.some((operator) => operator.id === selection.operatorId)
        ) {
          onOperatorsChange(removeMappingOperator(operators, selection.operatorId));
          setSelection(null);
          consumed = true;
        }
      } else if (selection.kind === 'draft') {
        if (drafts.some((draft) => draft.localId === selection.localId)) {
          setDrafts((current) => current.filter((draft) => draft.localId !== selection.localId));
          removeDraftPosition(selection.localId);
          setSelection(null);
          consumed = true;
        }
      }

      if (consumed) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [
      drafts,
      bulkSelection,
      commitBulkDelete,
      detailPresentation,
      emptyDetail,
      onOperatorsChange,
      operators,
      previewVisible,
      readOnly,
      removeDraftPosition,
      selection,
      setSelection,
    ],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | globalThis.MouseEvent) => {
      onPaneContextMenu?.(event, { selection });
    },
    [onPaneContextMenu, selection],
  );

  const handleNodeContextMenu = useCallback(
    (event: MouseEvent, node: Node) => {
      onNodeContextMenu?.(event, { nodeId: node.id, selection });
    },
    [onNodeContextMenu, selection],
  );

  const handleEdgeContextMenu = useCallback(
    (event: MouseEvent, edge: Edge) => {
      onEdgeContextMenu?.(event, { edgeId: edge.id, selection });
    },
    [onEdgeContextMenu, selection],
  );

  const detailPanel = detailVisible ? (
    <FieldRemapDetailPanel
      selection={selection}
      edges={edges}
      sources={sources}
      targets={targets}
      transforms={transforms}
      readOnly={readOnly}
      onEdgesChange={onEdgesChange}
      onSelectionChange={setSelection}
      drafts={drafts}
      onDiscardDraft={(localId) => {
        setDrafts((current) => current.filter((item) => item.localId !== localId));
        removeDraftPosition(localId);
      }}
      operators={operators}
      onOperatorsChange={onOperatorsChange}
      emptyDetailTitle={
        readOnly ? chromeLabels.readOnlyEmptyDetailTitle : chromeLabels.emptyDetailTitle
      }
      emptyDetailDescription={
        readOnly ? chromeLabels.readOnlyEmptyDetailDescription : chromeLabels.emptyDetailDescription
      }
    />
  ) : null;

  return (
    <div
      ref={mapperRef}
      className="workbench-field-remap-flow"
      data-testid="field-remap-mapper"
      data-chrome={chrome}
      data-flow-hint={showFlowHint ? 'on' : 'off'}
      data-bindings-list={showBindingsList ? 'on' : 'off'}
      data-convert-palette={showAuthoringPalette ? 'on' : 'off'}
      data-read-only={readOnly ? 'true' : 'false'}
      data-empty-detail={emptyDetail}
      data-detail-presentation={detailPresentation}
      data-minimap={showMinimap ? 'on' : 'off'}
      data-hidden-fields={includeHidden ? 'on' : 'off'}
      data-preview={previewVisible ? 'on' : 'off'}
      tabIndex={-1}
      onKeyDownCapture={onBulkSelectionKeyDownCapture}
      onKeyDown={onKeyDown}
    >
      {showFlowHint ? (
        <p className="workbench-field-remap-mapper__hint" data-testid="field-remap-hint">
          Convert-first: pick a convert in the palette, place it, then wire source → draft → target.
          Select a convert note for the Convert editor; select a binding for lighter mapping detail.
          Use n→m actions to author combine/split. Alt-click removes a convert step or operator.
          Escape clears selection and unfinished drafts.
        </p>
      ) : null}

      {connectionFeedback ? (
        <p className="workbench-field-remap-demo__warn" role="status">
          {connectionFeedback.reason}
        </p>
      ) : null}

      {conflicts.length > 0 ? (
        <p className="workbench-field-remap-demo__warn" role="status">
          Warning: parent and child fields are both mapped (
          {conflicts.map((item) => `${item.parentId} / ${item.childId}`).join('; ')}). Prefer one
          level.
        </p>
      ) : null}

      <FieldRemapSplitWorkspace
        layout={workspaceLayout}
        reserveHiddenDetailSplit={detailPresentation === 'rail'}
        showConvertPalette={showAuthoringPalette}
        showDetail={sideRailVisible}
        surface={
          selection?.kind === 'transformStep'
            ? 'convert-note'
            : selection?.kind === 'draft'
              ? 'draft-convert'
              : selection?.kind === 'operator'
                ? 'operator'
                : 'binding'
        }
      >
        <>
          {showAuthoringPalette ? (
            <FieldRemapConvertPalette
              transforms={transforms}
              selectedTransformId={placeTransformId}
              onSelectedTransformIdChange={setPlaceTransformId}
              onPlaceDraft={placeDraft}
              chromeLabels={chromeLabels}
              onAddCombine={
                onOperatorsChange
                  ? () => {
                      const next = createCombineOperator();
                      onOperatorsChange([...operators, next]);
                      setSelection({ kind: 'operator', operatorId: next.id });
                    }
                  : undefined
              }
              onAddSplit={
                onOperatorsChange
                  ? () => {
                      const next = createSplitOperator();
                      onOperatorsChange([...operators, next]);
                      setSelection({ kind: 'operator', operatorId: next.id });
                    }
                  : undefined
              }
            />
          ) : null}
        </>

        <div className="workbench-field-remap-flow__canvas" data-testid="field-remap-flow">
          <ReactFlow
            nodes={nodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onProjectedNodesChange}
            onEdgesChange={onProjectedFlowEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onConnectStart={readOnly ? undefined : onConnectStart}
            onConnectEnd={readOnly ? undefined : onConnectEnd}
            onEdgesDelete={readOnly ? undefined : onEdgesDelete}
            onDragOver={onCanvasDragOver}
            onDrop={onCanvasDrop}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneContextMenu={onPaneContextMenu ? handlePaneContextMenu : undefined}
            onNodeContextMenu={onNodeContextMenu ? handleNodeContextMenu : undefined}
            onEdgeContextMenu={onEdgeContextMenu ? handleEdgeContextMenu : undefined}
            isValidConnection={isValidConnection}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            edgesReconnectable={!readOnly}
            elementsSelectable={false}
            ariaLabelConfig={flowAriaLabelConfig}
            deleteKeyCode={null}
            fitView
            fitViewOptions={DEFAULT_FIT_VIEW_OPTIONS}
            proOptions={{ hideAttribution: true }}
          >
            <FieldRemapFlowActionsBridge flowActionsRef={flowActionsRef} />
            <Background gap={16} color="var(--xy-background-pattern-color)" />
            <Controls showInteractive={false} fitViewOptions={DEFAULT_FIT_VIEW_OPTIONS}>
              {onShowMinimapChange ? (
                <ControlButton
                  aria-label={showMinimap ? chromeLabels.hideMinimap : chromeLabels.showMinimap}
                  className={
                    showMinimap
                      ? 'workbench-field-remap-flow__minimap-toggle is-active'
                      : 'workbench-field-remap-flow__minimap-toggle'
                  }
                  data-testid="field-remap-toggle-minimap"
                  title={showMinimap ? chromeLabels.hideMinimap : chromeLabels.showMinimap}
                  onClick={() => {
                    onShowMinimapChange(!showMinimap);
                  }}
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
                    <path d="M9 4v13.5" />
                    <path d="M15 6.5V20" />
                  </svg>
                </ControlButton>
              ) : null}
              {onIncludeHiddenChange ? (
                <ControlButton
                  aria-label={
                    includeHidden ? chromeLabels.hideHiddenFields : chromeLabels.showHiddenFields
                  }
                  aria-pressed={includeHidden}
                  className={
                    includeHidden
                      ? 'workbench-field-remap-flow__hidden-toggle is-active'
                      : 'workbench-field-remap-flow__hidden-toggle'
                  }
                  data-testid="field-remap-toggle-hidden-fields"
                  title={
                    includeHidden ? chromeLabels.hideHiddenFields : chromeLabels.showHiddenFields
                  }
                  onClick={() => {
                    onIncludeHiddenChange(!includeHidden);
                  }}
                >
                  {includeHidden ? (
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="16"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                      width="16"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="16"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                      width="16"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                      <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.2 4.4" />
                      <path d="M6.1 6.1C3.9 7.7 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
                    </svg>
                  )}
                </ControlButton>
              ) : null}
            </Controls>
            {showMinimap ? (
              <MiniMap
                pannable
                zoomable
                bgColor="var(--xy-minimap-background-color)"
                maskColor="var(--xy-minimap-mask-background-color)"
                nodeColor={(node) => {
                  const kind = (node.data as FieldRemapFlowNodeData | undefined)?.kind;
                  if (kind === 'source-object') {
                    return 'var(--vscode-charts-blue, #3794ff)';
                  }
                  if (kind === 'target-object') {
                    return 'var(--vscode-charts-green, #89d185)';
                  }
                  return 'var(--vscode-focusBorder, var(--color-accent, #3794ff))';
                }}
                nodeStrokeColor="var(--xy-minimap-node-stroke-color)"
              />
            ) : null}
          </ReactFlow>
        </div>

        <div className="workbench-field-remap-flow__side-rail">
          {detailPresentation === 'rail' ? detailPanel : null}
          {previewVisible && preview ? (
            <FieldRemapPreviewRail
              preview={preview}
              selection={selection}
              edges={edges}
              operatorExists={
                selection?.kind === 'operator'
                  ? operators.some((operator) => operator.id === selection.operatorId)
                  : false
              }
              labels={chromeLabels}
            />
          ) : null}
        </div>
      </FieldRemapSplitWorkspace>

      {detailPresentation === 'modal' && selection !== null ? (
        <Suspense fallback={null}>
          <FieldRemapModalDetail
            closeLabel={chromeLabels.closeDetailModal ?? 'Close details'}
            title={chromeLabels.detailModalTitle ?? 'Mapping details'}
            onClose={closeModalDetail}
          >
            {detailPanel}
          </FieldRemapModalDetail>
        </Suspense>
      ) : null}

      {showBindingsList ? (
        <div className="workbench-field-remap-flow__bindings" data-testid="field-remap-edges">
          <h4>{chromeLabels.bindingsTitle}</h4>
          <ul>
            {edges.map((edge) => {
              const portTypes = edgePortTypes(edge, sources, targets);
              const appendCatalog = listCompatibleTransforms({
                registry: transforms,
                edge,
                stepIndex: edge.transformIds?.length ?? 0,
                sourceType: portTypes.sourceType,
                targetType: portTypes.targetType,
                mode: 'append',
              });
              const defaultAddId = appendCatalog[0]?.id;
              const listContext = canEditListContext(edge, sources, targets);
              const edgeRef = { kind: 'edge', edgeId: edge.id } as const;
              const edgeKey = fieldRemapBulkSelectionKey(edgeRef);
              const edgeSelected = bulkSelectionKeys.has(edgeKey);
              const visibleRemoveRefs = edgeSelected ? bulkSelection : [edgeRef];
              const laneSelected = canonicalBulkRefs.some(
                (ref) =>
                  ref.edgeId === edge.id && bulkSelectionKeys.has(fieldRemapBulkSelectionKey(ref)),
              );
              const edgeIsPrimary = selection?.kind === 'edge' && selection.edgeId === edge.id;

              return (
                <li
                  key={edge.id}
                  className={laneSelected ? 'is-selected' : undefined}
                  data-testid={`field-remap-lane-${edge.id}`}
                >
                  <button
                    ref={(element) => registerBulkFocusTarget(edgeKey, 'list', element)}
                    type="button"
                    aria-pressed={edgeSelected}
                    className={
                      edgeSelected
                        ? 'workbench-field-remap-flow__binding-select is-selected'
                        : 'workbench-field-remap-flow__binding-select'
                    }
                    data-field-remap-bulk-edge-id={edge.id}
                    data-field-remap-bulk-kind="edge"
                    data-primary={edgeIsPrimary ? 'true' : 'false'}
                    data-testid={`field-remap-select-edge-${edge.id}`}
                    onClick={(event) => applyBulkSelectionGesture(edgeRef, event)}
                  >
                    <code>
                      {edge.sourceFieldId} →{' '}
                      {(edge.transformIds ?? []).length > 0
                        ? `${(edge.transformIds ?? []).join(' → ')} → `
                        : ''}
                      {edge.targetSlotId}
                      {edge.itemEdges ? ` · ${edge.itemEdges.length} item fields` : ''}
                    </code>
                  </button>
                  {!readOnly ? (
                    <span className="workbench-field-remap-mapper__edge-actions">
                      {(edge.transformIds?.length ?? 0) < MAX_TRANSFORM_CHAIN && defaultAddId ? (
                        <IconButton
                          compact
                          type="button"
                          data-testid={`field-remap-add-node-${edge.id}`}
                          icon="codicon-add"
                          label={chromeLabels.addTransform}
                          onClick={() => {
                            const next = addTransformStepToEdge(edge, defaultAddId, {
                              registry: transforms,
                              sourceType: portTypes.sourceType,
                              targetType: portTypes.targetType,
                            });
                            if (!next) {
                              return;
                            }
                            onEdgesChange(edges.map((item) => (item.id === edge.id ? next : item)));
                            setSelection({
                              kind: 'transformStep',
                              edgeId: edge.id,
                              stepIndex: (next.transformIds?.length ?? 1) - 1,
                            });
                          }}
                        />
                      ) : null}
                      {listContext ? (
                        <IconButton
                          compact
                          type="button"
                          data-testid={`field-remap-edit-items-${edge.id}`}
                          icon="codicon-edit"
                          label={chromeLabels.editItems}
                          onClick={() => {
                            if (!edge.itemEdges) {
                              onEdgesChange(
                                edges.map((item) =>
                                  item.id === edge.id ? enableListContextOnEdge(item) : item,
                                ),
                              );
                            }
                            setSelection({ kind: 'edge', edgeId: edge.id });
                          }}
                        />
                      ) : null}
                      <IconButton
                        compact
                        type="button"
                        data-testid={`field-remap-remove-edge-${edge.id}`}
                        icon="codicon-trash"
                        label={
                          visibleRemoveRefs.length > 1
                            ? `Remove ${visibleRemoveRefs.length} selected items`
                            : chromeLabels.removeBinding
                        }
                        variant="danger"
                        onClick={() => {
                          commitBulkDelete(visibleRemoveRefs);
                        }}
                      />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * React Flow mapper: multi-port source object → convert notes → multi-port target object.
 * Selection gates the side rail: binding detail vs dedicated Convert note editor.
 */
export function FieldRemapFlowMapper(props: FieldRemapFlowMapperProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <FieldRemapFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
