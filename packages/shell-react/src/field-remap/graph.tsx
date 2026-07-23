import { useMemo, useState, type JSX } from 'react';
import { Badge, Button } from '@workbench-kit/react/primitives';
import {
  MAX_TRANSFORM_CHAIN,
  flattenSourceFields,
  flattenTargetSlots,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformDefinition,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

interface KeyRow {
  readonly id: string;
  readonly label: string;
  readonly path?: string;
  readonly dataType?: string;
  readonly depth: number;
}

function collectKeys(
  nodes: readonly {
    id: string;
    label: string;
    path?: string;
    dataType?: string;
    children?: readonly unknown[];
  }[],
  depth = 0,
): KeyRow[] {
  const rows: KeyRow[] = [];
  for (const node of nodes) {
    rows.push({
      id: node.id,
      label: node.label,
      path: node.path,
      dataType: node.dataType,
      depth,
    });
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      rows.push(
        ...collectKeys(
          node.children as readonly {
            id: string;
            label: string;
            path?: string;
            dataType?: string;
            children?: readonly unknown[];
          }[],
          depth + 1,
        ),
      );
    }
  }
  return rows;
}

function labelFor(
  id: string,
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): string {
  const source = flattenSourceFields(sources).find((field) => field.id === id);
  if (source) {
    return source.path ?? source.label;
  }
  const target = flattenTargetSlots(targets).find((slot) => slot.id === id);
  return target?.path ?? target?.label ?? id;
}

function findSource(sources: readonly SourceField[], id: string): SourceField | undefined {
  return flattenSourceFields(sources).find((field) => field.id === id);
}

function findTarget(targets: readonly TargetSlot[], id: string): TargetSlot | undefined {
  return flattenTargetSlots(targets).find((slot) => slot.id === id);
}

export interface FieldRemapGraphMapperProps {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
}

/**
 * Left/right key columns + middle transform nodes per binding (format / reduce chain).
 * Edges stay `MappingEdge` (`transformIds` ≤ {@link MAX_TRANSFORM_CHAIN}).
 */
