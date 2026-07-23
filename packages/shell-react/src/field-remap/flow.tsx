import { useCallback, useEffect, useMemo, type JSX, type MouseEvent } from 'react';
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

import {
  connectionToMappingEdge,
  mappingToFlowGraph,
  SOURCE_OBJECT_NODE_ID,
  TARGET_OBJECT_NODE_ID,
  type FieldRemapFlowEdgeData,
  type FieldRemapFlowNodeData,
  type FieldRemapSourceObjectNodeData,
  type FieldRemapTargetObjectNodeData,
  type FieldRemapTransformNodeData,
} from './flow-adapter.js';

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
    <div className="workbench-field-remap-flow-node workbench-field-remap-flow-node--transform">
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
}

function FieldRemapFlowCanvas({
  sources,
  targets,
  edges,
  transforms,
  onEdgesChange,
  sourceTitle,
  targetTitle,
}: FieldRemapFlowMapperProps): JSX.Element {
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

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setFlowEdges(graph.edges);
  }, [graph, setNodes, setFlowEdges]);

  const catalog = useMemo(
    () => transforms.list().filter((item) => item.id !== 'identity'),
    [transforms],
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const source = connection.source;
    const target = connection.target;
    if (!source || !target) {
      return false;
    }
    // Object port → object port (fan-out from one source field to many targets).
    if (source === SOURCE_OBJECT_NODE_ID && target === TARGET_OBJECT_NODE_ID) {
      return Boolean(connection.sourceHandle && connection.targetHandle);
    }
    // Object port → transform in
    if (source === SOURCE_OBJECT_NODE_ID && target.startsWith('xf:')) {
      return Boolean(connection.sourceHandle);
    }
    // Transform out → object port
    if (source.startsWith('xf:') && target === TARGET_OBJECT_NODE_ID) {
      return Boolean(connection.targetHandle);
    }
    // Transform chain mid-links
    if (source.startsWith('xf:') && target.startsWith('xf:')) {
      return true;
    }
    return false;
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
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
    },
    [edges, onEdgesChange],
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
    },
    [edges, onEdgesChange],
  );

  const addTransform = (mappingEdgeId: string, transformId: string) => {
    onEdgesChange(
      edges.map((edge) => {
        if (edge.id !== mappingEdgeId) {
          return edge;
        }
        const current = edge.transformIds ?? [];
        if (current.length >= MAX_TRANSFORM_CHAIN) {
          return edge;
        }
        return { ...edge, transformIds: [...current, transformId] };
      }),
    );
  };

  const removeTransformStep = (mappingEdgeId: string, stepIndex: number) => {
    onEdgesChange(
      edges.map((edge) => {
        if (edge.id !== mappingEdgeId) {
          return edge;
        }
        const next = [...(edge.transformIds ?? [])];
        next.splice(stepIndex, 1);
        const optionSteps = edge.transformOptionSteps ? [...edge.transformOptionSteps] : undefined;
        if (optionSteps) {
          optionSteps.splice(stepIndex, 1);
        }
        return {
          ...edge,
          transformIds: next.length > 0 ? next : undefined,
          transformOptionSteps: optionSteps && optionSteps.length > 0 ? optionSteps : undefined,
        };
      }),
    );
  };

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      const data = node.data as FieldRemapFlowNodeData;
      if (data.kind !== 'transform') {
        return;
      }
      if (_event.altKey) {
        removeTransformStep(data.mappingEdgeId, data.stepIndex);
      }
    },
    [edges, onEdgesChange],
  );

  const defaultTransformId = catalog[0]?.id ?? 'string:trim';

  return (
    <div className="workbench-field-remap-flow" data-testid="field-remap-mapper">
      <p className="workbench-field-remap-mapper__hint" data-testid="field-remap-hint">
        Each object/table is one node with field ports. Drag a left field to a right field (one
        source can fan out to many targets). Middle nodes are transforms (Alt-click to remove).
      </p>

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

      <div className="workbench-field-remap-flow__bindings" data-testid="field-remap-edges">
        <h4>Bindings</h4>
        <ul>
          {edges.map((edge) => (
            <li key={edge.id} data-testid={`field-remap-lane-${edge.id}`}>
              <code>
                {edge.sourceFieldId} →{' '}
                {(edge.transformIds ?? []).length > 0
                  ? `${(edge.transformIds ?? []).join(' → ')} → `
                  : ''}
                {edge.targetSlotId}
              </code>
              <span className="workbench-field-remap-mapper__edge-actions">
                {(edge.transformIds?.length ?? 0) < MAX_TRANSFORM_CHAIN ? (
                  <Button
                    compact
                    type="button"
                    data-testid={`field-remap-add-node-${edge.id}`}
                    onClick={() => addTransform(edge.id, defaultTransformId)}
                  >
                    + node
                  </Button>
                ) : null}
                <Button
                  compact
                  type="button"
                  onClick={() => onEdgesChange(edges.filter((item) => item.id !== edge.id))}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * React Flow mapper: multi-port source object → transforms → multi-port target object.
 */
export function FieldRemapFlowMapper(props: FieldRemapFlowMapperProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <FieldRemapFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
