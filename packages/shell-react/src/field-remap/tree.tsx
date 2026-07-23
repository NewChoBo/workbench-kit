import { useMemo, useState, type JSX } from 'react';
import { Badge, Button } from '@workbench-kit/react/primitives';
import type { MappingEdge, SourceField, TargetSlot } from '@workbench-kit/field-remap';

type TreeSide = 'source' | 'target';

interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly path?: string;
  readonly dataType?: string;
  readonly children?: readonly TreeNode[];
}

function sourceToNode(field: SourceField): TreeNode {
  return {
    id: field.id,
    label: field.label,
    path: field.path,
    dataType: field.dataType,
    children: field.children?.map(sourceToNode),
  };
}

function targetToNode(slot: TargetSlot): TreeNode {
  return {
    id: slot.id,
    label: slot.label,
    path: slot.path,
    dataType: slot.dataType,
    children: slot.children?.map(targetToNode),
  };
}

function findNode(nodes: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const nested = findNode(node.children, id);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function typeBadge(dataType: string | undefined): string | null {
  if (dataType === 'object' || dataType === 'array') {
    return dataType;
  }
  return null;
}

interface FieldTreeProps {
  readonly title: string;
  readonly nodes: readonly TreeNode[];
  readonly selectedId: string | null;
  readonly mappedIds: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
  readonly side: TreeSide;
}

function FieldTree({
  title,
  nodes,
  selectedId,
  mappedIds,
  onSelect,
  side,
}: FieldTreeProps): JSX.Element {
  return (
    <div className="workbench-field-remap-tree" data-side={side}>
      <h4 className="workbench-field-remap-tree__title">{title}</h4>
      <ul className="workbench-field-remap-tree__list" role="tree">
        {nodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            mappedIds={mappedIds}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  mappedIds,
  onSelect,
}: {
  readonly node: TreeNode;
  readonly depth: number;
  readonly selectedId: string | null;
  readonly mappedIds: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const badge = typeBadge(node.dataType);
  const selected = selectedId === node.id;
  const mapped = mappedIds.has(node.id);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className={[
          'workbench-field-remap-tree__row',
          selected ? 'is-selected' : '',
          mapped ? 'is-mapped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="workbench-field-remap-tree__twistie"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="workbench-field-remap-tree__twistie-spacer" />
        )}
        <button
          type="button"
          className="workbench-field-remap-tree__node"
          data-testid={`field-remap-node-${node.id}`}
          onClick={() => onSelect(node.id)}
        >
          <span className="workbench-field-remap-tree__label">{node.label}</span>
          {badge ? <Badge variant="muted">{badge}</Badge> : null}
        </button>
      </div>
      {hasChildren && open ? (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              mappedIds={mappedIds}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export interface FieldRemapTreeMapperProps {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
}

/**
 * Nested-aware A→B mapper: dual trees + edge list + list-context (itemEdges) editor.
 * Replaces flat-only table mappers for object/array shapes.
 */
export function FieldRemapTreeMapper({
  sources,
  targets,
  edges,
  onEdgesChange,
}: FieldRemapTreeMapperProps): JSX.Element {
  const sourceNodes = useMemo(() => sources.map(sourceToNode), [sources]);
  const targetNodes = useMemo(() => targets.map(targetToNode), [targets]);

  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [listContextEdgeId, setListContextEdgeId] = useState<string | null>(null);
  const [pendingItemSourceId, setPendingItemSourceId] = useState<string | null>(null);

  const mappedSourceIds = useMemo(() => new Set(edges.map((edge) => edge.sourceFieldId)), [edges]);
  const mappedTargetIds = useMemo(() => new Set(edges.map((edge) => edge.targetSlotId)), [edges]);

  const listContextEdge = edges.find((edge) => edge.id === listContextEdgeId) ?? null;
  const listSourceNode = listContextEdge
    ? findNode(sourceNodes, listContextEdge.sourceFieldId)
    : null;
  const listTargetNode = listContextEdge
    ? findNode(targetNodes, listContextEdge.targetSlotId)
    : null;

  const connect = (sourceId: string, targetId: string) => {
    const sourceNode = findNode(sourceNodes, sourceId);
    const targetNode = findNode(targetNodes, targetId);
    if (!sourceNode || !targetNode) {
      return;
    }

    const isListContext =
      sourceNode.dataType === 'array' &&
      targetNode.dataType === 'array' &&
      Boolean(sourceNode.children?.length && targetNode.children?.length);

    const nextEdge: MappingEdge = {
      id: `e-${sourceId}-${targetId}-${Date.now()}`,
      sourceFieldId: sourceId,
      targetSlotId: targetId,
      ...(isListContext ? { itemEdges: [] as MappingEdge[] } : {}),
    };

    const withoutTarget = edges.filter((edge) => edge.targetSlotId !== targetId);
    onEdgesChange([...withoutTarget, nextEdge]);
    setPendingSourceId(null);
    if (isListContext) {
      setListContextEdgeId(nextEdge.id);
      setPendingItemSourceId(null);
    }
  };

  const handleSourceSelect = (id: string) => {
    if (listContextEdgeId) {
      setPendingItemSourceId(id);
      return;
    }
    setPendingSourceId(id);
  };

  const handleTargetSelect = (id: string) => {
    if (listContextEdge && pendingItemSourceId) {
      const itemEdge: MappingEdge = {
        id: `ie-${pendingItemSourceId}-${id}-${Date.now()}`,
        sourceFieldId: pendingItemSourceId,
        targetSlotId: id,
      };
      onEdgesChange(
        edges.map((edge) =>
          edge.id === listContextEdge.id
            ? {
                ...edge,
                itemEdges: [
                  ...(edge.itemEdges ?? []).filter((child) => child.targetSlotId !== id),
                  itemEdge,
                ],
              }
            : edge,
        ),
      );
      setPendingItemSourceId(null);
      return;
    }

    if (!pendingSourceId) {
      return;
    }
    connect(pendingSourceId, id);
  };

  const removeEdge = (edgeId: string) => {
    onEdgesChange(edges.filter((edge) => edge.id !== edgeId));
    if (listContextEdgeId === edgeId) {
      setListContextEdgeId(null);
      setPendingItemSourceId(null);
    }
  };

  const removeItemEdge = (parentId: string, itemEdgeId: string) => {
    onEdgesChange(
      edges.map((edge) =>
        edge.id === parentId
          ? {
              ...edge,
              itemEdges: (edge.itemEdges ?? []).filter((child) => child.id !== itemEdgeId),
            }
          : edge,
      ),
    );
  };

  return (
    <div className="workbench-field-remap-mapper" data-testid="field-remap-mapper">
      <p className="workbench-field-remap-mapper__hint" data-testid="field-remap-hint">
        {listContextEdge
          ? pendingItemSourceId
            ? 'List context: select a target item field.'
            : 'List context: select a source item field, then a target item field.'
          : pendingSourceId
            ? 'Select a target field to complete the mapping.'
            : 'Select a source field, then a target field. Array → array opens list context.'}
      </p>

      <div className="workbench-field-remap-mapper__columns">
        <FieldTree
          title={listContextEdge ? `A item · ${listSourceNode?.label ?? 'source'}` : 'A (source)'}
          nodes={
            listContextEdge && listSourceNode?.children ? listSourceNode.children : sourceNodes
          }
          selectedId={listContextEdge ? pendingItemSourceId : pendingSourceId}
          mappedIds={
            listContextEdge
              ? new Set((listContextEdge.itemEdges ?? []).map((edge) => edge.sourceFieldId))
              : mappedSourceIds
          }
          onSelect={handleSourceSelect}
          side="source"
        />
        <FieldTree
          title={listContextEdge ? `B item · ${listTargetNode?.label ?? 'target'}` : 'B (target)'}
          nodes={
            listContextEdge && listTargetNode?.children ? listTargetNode.children : targetNodes
          }
          selectedId={null}
          mappedIds={
            listContextEdge
              ? new Set((listContextEdge.itemEdges ?? []).map((edge) => edge.targetSlotId))
              : mappedTargetIds
          }
          onSelect={handleTargetSelect}
          side="target"
        />
      </div>

      {listContextEdge ? (
        <div
          className="workbench-field-remap-mapper__list-context"
          data-testid="field-remap-list-context"
        >
          <div className="workbench-field-remap-mapper__list-context-bar">
            <strong>List context</strong>
            <span>
              {listContextEdge.sourceFieldId} → {listContextEdge.targetSlotId}
            </span>
            <Button
              compact
              type="button"
              onClick={() => {
                setListContextEdgeId(null);
                setPendingItemSourceId(null);
              }}
            >
              Done
            </Button>
          </div>
          <ul className="workbench-field-remap-mapper__edges">
            {(listContextEdge.itemEdges ?? []).map((edge) => (
              <li key={edge.id}>
                <code>
                  {edge.sourceFieldId} → {edge.targetSlotId}
                </code>
                <Button
                  compact
                  type="button"
                  onClick={() => removeItemEdge(listContextEdge.id, edge.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="workbench-field-remap-mapper__edges-panel">
        <h4>Bindings</h4>
        <ul className="workbench-field-remap-mapper__edges" data-testid="field-remap-edges">
          {edges.map((edge) => (
            <li key={edge.id}>
              <code>
                {edge.sourceFieldId} → {edge.targetSlotId}
                {edge.itemEdges ? ` · ${edge.itemEdges.length} item fields` : ''}
                {edge.itemSourcePath ? ` · project ${edge.itemSourcePath}` : ''}
                {edge.transformIds?.length ? ` · ${edge.transformIds.join(' → ')}` : ''}
              </code>
              <span className="workbench-field-remap-mapper__edge-actions">
                {edge.itemEdges ? (
                  <Button
                    compact
                    type="button"
                    onClick={() => {
                      setListContextEdgeId(edge.id);
                      setPendingItemSourceId(null);
                      setPendingSourceId(null);
                    }}
                  >
                    Edit items
                  </Button>
                ) : null}
                <Button compact type="button" onClick={() => removeEdge(edge.id)}>
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
