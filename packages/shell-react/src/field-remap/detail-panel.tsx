import { useMemo, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import {
  MAX_TRANSFORM_CHAIN,
  findSourceField,
  findTargetSlot,
  flattenSourceFields,
  flattenTargetSlots,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { ConvertNoteEditor } from './convert-note-editor.js';
import {
  addTransformStepToEdge,
  bindOperatorInput,
  bindOperatorOutput,
  canEditListContext,
  edgePortTypes,
  enableListContextOnEdge,
  listCompatibleTransforms,
  removeItemEdgeFromParent,
  removeMappingOperator,
  removeOperatorInput,
  removeOperatorOutput,
  removeTransformStepFromEdge,
  updateMappingOperator,
  upsertItemEdgeOnParent,
  type FieldRemapDraftTransform,
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
  readonly drafts?: readonly FieldRemapDraftTransform[] | undefined;
  readonly onDiscardDraft?: ((localId: string) => void) | undefined;
  readonly operators?: readonly MappingOperator[] | undefined;
  readonly onOperatorsChange?: ((operators: readonly MappingOperator[]) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly emptyDetailTitle?: string | undefined;
  readonly emptyDetailDescription?: string | undefined;
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
  drafts = [],
  onDiscardDraft,
  operators = [],
  onOperatorsChange,
  readOnly = false,
  emptyDetailTitle = 'Start with a convert',
  emptyDetailDescription = 'Use the Convert palette to place a convert, then wire source → draft → target. Or select an existing binding / convert note on the canvas.',
}: FieldRemapDetailPanelProps): JSX.Element | null {
  const edge = useMemo(() => {
    if (!selection || (selection.kind !== 'edge' && selection.kind !== 'transformStep')) {
      return undefined;
    }
    return edges.find((item) => item.id === selection.edgeId);
  }, [edges, selection]);

  const draft = useMemo(() => {
    if (!selection || selection.kind !== 'draft') {
      return undefined;
    }
    return drafts.find((item) => item.localId === selection.localId);
  }, [drafts, selection]);

  const operator = useMemo(() => {
    if (!selection || selection.kind !== 'operator') {
      return undefined;
    }
    return operators.find((item) => item.id === selection.operatorId);
  }, [operators, selection]);

  const [pendingItemSourceId, setPendingItemSourceId] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState<string>('');
  const [pendingOperatorFieldId, setPendingOperatorFieldId] = useState('');
  const [pendingOperatorSlotId, setPendingOperatorSlotId] = useState('');
  const flatSources = useMemo(() => flattenSourceFields(sources), [sources]);
  const flatTargets = useMemo(() => flattenTargetSlots(targets), [targets]);

  if (!selection) {
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--empty"
        data-testid="field-remap-detail"
        aria-label="Binding details"
      >
        <h4>{emptyDetailTitle}</h4>
        <p data-testid="field-remap-detail-empty-hint">{emptyDetailDescription}</p>
      </aside>
    );
  }

  if (selection.kind === 'draft') {
    const definition = draft ? transforms.get(draft.transformId) : undefined;
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--draft"
        data-testid="field-remap-detail"
        aria-label="Draft convert"
      >
        <div className="workbench-field-remap-detail__header">
          <div>
            <h4>Draft convert</h4>
            <code data-testid="field-remap-detail-draft-id">
              {definition?.label ?? draft?.transformId ?? selection.localId}
            </code>
          </div>
          {!readOnly ? (
            <Button
              compact
              type="button"
              data-testid="field-remap-detail-discard-draft"
              onClick={() => {
                onDiscardDraft?.(selection.localId);
                onSelectionChange(null);
              }}
            >
              Discard
            </Button>
          ) : null}
        </div>
        <p className="workbench-field-remap-detail__muted">
          Wire source then target ports. When both bind, the convert note editor opens.
        </p>
        <dl
          className="workbench-field-remap-detail__draft-ports"
          data-testid="field-remap-detail-draft-ports"
        >
          <div>
            <dt>Source</dt>
            <dd>
              <code>{draft?.sourceFieldId ?? 'Unwired'}</code>
            </dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              <code>{draft?.targetSlotId ?? 'Unwired'}</code>
            </dd>
          </div>
        </dl>
      </aside>
    );
  }

  if (selection.kind === 'operator') {
    if (!operator || (!readOnly && !onOperatorsChange)) {
      return (
        <aside className="workbench-field-remap-detail" data-testid="field-remap-detail">
          <h4>Operator</h4>
          <code data-testid="field-remap-detail-operator-id">{selection.operatorId}</code>
          <p className="workbench-field-remap-detail__muted">
            Host must wire onOperatorsChange for authoring.
          </p>
        </aside>
      );
    }
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--operator"
        data-testid="field-remap-detail"
        aria-label="Operator details"
      >
        <div className="workbench-field-remap-detail__header">
          <div>
            <h4>{operator.kind === 'combine' ? 'Combine (n→1)' : 'Split (1→n)'}</h4>
            <code data-testid="field-remap-detail-operator-id">{operator.id}</code>
          </div>
          {!readOnly ? (
            <Button
              compact
              type="button"
              data-testid="field-remap-detail-delete-operator"
              onClick={() => {
                onOperatorsChange?.(removeMappingOperator(operators, operator.id));
                onSelectionChange(null);
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
        {operator.kind === 'combine' ? (
          <section className="workbench-field-remap-detail__section">
            <h5>Inputs</h5>
            <ul className="workbench-field-remap-detail__item-edges">
              {operator.inputFieldIds.map((fieldId) => (
                <li key={fieldId}>
                  <code>{fieldLabel(fieldId, sources, targets)}</code>
                  {!readOnly ? (
                    <Button
                      compact
                      type="button"
                      onClick={() =>
                        onOperatorsChange?.(
                          updateMappingOperator(operators, operator.id, (current) =>
                            removeOperatorInput(current, fieldId),
                          ),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {!readOnly ? (
              <div className="workbench-field-remap-detail__field">
                <label>
                  <span>Add input</span>
                  <select
                    data-testid="field-remap-operator-add-input"
                    value={pendingOperatorFieldId}
                    onChange={(event) => setPendingOperatorFieldId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {flatSources.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.path ?? field.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  compact
                  type="button"
                  data-testid="field-remap-operator-bind-input"
                  disabled={!pendingOperatorFieldId}
                  onClick={() => {
                    if (!pendingOperatorFieldId) return;
                    onOperatorsChange?.(
                      updateMappingOperator(operators, operator.id, (current) =>
                        bindOperatorInput(current, pendingOperatorFieldId),
                      ),
                    );
                    setPendingOperatorFieldId('');
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
            <div className="workbench-field-remap-detail__field">
              <label>
                <span>Output slot</span>
                <select
                  data-testid="field-remap-operator-output"
                  value={operator.outputSlotId}
                  disabled={readOnly}
                  onChange={(event) => {
                    const slotId = event.target.value;
                    onOperatorsChange?.(
                      updateMappingOperator(operators, operator.id, (current) =>
                        slotId
                          ? bindOperatorOutput(current, slotId)
                          : removeOperatorOutput(current, operator.outputSlotId),
                      ),
                    );
                  }}
                >
                  <option value="">Unwired…</option>
                  {flatTargets.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.path ?? slot.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ) : (
          <section className="workbench-field-remap-detail__section">
            <div className="workbench-field-remap-detail__field">
              <label>
                <span>Input field</span>
                <select
                  data-testid="field-remap-operator-input"
                  value={operator.inputFieldId}
                  disabled={readOnly}
                  onChange={(event) => {
                    const fieldId = event.target.value;
                    onOperatorsChange?.(
                      updateMappingOperator(operators, operator.id, (current) =>
                        fieldId
                          ? bindOperatorInput(current, fieldId)
                          : removeOperatorInput(current, operator.inputFieldId),
                      ),
                    );
                  }}
                >
                  <option value="">Unwired…</option>
                  {flatSources.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.path ?? field.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h5>Outputs</h5>
            <ul className="workbench-field-remap-detail__item-edges">
              {operator.outputSlotIds.map((slotId) => (
                <li key={slotId}>
                  <code>{fieldLabel(slotId, sources, targets)}</code>
                  {!readOnly ? (
                    <Button
                      compact
                      type="button"
                      onClick={() =>
                        onOperatorsChange?.(
                          updateMappingOperator(operators, operator.id, (current) =>
                            removeOperatorOutput(current, slotId),
                          ),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {!readOnly ? (
              <div className="workbench-field-remap-detail__field">
                <label>
                  <span>Add output</span>
                  <select
                    data-testid="field-remap-operator-add-output"
                    value={pendingOperatorSlotId}
                    onChange={(event) => setPendingOperatorSlotId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {flatTargets.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.path ?? slot.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  compact
                  type="button"
                  data-testid="field-remap-operator-bind-output"
                  disabled={!pendingOperatorSlotId}
                  onClick={() => {
                    if (!pendingOperatorSlotId) return;
                    onOperatorsChange?.(
                      updateMappingOperator(operators, operator.id, (current) =>
                        bindOperatorOutput(current, pendingOperatorSlotId),
                      ),
                    );
                    setPendingOperatorSlotId('');
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
          </section>
        )}
      </aside>
    );
  }

  if (!edge) {
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
        readOnly={readOnly}
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
    paletteId && appendCatalog.some((item) => item.id === paletteId) ? paletteId : defaultPaletteId;

  const listContextEnabled = canEditListContext(edge, sources, targets);
  const sourceField = findSourceField(sources, edge.sourceFieldId);
  const targetSlot = findTargetSlot(targets, edge.targetSlotId);
  const itemSourceChildren = sourceField?.children ?? [];
  const itemTargetChildren = targetSlot?.children ?? [];

  const applyEdge = (next: MappingEdge | null) => {
    if (readOnly || !next) {
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
                    <span className="workbench-field-remap-detail__step-hint">
                      {readOnly ? 'Inspect convert' : 'Edit convert'}
                    </span>
                  </button>
                  {!readOnly ? (
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
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {!readOnly && chain.length < MAX_TRANSFORM_CHAIN ? (
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
            {!readOnly && !edge.itemEdges ? (
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
              {!readOnly ? (
                <p className="workbench-field-remap-detail__muted">
                  {pendingItemSourceId
                    ? 'Select a target item field to complete the item binding.'
                    : 'Select a source item field, then a target item field.'}
                </p>
              ) : null}
              {!readOnly ? (
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
              ) : null}
              <ul className="workbench-field-remap-detail__item-edges">
                {(edge.itemEdges ?? []).map((itemEdge) => (
                  <li key={itemEdge.id} data-testid={`field-remap-item-edge-${itemEdge.id}`}>
                    <code>
                      {fieldLabel(itemEdge.sourceFieldId, sources, targets)} →{' '}
                      {fieldLabel(itemEdge.targetSlotId, sources, targets)}
                    </code>
                    {!readOnly ? (
                      <Button
                        compact
                        type="button"
                        onClick={() => applyEdge(removeItemEdgeFromParent(edge, itemEdge.id))}
                      >
                        Remove
                      </Button>
                    ) : null}
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