export function FieldRemapGraphMapper({
  sources,
  targets,
  edges,
  transforms,
  onEdgesChange,
}: FieldRemapGraphMapperProps): JSX.Element {
  const sourceKeys = useMemo(() => collectKeys(sources), [sources]);
  const targetKeys = useMemo(() => collectKeys(targets), [targets]);
  const catalog = useMemo(
    () =>
      transforms
        .list()
        .filter((item) => item.id !== 'identity')
        .sort((a, b) => a.label.localeCompare(b.label)),
    [transforms],
  );

  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [listContextEdgeId, setListContextEdgeId] = useState<string | null>(null);
  const [pendingItemSourceId, setPendingItemSourceId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const mappedSourceIds = useMemo(() => new Set(edges.map((edge) => edge.sourceFieldId)), [edges]);
  const mappedTargetIds = useMemo(() => new Set(edges.map((edge) => edge.targetSlotId)), [edges]);

  const listContextEdge = edges.find((edge) => edge.id === listContextEdgeId) ?? null;
  const listSource = listContextEdge
    ? findSource(sources, listContextEdge.sourceFieldId)
    : undefined;
  const listTarget = listContextEdge
    ? findTarget(targets, listContextEdge.targetSlotId)
    : undefined;

  const patchEdge = (edgeId: string, patch: Partial<MappingEdge>) => {
    onEdgesChange(edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)));
  };

  const connect = (sourceId: string, targetId: string) => {
    const source = findSource(sources, sourceId);
    const target = findTarget(targets, targetId);
    if (!source || !target) {
      return;
    }
    const isListContext =
      source.dataType === 'array' &&
      target.dataType === 'array' &&
      Boolean(source.children?.length && target.children?.length);

    const nextEdge: MappingEdge = {
      id: `e-${sourceId}-${targetId}-${Date.now()}`,
      sourceFieldId: sourceId,
      targetSlotId: targetId,
      ...(isListContext ? { itemEdges: [] as MappingEdge[] } : {}),
    };
    const withoutTarget = edges.filter((edge) => edge.targetSlotId !== targetId);
    onEdgesChange([...withoutTarget, nextEdge]);
    setPendingSourceId(null);
    setSelectedEdgeId(nextEdge.id);
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

  const addTransformNode = (edgeId: string, transformId: string) => {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }
    const current = edge.transformIds ?? [];
    if (current.length >= MAX_TRANSFORM_CHAIN) {
      return;
    }
    patchEdge(edgeId, { transformIds: [...current, transformId] });
  };

  const setTransformAt = (edgeId: string, index: number, transformId: string) => {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }
    const next = [...(edge.transformIds ?? [])];
    next[index] = transformId;
    patchEdge(edgeId, { transformIds: next });
  };

  const removeTransformAt = (edgeId: string, index: number) => {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }
    const next = [...(edge.transformIds ?? [])];
    next.splice(index, 1);
    const optionSteps = edge.transformOptionSteps ? [...edge.transformOptionSteps] : undefined;
    if (optionSteps) {
      optionSteps.splice(index, 1);
    }
    patchEdge(edgeId, {
      transformIds: next.length > 0 ? next : undefined,
      transformOptionSteps: optionSteps && optionSteps.length > 0 ? optionSteps : undefined,
    });
  };

  const setNodeOption = (edgeId: string, index: number, key: string, value: string) => {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }
    const chain = edge.transformIds ?? [];
    const steps = Array.from({ length: chain.length }, (_, i) => ({
      ...(edge.transformOptionSteps?.[i] ?? {}),
    }));
    steps[index] = { ...steps[index], [key]: value };
    patchEdge(edgeId, { transformOptionSteps: steps });
  };

  const removeEdge = (edgeId: string) => {
    onEdgesChange(edges.filter((edge) => edge.id !== edgeId));
    if (listContextEdgeId === edgeId) {
      setListContextEdgeId(null);
      setPendingItemSourceId(null);
    }
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
  };

  const visibleSourceKeys =
    listContextEdge && listSource?.children ? collectKeys(listSource.children) : sourceKeys;
  const visibleTargetKeys =
    listContextEdge && listTarget?.children ? collectKeys(listTarget.children) : targetKeys;

  return (
    <div className="workbench-field-remap-mapper" data-testid="field-remap-mapper">
      <p className="workbench-field-remap-mapper__hint" data-testid="field-remap-hint">
        {listContextEdge
          ? pendingItemSourceId
            ? 'List context: select a target item field.'
            : 'List context: select a source item field, then a target item field.'
          : pendingSourceId
            ? 'Select a target key to create a binding. Add middle nodes for formatting.'
            : 'Select a source key, then a target key. Insert transform nodes in the middle when values need formatting.'}
      </p>

      <div className="workbench-field-remap-graph" data-testid="field-remap-graph">
        <KeyColumn
          title={listContextEdge ? `A item · ${listSource?.label ?? 'source'}` : 'A keys'}
          keys={visibleSourceKeys}
          selectedId={listContextEdge ? pendingItemSourceId : pendingSourceId}
          mappedIds={
            listContextEdge
              ? new Set((listContextEdge.itemEdges ?? []).map((edge) => edge.sourceFieldId))
              : mappedSourceIds
          }
          onSelect={handleSourceSelect}
          side="source"
        />

        <div className="workbench-field-remap-graph__center" data-testid="field-remap-lanes">
          <h4 className="workbench-field-remap-tree__title">Bindings / nodes</h4>
          {edges.length === 0 ? (
            <p className="workbench-field-remap-graph__empty">No bindings yet.</p>
          ) : (
            <ul className="workbench-field-remap-graph__lanes">
              {edges.map((edge) => (
                <BindingLane
                  key={edge.id}
                  edge={edge}
                  selected={selectedEdgeId === edge.id}
                  sourceLabel={labelFor(edge.sourceFieldId, sources, targets)}
                  targetLabel={labelFor(edge.targetSlotId, sources, targets)}
                  catalog={catalog}
                  onSelect={() => setSelectedEdgeId(edge.id)}
                  onAddNode={(transformId) => addTransformNode(edge.id, transformId)}
                  onChangeNode={(index, transformId) => setTransformAt(edge.id, index, transformId)}
                  onRemoveNode={(index) => removeTransformAt(edge.id, index)}
                  onOptionChange={(index, key, value) => setNodeOption(edge.id, index, key, value)}
                  onEditItems={
                    edge.itemEdges
                      ? () => {
                          setListContextEdgeId(edge.id);
                          setPendingItemSourceId(null);
                          setPendingSourceId(null);
                        }
                      : undefined
                  }
                  onRemove={() => removeEdge(edge.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <KeyColumn
          title={listContextEdge ? `B item · ${listTarget?.label ?? 'target'}` : 'B keys'}
          keys={visibleTargetKeys}
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
          <ul className="workbench-field-remap-mapper__edges" data-testid="field-remap-edges">
            {(listContextEdge.itemEdges ?? []).map((edge) => (
              <li key={edge.id}>
                <code>
                  {edge.sourceFieldId} → {edge.targetSlotId}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul
          className="workbench-field-remap-mapper__edges visually-hidden"
          data-testid="field-remap-edges"
        >
          {edges.map((edge) => (
            <li key={edge.id}>
              {edge.sourceFieldId} → {edge.targetSlotId}
              {edge.transformIds?.length ? ` · ${edge.transformIds.join(' → ')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KeyColumn({
  title,
  keys,
  selectedId,
  mappedIds,
  onSelect,
  side,
}: {
  readonly title: string;
  readonly keys: readonly KeyRow[];
  readonly selectedId: string | null;
  readonly mappedIds: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
  readonly side: 'source' | 'target';
}): JSX.Element {
  return (
    <div className="workbench-field-remap-tree" data-side={side}>
      <h4 className="workbench-field-remap-tree__title">{title}</h4>
      <ul className="workbench-field-remap-graph__keys" role="list">
        {keys.map((key) => {
          const badge = key.dataType === 'object' || key.dataType === 'array' ? key.dataType : null;
          return (
            <li key={key.id}>
              <button
                type="button"
                className={[
                  'workbench-field-remap-graph__key',
                  selectedId === key.id ? 'is-selected' : '',
                  mappedIds.has(key.id) ? 'is-mapped' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ paddingLeft: `${0.5 + key.depth * 0.75}rem` }}
                data-testid={`field-remap-node-${key.id}`}
                onClick={() => onSelect(key.id)}
              >
                <span className="workbench-field-remap-tree__label">{key.label}</span>
                {badge ? <Badge variant="muted">{badge}</Badge> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BindingLane({
  edge,
  selected,
  sourceLabel,
  targetLabel,
  catalog,
  onSelect,
  onAddNode,
  onChangeNode,
  onRemoveNode,
  onOptionChange,
  onEditItems,
  onRemove,
}: {
  readonly edge: MappingEdge;
  readonly selected: boolean;
  readonly sourceLabel: string;
  readonly targetLabel: string;
  readonly catalog: readonly ValueTransformDefinition[];
  readonly onSelect: () => void;
  readonly onAddNode: (transformId: string) => void;
  readonly onChangeNode: (index: number, transformId: string) => void;
  readonly onRemoveNode: (index: number) => void;
  readonly onOptionChange: (index: number, key: string, value: string) => void;
  readonly onEditItems?: (() => void) | undefined;
  readonly onRemove: () => void;
}): JSX.Element {
  const chain = edge.transformIds ?? [];
  const defaultAddId = catalog[0]?.id ?? 'string:trim';

  return (
    <li
      className={['workbench-field-remap-graph__lane', selected ? 'is-selected' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid={`field-remap-lane-${edge.id}`}
    >
      <button type="button" className="workbench-field-remap-graph__endpoint" onClick={onSelect}>
        {sourceLabel}
      </button>

      <span className="workbench-field-remap-graph__arrow" aria-hidden="true">
        →
      </span>

      <div className="workbench-field-remap-graph__nodes">
        {chain.length === 0 ? (
          <span className="workbench-field-remap-graph__passthrough" title="Pass-through">
            direct
          </span>
        ) : (
          chain.map((transformId, index) => {
            const definition = catalog.find((item) => item.id === transformId);
            const optionFields = definition?.optionFields ?? [];
            return (
              <div
                key={`${edge.id}-${index}-${transformId}`}
                className="workbench-field-remap-graph__node"
                data-testid={`field-remap-node-transform-${edge.id}-${index}`}
              >
                <select
                  aria-label={`Transform step ${index + 1}`}
                  value={transformId}
                  onChange={(event) => onChangeNode(index, event.target.value)}
                >
                  {!catalog.some((item) => item.id === transformId) ? (
                    <option value={transformId}>{transformId}</option>
                  ) : null}
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {optionFields.map((field) => (
                  <input
                    key={field.key}
                    type="text"
                    aria-label={field.label}
                    placeholder={field.label}
                    value={String(edge.transformOptionSteps?.[index]?.[field.key] ?? '')}
                    onChange={(event) => onOptionChange(index, field.key, event.target.value)}
                  />
                ))}
                <Button compact type="button" onClick={() => onRemoveNode(index)}>
                  ×
                </Button>
              </div>
            );
          })
        )}

        {chain.length < MAX_TRANSFORM_CHAIN ? (
          <Button
            compact
            type="button"
            data-testid={`field-remap-add-node-${edge.id}`}
            onClick={() => onAddNode(defaultAddId)}
          >
            + node
          </Button>
        ) : null}

        {edge.itemSourcePath ? <Badge variant="muted">project {edge.itemSourcePath}</Badge> : null}
        {edge.itemEdges ? <Badge variant="muted">{edge.itemEdges.length} item fields</Badge> : null}
      </div>

      <span className="workbench-field-remap-graph__arrow" aria-hidden="true">
        →
      </span>

      <button type="button" className="workbench-field-remap-graph__endpoint" onClick={onSelect}>
        {targetLabel}
      </button>

      <span className="workbench-field-remap-mapper__edge-actions">
        {onEditItems ? (
          <Button compact type="button" onClick={onEditItems}>
            Edit items
          </Button>
        ) : null}
        <Button compact type="button" onClick={onRemove}>
          Remove
        </Button>
      </span>
    </li>
  );
}
