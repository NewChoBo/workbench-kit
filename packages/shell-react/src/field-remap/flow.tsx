import { useCallback, useEffect, useMemo, useState, type JSX, type KeyboardEvent, type MouseEvent } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge, Button } from '@workbench-kit/react/primitives';
import {
  MAX_TRANSFORM_CHAIN,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { FieldRemapDetailPanel } from './detail-panel.js';
import {
  connectionToMappingEdge,
  isValidFieldRemapFlowConnection,
  mappingToFlowGraph,
  type FieldRemapFlowEdgeData,
  type FieldRemapFlowNodeData,
  type FieldRemapSourceObjectNodeData,
  type FieldRemapTargetObjectNodeData,
  type FieldRemapTransformNodeData,
} from './flow-adapter.js';
import {
  addTransformStepToEdge,
  canEditListContext,
  edgePortTypes,
  enableListContextOnEdge,
  listCompatibleTransforms,
  removeTransformStepFromEdge,
  type FieldRemapSelection,
} from './flow-ops.js';

function TypeBadge({ dataType }: { readonly dataType?: string }): JSX.Element | null {
  if (dataType !== 'object' && dataType !== 'array') {
    return null;
  }
  return <Badge variant="muted">{dataType}</Badge>;
}

function SourceObjectNode({ data }: NodeProps<Node<FieldRemapSourceObjectNodeData>>): JSX.Element {
  return (
    <div className="workbench-field-remap-flow-node workbench-field-remap-flow-node--object workbench-field-remap-flow-node--source">
      <div className="workbench-field-remap-flow-node__header">
        <strong>{data.title}</strong>
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
    <div className="workbench-field-remap-flow-node workbench-field-remap-flow-node--object workbench-field-remap-flow-node--target">
      <div className="workbench-field-remap-flow-node__header">
        <strong>{data.title}</strong>
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

const nodeTypes = {
  fieldRemapSourceObject: SourceObjectNode,
  fieldRemapTargetObject: TargetObjectNode,
  fieldRemapTransform: TransformNode,
};

export interface FieldRemapFlowMapperProps {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
  readonly sourceTitle?: string | undefined;
  readonly targetTitle?: string | undefined;
  readonly selection?: FieldRemapSelection | undefined;
  readonly onSelectionChange?: ((next: FieldRemapSelection) => void) | undefined;
}

function FieldRemapFlowCanvas({
  sources,
  targets,
  edges,
  transforms,
  onEdgesChange,
  sourceTitle,
  targetTitle,
  selection: selectionProp,
  onSelectionChange: onSelectionChangeProp,
}: FieldRemapFlowMapperProps): JSX.Element {
  const [internalSelection, setInternalSelection] = useState<FieldRemapSelection>(null);
  const selection = selectionProp !== undefined ? selectionProp : internalSelection;
  const setSelection = onSelectionChangeProp ?? setInternalSelection;

  const graph = useMemo(
    () =>
      mappingToFlowGraph({
        sources,
        targets,
        edges,
        transforms,
        sourceTitle,
        targetTitle,
      }),
    [sources, targets, edges, transforms, sourceTitle, targetTitle],
  );

  const nodesWithSelection = useMemo(
    () =>
      graph.nodes.map((node) => {
        if (node.data.kind !== 'transform') {
          return node;
        }
        const selected =
          selection?.kind === 'transformStep' &&
          selection.edgeId === node.data.mappingEdgeId &&
          selection.stepIndex === node.data.stepIndex;
        return {
          ...node,
          data: { ...node.data, selected },
          selected,
        };
      }),
    [graph.nodes, selection],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(nodesWithSelection);
    setFlowEdges(graph.edges);
  }, [graph.edges, nodesWithSelection, setNodes, setFlowEdges]);

  const connectionContext = useMemo(
    () => ({ sources, targets, edges, transforms }),
    [sources, targets, edges, transforms],
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
      const next = connectionToMappingEdge({
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        existing: edges,
      });
      if (!next) {
        return;
      }
      const withoutTarget = edges.filter((edge) => edge.targetSlotId !== next.targetSlotId);
      onEdgesChange([...withoutTarget, next]);
      setSelection({ kind: 'edge', edgeId: next.id });
    },
    [connectionContext, edges, onEdgesChange, setSelection],
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
      if (selection && mappingIds.has(selection.edgeId)) {
        setSelection(null);
      }
    },
    [edges, onEdgesChange, selection, setSelection],
  );

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      const data = node.data as FieldRemapFlowNodeData;
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
    [edges, onEdgesChange, setSelection],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        setSelection(null);
      }
    },
    [setSelection],
  );

  return (
    <div
      className="workbench-field-remap-flow"
      data-testid="field-remap-mapper"
      onKeyDown={onKeyDown}
    >
      <p className="workbench-field-remap-mapper__hint" data-testid="field-remap-hint">
        Drag a left field to a right field. Select a transform node (or binding) to edit step id
        and options. Use the transform palette to add a chosen step. Alt-click removes a step.
        Escape clears selection.
      </p>

      <div className="workbench-field-remap-flow__workspace">
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
            isValidConnection={isValidConnection}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 1.15 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color="var(--xy-background-pattern-color)" />
            <Controls showInteractive={false} />
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
          </ReactFlow>
        </div>

        <FieldRemapDetailPanel
          selection={selection}
          edges={edges}
          sources={sources}
          targets={targets}
          transforms={transforms}
          onEdgesChange={onEdgesChange}
          onSelectionChange={setSelection}
        />
      </div>

      <div className="workbench-field-remap-flow__bindings" data-testid="field-remap-edges">
        <h4>Bindings</h4>
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
            const selected = selection?.edgeId === edge.id;

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
                    <Button
                      compact
                      type="button"
                      data-testid={`field-remap-add-node-${edge.id}`}
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
                    >
                      + node
                    </Button>
                  ) : null}
                  {listContext ? (
                    <Button
                      compact
                      type="button"
                      data-testid={`field-remap-edit-items-${edge.id}`}
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
                    >
                      Edit items
                    </Button>
                  ) : null}
                  <Button
                    compact
                    type="button"
                    onClick={() => {
                      onEdgesChange(edges.filter((item) => item.id !== edge.id));
                      if (selection?.edgeId === edge.id) {
                        setSelection(null);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * React Flow mapper: multi-port source object → transforms → multi-port target object.
 * Includes a selection-driven detail panel (step id, options, list context).
 */
export function FieldRemapFlowMapper(props: FieldRemapFlowMapperProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <FieldRemapFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
