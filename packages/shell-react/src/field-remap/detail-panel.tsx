import { useMemo, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import {
  MAX_TRANSFORM_CHAIN,
  findSourceField,
  findTargetSlot,
  optionFieldsForStep,
  resolveOptionSteps,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import {
  addTransformStepToEdge,
  canEditListContext,
  edgePortTypes,
  enableListContextOnEdge,
  listCompatibleTransforms,
  removeItemEdgeFromParent,
  removeTransformStepFromEdge,
  replaceTransformStepOptionsOnEdge,
  setTransformStepIdOnEdge,
  upsertItemEdgeOnParent,
  type FieldRemapSelection,
} from './flow-ops.js';
import { TransformOptionsEditor } from './transform-options-editor.js';

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
 * Selection-driven settings surface for Flow: transform id picker, options editor,
 * and list-context (`itemEdges`) authoring.
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

  const stepIndex =
    selection?.kind === 'transformStep' ? selection.stepIndex : undefined;

  const [pendingItemSourceId, setPendingItemSourceId] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState<string>('');

  if (!selection || !edge) {
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--empty"
        data-testid="field-remap-detail"
        aria-label="Binding details"
      >
        <p>Select a binding or transform step to edit details.</p>
      </aside>
    );
  }

  const portTypes = edgePortTypes(edge, sources, targets);
  const chain = edge.transformIds ?? [];
  const activeStepIndex =
    stepIndex !== undefined && stepIndex >= 0 && stepIndex < chain.length ? stepIndex : undefined;
  const activeTransformId =
    activeStepIndex !== undefined ? chain[activeStepIndex] : undefined;
  const optionFields = optionFieldsForStep(transforms, activeTransformId);
  const optionValue =
    activeStepIndex !== undefined
      ? (resolveOptionSteps(chain, edge.transformOptionSteps, edge.transformOptions)[
          activeStepIndex
        ] ?? {})
      : {};

  const replaceCatalog =
    activeStepIndex !== undefined
      ? listCompatibleTransforms({
          registry: transforms,
          edge,
          stepIndex: activeStepIndex,
          sourceType: portTypes.sourceType,
          targetType: portTypes.targetType,
          mode: 'replace',
        })
      : [];

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

      <section className="workbench-field-remap-detail__section" aria-labelledby="field-remap-detail-chain">
        <h5 id="field-remap-detail-chain">Transform chain</h5>
        {chain.length === 0 ? (
          <p className="workbench-field-remap-detail__muted">Direct (identity)</p>
        ) : (
          <ol className="workbench-field-remap-detail__steps">
            {chain.map((transformId, index) => {
              const definition = transforms.get(transformId);
              const selected = activeStepIndex === index;
              return (
                <li key={`${edge.id}-${index}-${transformId}`}>
                  <button
                    type="button"
                    className={
                      selected
                        ? 'workbench-field-remap-detail__step is-selected'
                        : 'workbench-field-remap-detail__step'
                    }
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
                  </button>
                  <Button
                    compact
                    type="button"
                    aria-label={`Remove step ${index + 1}`}
                    data-testid={`field-remap-detail-remove-step-${index}`}
                    onClick={() => {
                      const next = removeTransformStepFromEdge(edge, index);
                      applyEdge(next);
                      const nextLen = next.transformIds?.length ?? 0;
                      if (nextLen === 0) {
                        onSelectionChange({ kind: 'edge', edgeId: edge.id });
                      } else if (activeStepIndex !== undefined) {
                        onSelectionChange({
                          kind: 'transformStep',
                          edgeId: edge.id,
                          stepIndex: Math.min(activeStepIndex, nextLen - 1),
                        });
                      }
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
              <span>Add transform</span>
              <select
                aria-label="Transform palette"
                data-testid="field-remap-palette-select"
                value={effectivePaletteId}
                disabled={appendCatalog.length === 0}
                onChange={(event) => setPaletteId(event.target.value)}
              >
                {appendCatalog.length === 0 ? (
                  <option value="">No compatible transforms</option>
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

      {activeStepIndex !== undefined && activeTransformId ? (
        <section
          className="workbench-field-remap-detail__section"
          aria-labelledby="field-remap-detail-step-settings"
          data-testid="field-remap-step-settings"
        >
          <h5 id="field-remap-detail-step-settings">Step settings</h5>
          <label className="workbench-field-remap-detail__field">
            <span>Transform</span>
            <select
              aria-label="Transform step id"
              data-testid="field-remap-step-id"
              value={activeTransformId}
              onChange={(event) => {
                const next = setTransformStepIdOnEdge(edge, activeStepIndex, event.target.value, {
                  registry: transforms,
                  sourceType: portTypes.sourceType,
                  targetType: portTypes.targetType,
                });
                applyEdge(next);
              }}
            >
              {!replaceCatalog.some((item) => item.id === activeTransformId) ? (
                <option value={activeTransformId}>{activeTransformId}</option>
              ) : null}
              {replaceCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <TransformOptionsEditor
            fields={optionFields}
            value={optionValue}
            onChange={(nextOptions) => {
              applyEdge(replaceTransformStepOptionsOnEdge(edge, activeStepIndex, nextOptions));
            }}
          />
        </section>
      ) : null}

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
