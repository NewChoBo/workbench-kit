import { useMemo, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import {
  MAX_TRANSFORM_CHAIN,
  findSourceField,
  findTargetSlot,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { ConvertNoteEditor } from './convert-note-editor.js';
import {
  addTransformStepToEdge,
  canEditListContext,
  edgePortTypes,
  enableListContextOnEdge,
  listCompatibleTransforms,
  removeItemEdgeFromParent,
  removeTransformStepFromEdge,
  upsertItemEdgeOnParent,
  type FieldRemapSelection,
} from './flow-ops.js';

export interface FieldRemapDetailPanelProps {
  readonly selection: FieldRemapSelection;
  readonly edges: readonly MappingEdge[];
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly transforms: ValueTransformRegistry;
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
  readonly onSelectionChange: (next: FieldRemapSelection) => void;
}

function fieldLabel(
  id: string,
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): string {
  const source = findSourceField(sources, id);
  if (source) {
    return source.path ?? source.label;
  }
  const target = findTargetSlot(targets, id);
  return target?.path ?? target?.label ?? id;
}

/**
 * Selection-driven side rail for Flow:
 * - edge / empty → light binding detail (chain overview, palette, list context)
 * - transformStep → dedicated {@link ConvertNoteEditor} surface
 */
export function FieldRemapDetailPanel({
  selection,
  edges,
  sources,
  targets,
  transforms,
  onEdgesChange,
  onSelectionChange,
}: FieldRemapDetailPanelProps): JSX.Element | null {
  const edge = useMemo(() => {
    if (!selection) {
      return undefined;
    }
    return edges.find((item) => item.id === selection.edgeId);
  }, [edges, selection]);

  const [pendingItemSourceId, setPendingItemSourceId] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState<string>('');

  if (!selection || !edge) {
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--empty"
        data-testid="field-remap-detail"
        aria-label="Binding details"
      >
        <p>Select a binding for mapping details, or a convert node to open the convert editor.</p>
      </aside>
    );
  }

  if (selection.kind === 'transformStep') {
    return (
      <ConvertNoteEditor
        edge={edge}
        stepIndex={selection.stepIndex}
        sources={sources}
        targets={targets}
        transforms={transforms}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  const portTypes = edgePortTypes(edge, sources, targets);
  const chain = edge.transformIds ?? [];

  const appendCatalog = listCompatibleTransforms({
    registry: transforms,
    edge,
    stepIndex: chain.length,
    sourceType: portTypes.sourceType,
    targetType: portTypes.targetType,
    mode: 'append',
  });

  const defaultPaletteId = appendCatalog[0]?.id ?? '';
  const effectivePaletteId =
    paletteId && appendCatalog.some((item) => item.id === paletteId)
      ? paletteId
      : defaultPaletteId;

  const listContextEnabled = canEditListContext(edge, sources, targets);
  const sourceField = findSourceField(sources, edge.sourceFieldId);
  const targetSlot = findTargetSlot(targets, edge.targetSlotId);
  const itemSourceChildren = sourceField?.children ?? [];
  const itemTargetChildren = targetSlot?.children ?? [];

  const applyEdge = (next: MappingEdge | null) => {
    if (!next) {
      return;
    }
    onEdgesChange(edges.map((item) => (item.id === edge.id ? next : item)));
  };

  return (
    <aside
      className="workbench-field-remap-detail"
      data-testid="field-remap-detail"
      aria-label="Binding details"
    >
      <div className="workbench-field-remap-detail__header">
        <div>
          <h4>Binding</h4>
          <code data-testid="field-remap-detail-binding">
            {edge.sourceFieldId} → {edge.targetSlotId}
          </code>
        </div>
        <Button
          compact
          type="button"
          data-testid="field-remap-detail-clear"
          onClick={() => onSelectionChange(null)}
        >
          Clear
        </Button>
      </div>

      <section
        className="workbench-field-remap-detail__section"
        aria-labelledby="field-remap-detail-chain"
      >
        <h5 id="field-remap-detail-chain">Convert chain</h5>
        {chain.length === 0 ? (
          <p className="workbench-field-remap-detail__muted">Direct (no convert)</p>
        ) : (
          <ol className="workbench-field-remap-detail__steps">
            {chain.map((transformId, index) => {
              const definition = transforms.get(transformId);
              return (
                <li key={`${edge.id}-${index}-${transformId}`}>
                  <button
                    type="button"
                    className="workbench-field-remap-detail__step"
                    data-testid={`field-remap-detail-step-${index}`}
                    onClick={() =>
                      onSelectionChange({
                        kind: 'transformStep',
                        edgeId: edge.id,
                        stepIndex: index,
                      })
                    }
                  >
                    <strong>{definition?.label ?? transformId}</strong>
                    <code>{transformId}</code>
                    <span className="workbench-field-remap-detail__step-hint">Edit convert</span>
                  </button>
                  <Button
                    compact
                    type="button"
                    aria-label={`Remove convert step ${index + 1}`}
                    data-testid={`field-remap-detail-remove-step-${index}`}
                    onClick={() => {
                      const next = removeTransformStepFromEdge(edge, index);
                      applyEdge(next);
                    }}
                  >
                    ×
                  </Button>
                </li>
              );
            })}
          </ol>
        )}

        {chain.length < MAX_TRANSFORM_CHAIN ? (
          <div
            className="workbench-field-remap-detail__palette"
            data-testid="field-remap-transform-palette"
          >
            <label>
              <span>Add convert</span>
              <select
                aria-label="Convert palette"
                data-testid="field-remap-palette-select"
                value={effectivePaletteId}
                disabled={appendCatalog.length === 0}
                onChange={(event) => setPaletteId(event.target.value)}
              >
                {appendCatalog.length === 0 ? (
                  <option value="">No compatible converts</option>
                ) : null}
                {appendCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              compact
              type="button"
              data-testid="field-remap-palette-add"
              disabled={!effectivePaletteId}
              onClick={() => {
                const next = addTransformStepToEdge(edge, effectivePaletteId, {
                  registry: transforms,
                  sourceType: portTypes.sourceType,
                  targetType: portTypes.targetType,
                });
                if (!next) {
                  return;
                }
                applyEdge(next);
                onSelectionChange({
                  kind: 'transformStep',
                  edgeId: edge.id,
                  stepIndex: (next.transformIds?.length ?? 1) - 1,
                });
              }}
            >
              Add
            </Button>
          </div>
        ) : null}
      </section>

      {listContextEnabled ? (
        <section
          className="workbench-field-remap-detail__section"
          aria-labelledby="field-remap-detail-list-context"
          data-testid="field-remap-list-context"
        >
          <div className="workbench-field-remap-detail__list-context-bar">
            <h5 id="field-remap-detail-list-context">List context</h5>
            {!edge.itemEdges ? (
              <Button
                compact
                type="button"
                data-testid="field-remap-enable-list-context"
                onClick={() => applyEdge(enableListContextOnEdge(edge))}
              >
                Enable item fields
              </Button>
            ) : null}
          </div>

          {edge.itemEdges ? (
            <>
              <p className="workbench-field-remap-detail__muted">
                {pendingItemSourceId
                  ? 'Select a target item field to complete the item binding.'
                  : 'Select a source item field, then a target item field.'}
              </p>
              <div className="workbench-field-remap-detail__item-pickers">
                <label>
                  <span>Source item field</span>
                  <select
                    aria-label="Source item field"
                    data-testid="field-remap-item-source"
                    value={pendingItemSourceId ?? ''}
                    onChange={(event) => setPendingItemSourceId(event.target.value || null)}
                  >
                    <option value="">Select…</option>
                    {itemSourceChildren.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.path ?? child.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Target item field</span>
                  <select
                    aria-label="Target item field"
                    data-testid="field-remap-item-target"
                    value=""
                    disabled={!pendingItemSourceId}
                    onChange={(event) => {
                      const targetId = event.target.value;
                      if (!pendingItemSourceId || !targetId) {
                        return;
                      }
                      const itemEdge: MappingEdge = {
                        id: `ie-${pendingItemSourceId}-${targetId}-${Date.now()}`,
                        sourceFieldId: pendingItemSourceId,
                        targetSlotId: targetId,
                      };
                      applyEdge(upsertItemEdgeOnParent(edge, itemEdge));
                      setPendingItemSourceId(null);
                    }}
                  >
                    <option value="">Select…</option>
                    {itemTargetChildren.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.path ?? child.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ul className="workbench-field-remap-detail__item-edges">
                {(edge.itemEdges ?? []).map((itemEdge) => (
                  <li key={itemEdge.id} data-testid={`field-remap-item-edge-${itemEdge.id}`}>
                    <code>
                      {fieldLabel(itemEdge.sourceFieldId, sources, targets)} →{' '}
                      {fieldLabel(itemEdge.targetSlotId, sources, targets)}
                    </code>
                    <Button
                      compact
                      type="button"
                      onClick={() => applyEdge(removeItemEdgeFromParent(edge, itemEdge.id))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
