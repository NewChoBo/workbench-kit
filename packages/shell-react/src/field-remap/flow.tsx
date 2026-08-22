import {
  Children,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
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
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge, IconButton } from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/split-view';
import {
  MAX_TRANSFORM_CHAIN,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { FieldRemapConvertPalette } from './convert-palette.js';
import {
  resolveFieldRemapChromeLabels,
  type FieldRemapChromeLabels,
  type FieldRemapTranslate,
} from './chrome-labels.js';
import { FieldRemapDetailPanel } from './detail-panel.js';
import {
  applyFieldRemapFlowConnection,
  isValidFieldRemapFlowConnection,
  mappingToFlowGraph,
  parseDraftTransformNodeId,
  parseOperatorNodeId,
  type FieldRemapCombineOperatorNodeData,
  type FieldRemapDraftTransformNodeData,
  type FieldRemapFlowEdgeData,
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
  listCompatibleTransforms,
  removeMappingOperator,
  removeTransformStepFromEdge,
  updateMappingOperator,
  type FieldRemapDraftTransform,
  type FieldRemapSelection,
} from './flow-ops.js';
import { FieldRemapPreviewRail, type FieldRemapPreviewState } from './preview.js';
import './view.css';

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
  return (
    <div
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
  /**
   * `card` preserves the demo chrome. `embed` omits the flow hint and binding list;
   * explicit `show*` props below take precedence.
   */
  readonly chrome?: 'card' | 'embed' | undefined;
  /** Show the empty-selection detail hint, or collapse that rail until a selection exists. */
  readonly emptyDetail?: 'hint' | 'collapse' | undefined;
  /** Show the convert-first hint. Defaults to true for `card`, false for `embed`. */
  readonly showFlowHint?: boolean | undefined;
  /** Show the bottom binding list. Defaults to true for `card`, false for `embed`. */
  readonly showBindingsList?: boolean | undefined;
  /**
   * Mount the primary Convert palette. Defaults to true for both chrome modes; when false,
   * the workspace expands without leaving an empty grid track.
   */
  readonly showConvertPalette?: boolean | undefined;
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

interface FieldRemapSplitWorkspaceProps {
  readonly children: ReactNode;
  readonly layout: 'wide' | 'medium' | 'narrow';
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
  const canvasWithDetail = (
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
  chrome = 'card',
  emptyDetail: emptyDetailProp,
  showFlowHint: showFlowHintProp,
  showBindingsList: showBindingsListProp,
  showConvertPalette = true,
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
  const showFlowHint = showFlowHintProp ?? chrome !== 'embed';
  const showBindingsList = showBindingsListProp ?? chrome !== 'embed';
  const emptyDetail = emptyDetailProp ?? (chrome === 'embed' ? 'collapse' : 'hint');
  const mapperRef = useRef<HTMLDivElement>(null);
  const [workspaceLayout, setWorkspaceLayout] = useState<'wide' | 'medium' | 'narrow'>('wide');
  const [internalSelection, setInternalSelection] = useState<FieldRemapSelection>(null);
  const selection = selectionProp !== undefined ? selectionProp : internalSelection;
  const setSelection = onSelectionChangeProp ?? setInternalSelection;
  const previewVisible = showPreview && preview !== undefined && preview.status !== 'unavailable';
  const [drafts, setDrafts] = useState<readonly FieldRemapDraftTransform[]>([]);
  const [placeTransformId, setPlaceTransformId] = useState(() => {
    const first = transforms.list().find((definition) => definition.id !== 'identity');
    return first?.id ?? '';
  });
  const transformRegistrySignature = createTransformRegistrySignature(transforms);

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
      transformRegistrySignature,
    ],
  );

  const nodesWithSelection = useMemo(
    () =>
      graph.nodes.map((node) => {
        if (node.data.kind === 'transform') {
          const selected =
            selection?.kind === 'transformStep' &&
            selection.edgeId === node.data.mappingEdgeId &&
            selection.stepIndex === node.data.stepIndex;
          return {
            ...node,
            data: { ...node.data, selected },
            selected,
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
    [graph.nodes, selection],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(graph.edges);

  // Depending directly on `nodesWithSelection` (a new array after each graph
  // calculation) re-enters XYFlow's StoreUpdater. The explicit signature keeps
  // that loop guard while still tracking every value copied into rendered nodes.
  const graphSyncKey = createFieldRemapGraphSyncKey({
    nodes: nodesWithSelection,
    edges: graph.edges,
    selection,
    transformRegistrySignature,
  });
  const nodesWithSelectionRef = useRef(nodesWithSelection);
  const graphEdgesRef = useRef(graph.edges);
  nodesWithSelectionRef.current = nodesWithSelection;
  graphEdgesRef.current = graph.edges;

  useEffect(() => {
    setNodes(nodesWithSelectionRef.current);
    setFlowEdges(graphEdgesRef.current);
  }, [graphSyncKey, setFlowEdges, setNodes]);

  const connectionContext = useMemo(
    () => ({ sources, targets, edges, transforms, drafts, operators }),
    [sources, targets, edges, transforms, drafts, operators],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidFieldRemapFlowConnection(connection, connectionContext),
    [connectionContext],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }
      if (!isValidFieldRemapFlowConnection(connection, connectionContext)) {
        return;
      }

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
      setSelection,
      sources,
      targets,
      transforms,
    ],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
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
      onEdgesChange(edges.filter((edge) => !mappingIds.has(edge.id)));
      if (
        selection &&
        (selection.kind === 'edge' || selection.kind === 'transformStep') &&
        mappingIds.has(selection.edgeId)
      ) {
        setSelection(null);
      }
    },
    [edges, onEdgesChange, selection, setSelection],
  );

  const placeDraft = useCallback(
    (transformId: string) => {
      const draft = createDraftTransform(transformId);
      setDrafts((current) => [...current, draft]);
      setSelection({ kind: 'draft', localId: draft.localId });
      setPlaceTransformId(transformId);
    },
    [setSelection],
  );

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      const data = node.data as FieldRemapFlowNodeData;
      if (data.kind === 'draft-transform') {
        setSelection({ kind: 'draft', localId: data.localId });
        return;
      }
      if (data.kind === 'combine-operator' || data.kind === 'split-operator') {
        if (event.altKey && onOperatorsChange) {
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
      if (event.altKey) {
        const edge = edges.find((item) => item.id === data.mappingEdgeId);
        if (!edge) {
          return;
        }
        const next = removeTransformStepFromEdge(edge, data.stepIndex);
        onEdgesChange(edges.map((item) => (item.id === edge.id ? next : item)));
        setSelection(
          (next.transformIds?.length ?? 0) > 0
            ? {
                kind: 'transformStep',
                edgeId: edge.id,
                stepIndex: Math.min(data.stepIndex, (next.transformIds?.length ?? 1) - 1),
              }
            : { kind: 'edge', edgeId: edge.id },
        );
        return;
      }
      setSelection({
        kind: 'transformStep',
        edgeId: data.mappingEdgeId,
        stepIndex: data.stepIndex,
      });
    },
    [edges, onEdgesChange, onOperatorsChange, operators, selection, setSelection],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        setSelection(null);
        setDrafts([]);
      }
    },
    [setSelection],
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

  return (
    <div
      ref={mapperRef}
      className="workbench-field-remap-flow"
      data-testid="field-remap-mapper"
      data-chrome={chrome}
      data-flow-hint={showFlowHint ? 'on' : 'off'}
      data-bindings-list={showBindingsList ? 'on' : 'off'}
      data-convert-palette={showConvertPalette ? 'on' : 'off'}
      data-empty-detail={emptyDetail}
      data-minimap={showMinimap ? 'on' : 'off'}
      data-hidden-fields={includeHidden ? 'on' : 'off'}
      data-preview={previewVisible ? 'on' : 'off'}
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

      <FieldRemapSplitWorkspace
        layout={workspaceLayout}
        showConvertPalette={showConvertPalette}
        showDetail={emptyDetail === 'hint' || selection !== null || previewVisible}
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
          {showConvertPalette ? (
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
            onNodesChange={onNodesChange}
            onEdgesChange={onFlowEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={onNodeClick}
            onPaneContextMenu={onPaneContextMenu ? handlePaneContextMenu : undefined}
            onNodeContextMenu={onNodeContextMenu ? handleNodeContextMenu : undefined}
            onEdgeContextMenu={onEdgeContextMenu ? handleEdgeContextMenu : undefined}
            isValidConnection={isValidConnection}
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
          {emptyDetail === 'hint' || selection !== null ? (
            <FieldRemapDetailPanel
              selection={selection}
              edges={edges}
              sources={sources}
              targets={targets}
              transforms={transforms}
              onEdgesChange={onEdgesChange}
              onSelectionChange={setSelection}
              drafts={drafts}
              onDiscardDraft={(localId) => {
                setDrafts((current) => current.filter((item) => item.localId !== localId));
              }}
              operators={operators}
              onOperatorsChange={onOperatorsChange}
              emptyDetailTitle={chromeLabels.emptyDetailTitle}
              emptyDetailDescription={chromeLabels.emptyDetailDescription}
            />
          ) : null}
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
              const selected =
                (selection?.kind === 'edge' || selection?.kind === 'transformStep') &&
                selection.edgeId === edge.id;

              return (
                <li
                  key={edge.id}
                  className={selected ? 'is-selected' : undefined}
                  data-testid={`field-remap-lane-${edge.id}`}
                >
                  <button
                    type="button"
                    className="workbench-field-remap-flow__binding-select"
                    data-testid={`field-remap-select-edge-${edge.id}`}
                    onClick={() => setSelection({ kind: 'edge', edgeId: edge.id })}
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
                      label={chromeLabels.removeBinding}
                      variant="danger"
                      onClick={() => {
                        onEdgesChange(edges.filter((item) => item.id !== edge.id));
                        if (
                          selection &&
                          (selection.kind === 'edge' || selection.kind === 'transformStep') &&
                          selection.edgeId === edge.id
                        ) {
                          setSelection(null);
                        }
                      }}
                    />
                  </span>
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
