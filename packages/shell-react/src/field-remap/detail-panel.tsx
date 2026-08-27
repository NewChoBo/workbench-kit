import { useId, useMemo, useState, type JSX } from 'react';
import { WorkbenchPropertyInline } from '@workbench-kit/react/layout';
import {
  Button,
  Select,
  WorkbenchPropertyHint,
  WorkbenchPropertyRow,
  WorkbenchPropertySection,
  WorkbenchPropertyStack,
} from '@workbench-kit/react/primitives';
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
  const propertyId = useId();
  const operatorAddInputId = `${propertyId}-operator-add-input`;
  const operatorOutputId = `${propertyId}-operator-output`;
  const operatorInputId = `${propertyId}-operator-input`;
  const operatorAddOutputId = `${propertyId}-operator-add-output`;
  const paletteSelectId = `${propertyId}-palette-select`;
  const itemSourceId = `${propertyId}-item-source`;
  const itemTargetId = `${propertyId}-item-target`;
  const flatSources = useMemo(() => flattenSourceFields(sources), [sources]);
  const flatTargets = useMemo(() => flattenTargetSlots(targets), [targets]);
  const commitOperators = (next: readonly MappingOperator[]) => {
    if (readOnly) {
      return;
    }
    onOperatorsChange?.(next);
  };

  if (!selection) {
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--empty"
        data-testid="field-remap-detail"
        aria-label="Binding details"
      >
        <WorkbenchPropertyStack gap="sm">
          <WorkbenchPropertySection title={emptyDetailTitle}>
            <WorkbenchPropertyHint
              className="workbench-field-remap-detail__muted"
              data-testid="field-remap-detail-empty-hint"
            >
              {emptyDetailDescription}
            </WorkbenchPropertyHint>
          </WorkbenchPropertySection>
        </WorkbenchPropertyStack>
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
        <WorkbenchPropertyStack gap="sm">
          <WorkbenchPropertySection
            title="Draft convert"
            actions={
              !readOnly ? (
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
              ) : null
            }
          >
            <WorkbenchPropertyStack gap="sm">
              <WorkbenchPropertyRow label="Convert">
                <code data-testid="field-remap-detail-draft-id">
                  {definition?.label ?? draft?.transformId ?? selection.localId}
                </code>
              </WorkbenchPropertyRow>
              <WorkbenchPropertyHint className="workbench-field-remap-detail__muted">
                Wire source then target ports. When both bind, the convert note editor opens.
              </WorkbenchPropertyHint>
            </WorkbenchPropertyStack>
          </WorkbenchPropertySection>
          <WorkbenchPropertySection
            level="group"
            title="Ports"
            data-testid="field-remap-detail-draft-ports"
          >
            <WorkbenchPropertyStack gap="xs">
              <WorkbenchPropertyRow label="Source">
                <code>{draft?.sourceFieldId ?? 'Unwired'}</code>
              </WorkbenchPropertyRow>
              <WorkbenchPropertyRow label="Target">
                <code>{draft?.targetSlotId ?? 'Unwired'}</code>
              </WorkbenchPropertyRow>
            </WorkbenchPropertyStack>
          </WorkbenchPropertySection>
        </WorkbenchPropertyStack>
      </aside>
    );
  }

  if (selection.kind === 'operator') {
    if (!operator || (!readOnly && !onOperatorsChange)) {
      return (
        <aside className="workbench-field-remap-detail" data-testid="field-remap-detail">
          <WorkbenchPropertyStack gap="sm">
            <WorkbenchPropertySection title="Operator">
              <WorkbenchPropertyStack gap="sm">
                <WorkbenchPropertyRow label="Identifier">
                  <code data-testid="field-remap-detail-operator-id">{selection.operatorId}</code>
                </WorkbenchPropertyRow>
                <WorkbenchPropertyHint className="workbench-field-remap-detail__muted">
                  Host must wire onOperatorsChange for authoring.
                </WorkbenchPropertyHint>
              </WorkbenchPropertyStack>
            </WorkbenchPropertySection>
          </WorkbenchPropertyStack>
        </aside>
      );
    }
    return (
      <aside
        className="workbench-field-remap-detail workbench-field-remap-detail--operator"
        data-testid="field-remap-detail"
        aria-label="Operator details"
      >
        <WorkbenchPropertyStack gap="sm">
          <WorkbenchPropertySection
            title={operator.kind === 'combine' ? 'Combine (n→1)' : 'Split (1→n)'}
            actions={
              !readOnly ? (
                <Button
                  compact
                  type="button"
                  data-testid="field-remap-detail-delete-operator"
                  onClick={() => {
                    commitOperators(removeMappingOperator(operators, operator.id));
                    onSelectionChange(null);
                  }}
                >
                  Delete
                </Button>
              ) : null
            }
          >
            <WorkbenchPropertyRow label="Identifier">
              <code data-testid="field-remap-detail-operator-id">{operator.id}</code>
            </WorkbenchPropertyRow>
          </WorkbenchPropertySection>
          {operator.kind === 'combine' ? (
            <WorkbenchPropertySection level="group" title="Inputs">
              <WorkbenchPropertyStack gap="sm">
                <ul className="workbench-field-remap-detail__item-edges">
                  {operator.inputFieldIds.map((fieldId) => (
                    <li key={fieldId}>
                      <WorkbenchPropertyInline justify="between">
                        <code>{fieldLabel(fieldId, sources, targets)}</code>
                        {!readOnly ? (
                          <Button
                            compact
                            type="button"
                            onClick={() =>
                              commitOperators(
                                updateMappingOperator(operators, operator.id, (current) =>
                                  removeOperatorInput(current, fieldId),
                                ),
                              )
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </WorkbenchPropertyInline>
                    </li>
                  ))}
                </ul>
                {!readOnly ? (
                  <WorkbenchPropertyRow label="Add input" htmlFor={operatorAddInputId}>
                    <WorkbenchPropertyInline>
                      <Select
                        id={operatorAddInputId}
                        aria-label="Add input"
                        controlWidth="full"
                        data-testid="field-remap-operator-add-input"
                        value={pendingOperatorFieldId}
                        onValueChange={setPendingOperatorFieldId}
                      >
                        <option value="">Select…</option>
                        {flatSources.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.path ?? field.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        compact
                        type="button"
                        data-testid="field-remap-operator-bind-input"
                        disabled={!pendingOperatorFieldId}
                        onClick={() => {
                          if (!pendingOperatorFieldId) return;
                          commitOperators(
                            updateMappingOperator(operators, operator.id, (current) =>
                              bindOperatorInput(current, pendingOperatorFieldId),
                            ),
                          );
                          setPendingOperatorFieldId('');
                        }}
                      >
                        Add
                      </Button>
                    </WorkbenchPropertyInline>
                  </WorkbenchPropertyRow>
                ) : null}
                <WorkbenchPropertyRow label="Output slot" htmlFor={operatorOutputId}>
                  <Select
                    id={operatorOutputId}
                    aria-label="Output slot"
                    controlWidth="full"
                    data-testid="field-remap-operator-output"
                    value={operator.outputSlotId}
                    disabled={readOnly}
                    onValueChange={(slotId) => {
                      commitOperators(
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
                  </Select>
                </WorkbenchPropertyRow>
              </WorkbenchPropertyStack>
            </WorkbenchPropertySection>
          ) : (
            <WorkbenchPropertySection level="group" title="Outputs">
              <WorkbenchPropertyStack gap="sm">
                <WorkbenchPropertyRow label="Input field" htmlFor={operatorInputId}>
                  <Select
                    id={operatorInputId}
                    aria-label="Input field"
                    controlWidth="full"
                    data-testid="field-remap-operator-input"
                    value={operator.inputFieldId}
                    disabled={readOnly}
                    onValueChange={(fieldId) => {
                      commitOperators(
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
                  </Select>
                </WorkbenchPropertyRow>
                <ul className="workbench-field-remap-detail__item-edges">
                  {operator.outputSlotIds.map((slotId) => (
                    <li key={slotId}>
                      <WorkbenchPropertyInline justify="between">
                        <code>{fieldLabel(slotId, sources, targets)}</code>
                        {!readOnly ? (
                          <Button
                            compact
                            type="button"
                            onClick={() =>
                              commitOperators(
                                updateMappingOperator(operators, operator.id, (current) =>
                                  removeOperatorOutput(current, slotId),
                                ),
                              )
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </WorkbenchPropertyInline>
                    </li>
                  ))}
                </ul>
                {!readOnly ? (
                  <WorkbenchPropertyRow label="Add output" htmlFor={operatorAddOutputId}>
                    <WorkbenchPropertyInline>
                      <Select
                        id={operatorAddOutputId}
                        aria-label="Add output"
                        controlWidth="full"
                        data-testid="field-remap-operator-add-output"
                        value={pendingOperatorSlotId}
                        onValueChange={setPendingOperatorSlotId}
                      >
                        <option value="">Select…</option>
                        {flatTargets.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.path ?? slot.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        compact
                        type="button"
                        data-testid="field-remap-operator-bind-output"
                        disabled={!pendingOperatorSlotId}
                        onClick={() => {
                          if (!pendingOperatorSlotId) return;
                          commitOperators(
                            updateMappingOperator(operators, operator.id, (current) =>
                              bindOperatorOutput(current, pendingOperatorSlotId),
                            ),
                          );
                          setPendingOperatorSlotId('');
                        }}
                      >
                        Add
                      </Button>
                    </WorkbenchPropertyInline>
                  </WorkbenchPropertyRow>
                ) : null}
              </WorkbenchPropertyStack>
            </WorkbenchPropertySection>
          )}
        </WorkbenchPropertyStack>
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
        <WorkbenchPropertyStack gap="sm">
          <WorkbenchPropertySection title="Binding">
            <WorkbenchPropertyHint className="workbench-field-remap-detail__muted">
              Select a binding for mapping details, or a convert node to open the convert editor.
            </WorkbenchPropertyHint>
          </WorkbenchPropertySection>
        </WorkbenchPropertyStack>
      </aside>
    );
  }

  if (selection.kind === 'transformStep') {
    return (
      <WorkbenchPropertyStack gap="sm" data-testid="field-remap-detail-transform-step">
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
      </WorkbenchPropertyStack>
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
      <WorkbenchPropertyStack gap="sm">
        <WorkbenchPropertySection
          title="Binding"
          actions={
            <Button
              compact
              type="button"
              data-testid="field-remap-detail-clear"
              onClick={() => onSelectionChange(null)}
            >
              Clear
            </Button>
          }
        >
          <WorkbenchPropertyRow label="Route">
            <code data-testid="field-remap-detail-binding">
              {edge.sourceFieldId} → {edge.targetSlotId}
            </code>
          </WorkbenchPropertyRow>
        </WorkbenchPropertySection>

        <WorkbenchPropertySection level="group" title="Convert chain">
          <WorkbenchPropertyStack gap="sm">
            {chain.length === 0 ? (
              <WorkbenchPropertyHint className="workbench-field-remap-detail__muted">
                Direct (no convert)
              </WorkbenchPropertyHint>
            ) : (
              <ol className="workbench-field-remap-detail__steps">
                {chain.map((transformId, index) => {
                  const definition = transforms.get(transformId);
                  return (
                    <li key={`${edge.id}-${index}-${transformId}`}>
                      <WorkbenchPropertyInline justify="between">
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
                          <WorkbenchPropertyHint className="workbench-field-remap-detail__step-hint">
                            {readOnly ? 'Inspect convert' : 'Edit convert'}
                          </WorkbenchPropertyHint>
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
                      </WorkbenchPropertyInline>
                    </li>
                  );
                })}
              </ol>
            )}

            {!readOnly && chain.length < MAX_TRANSFORM_CHAIN ? (
              <WorkbenchPropertyRow label="Add convert" htmlFor={paletteSelectId}>
                <WorkbenchPropertyInline
                  className="workbench-field-remap-detail__palette"
                  data-testid="field-remap-transform-palette"
                >
                  <Select
                    id={paletteSelectId}
                    aria-label="Convert palette"
                    controlWidth="full"
                    data-testid="field-remap-palette-select"
                    value={effectivePaletteId}
                    disabled={appendCatalog.length === 0}
                    onValueChange={setPaletteId}
                  >
                    {appendCatalog.length === 0 ? (
                      <option value="">No compatible converts</option>
                    ) : null}
                    {appendCatalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
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
                </WorkbenchPropertyInline>
              </WorkbenchPropertyRow>
            ) : null}
          </WorkbenchPropertyStack>
        </WorkbenchPropertySection>

        {listContextEnabled ? (
          <WorkbenchPropertySection
            level="group"
            title="List context"
            data-testid="field-remap-list-context"
            actions={
              !readOnly && !edge.itemEdges ? (
                <Button
                  compact
                  type="button"
                  data-testid="field-remap-enable-list-context"
                  onClick={() => applyEdge(enableListContextOnEdge(edge))}
                >
                  Enable item fields
                </Button>
              ) : null
            }
          >
            {edge.itemEdges ? (
              <WorkbenchPropertyStack gap="sm">
                {!readOnly ? (
                  <WorkbenchPropertyHint className="workbench-field-remap-detail__muted">
                    {pendingItemSourceId
                      ? 'Select a target item field to complete the item binding.'
                      : 'Select a source item field, then a target item field.'}
                  </WorkbenchPropertyHint>
                ) : null}
                {!readOnly ? (
                  <WorkbenchPropertyStack
                    className="workbench-field-remap-detail__item-pickers"
                    gap="xs"
                  >
                    <WorkbenchPropertyRow label="Source item field" htmlFor={itemSourceId}>
                      <Select
                        id={itemSourceId}
                        aria-label="Source item field"
                        controlWidth="full"
                        data-testid="field-remap-item-source"
                        value={pendingItemSourceId ?? ''}
                        onValueChange={(sourceId) => setPendingItemSourceId(sourceId || null)}
                      >
                        <option value="">Select…</option>
                        {itemSourceChildren.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.path ?? child.label}
                          </option>
                        ))}
                      </Select>
                    </WorkbenchPropertyRow>
                    <WorkbenchPropertyRow label="Target item field" htmlFor={itemTargetId}>
                      <Select
                        id={itemTargetId}
                        aria-label="Target item field"
                        controlWidth="full"
                        data-testid="field-remap-item-target"
                        value=""
                        disabled={!pendingItemSourceId}
                        onValueChange={(targetId) => {
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
                      </Select>
                    </WorkbenchPropertyRow>
                  </WorkbenchPropertyStack>
                ) : null}
                <ul className="workbench-field-remap-detail__item-edges">
                  {(edge.itemEdges ?? []).map((itemEdge) => (
                    <li key={itemEdge.id} data-testid={`field-remap-item-edge-${itemEdge.id}`}>
                      <WorkbenchPropertyInline justify="between">
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
                      </WorkbenchPropertyInline>
                    </li>
                  ))}
                </ul>
              </WorkbenchPropertyStack>
            ) : null}
          </WorkbenchPropertySection>
        ) : null}
      </WorkbenchPropertyStack>
    </aside>
  );
}
