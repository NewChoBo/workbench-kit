import { useMemo, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import {
  optionFieldsForStep,
  resolveOptionSteps,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import {
  edgePortTypes,
  listCompatibleTransforms,
  removeTransformStepFromEdge,
  replaceTransformStepOptionsOnEdge,
  setTransformStepIdOnEdge,
  type FieldRemapSelection,
} from './flow-ops.js';
import { TransformOptionsEditor } from './transform-options-editor.js';

export interface ConvertNoteEditorProps {
  readonly edge: MappingEdge;
  readonly stepIndex: number;
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly transforms: ValueTransformRegistry;
  readonly onEdgesChange: (edges: readonly MappingEdge[]) => void;
  readonly edges: readonly MappingEdge[];
  readonly onSelectionChange: (next: FieldRemapSelection) => void;
}

/**
 * Dedicated convert-note authoring surface for a selected `xf:*` step.
 * Kept separate from binding / list-context chrome on the Flow detail rail.
 */
export function ConvertNoteEditor({
  edge,
  stepIndex,
  sources,
  targets,
  transforms,
  edges,
  onEdgesChange,
  onSelectionChange,
}: ConvertNoteEditorProps): JSX.Element | null {
  const chain = edge.transformIds ?? [];
  const transformId = chain[stepIndex];

  const portTypes = useMemo(() => edgePortTypes(edge, sources, targets), [edge, sources, targets]);

  const optionFields = useMemo(
    () => optionFieldsForStep(transforms, transformId),
    [transforms, transformId],
  );

  const optionValue = useMemo(() => {
    if (!transformId) {
      return {};
    }
    return (
      resolveOptionSteps(chain, edge.transformOptionSteps, edge.transformOptions)[stepIndex] ?? {}
    );
  }, [chain, edge.transformOptionSteps, edge.transformOptions, stepIndex, transformId]);

  const replaceCatalog = useMemo(
    () =>
      listCompatibleTransforms({
        registry: transforms,
        edge,
        stepIndex,
        sourceType: portTypes.sourceType,
        targetType: portTypes.targetType,
        mode: 'replace',
      }),
    [edge, portTypes.sourceType, portTypes.targetType, stepIndex, transforms],
  );

  if (!transformId) {
    return null;
  }

  const definition = transforms.get(transformId);
  const stepLabel = definition?.label ?? transformId;

  const applyEdge = (next: MappingEdge | null) => {
    if (!next) {
      return;
    }
    onEdgesChange(edges.map((item) => (item.id === edge.id ? next : item)));
  };

  return (
    <aside
      className="workbench-field-remap-convert-note"
      data-testid="field-remap-convert-note"
      aria-label="Convert note editor"
    >
      <div className="workbench-field-remap-convert-note__header">
        <div>
          <p className="workbench-field-remap-convert-note__eyebrow">Convert</p>
          <h4 data-testid="field-remap-convert-note-title">{stepLabel}</h4>
          <code
            className="workbench-field-remap-convert-note__binding"
            data-testid="field-remap-convert-note-binding"
          >
            {edge.sourceFieldId} → {edge.targetSlotId}
          </code>
          <p className="workbench-field-remap-convert-note__muted">
            Step {stepIndex + 1} of {chain.length} on this binding
          </p>
        </div>
        <div className="workbench-field-remap-convert-note__actions">
          <Button
            compact
            type="button"
            data-testid="field-remap-convert-note-back"
            onClick={() => onSelectionChange({ kind: 'edge', edgeId: edge.id })}
          >
            Binding
          </Button>
          <Button
            compact
            type="button"
            data-testid="field-remap-convert-note-clear"
            onClick={() => onSelectionChange(null)}
          >
            Close
          </Button>
        </div>
      </div>

      <section
        className="workbench-field-remap-convert-note__section"
        aria-labelledby="field-remap-convert-note-registry"
        data-testid="field-remap-step-settings"
      >
        <h5 id="field-remap-convert-note-registry">Transform</h5>
        <label className="workbench-field-remap-convert-note__field">
          <span>Registry id</span>
          <select
            aria-label="Convert transform id"
            data-testid="field-remap-step-id"
            value={transformId}
            onChange={(event) => {
              applyEdge(
                setTransformStepIdOnEdge(edge, stepIndex, event.target.value, {
                  registry: transforms,
                  sourceType: portTypes.sourceType,
                  targetType: portTypes.targetType,
                }),
              );
            }}
          >
            {!replaceCatalog.some((item) => item.id === transformId) ? (
              <option value={transformId}>{transformId}</option>
            ) : null}
            {replaceCatalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section
        className="workbench-field-remap-convert-note__section"
        aria-labelledby="field-remap-convert-note-options"
      >
        <h5 id="field-remap-convert-note-options">Options</h5>
        <TransformOptionsEditor
          fields={optionFields}
          value={optionValue}
          onChange={(nextOptions) => {
            applyEdge(replaceTransformStepOptionsOnEdge(edge, stepIndex, nextOptions));
          }}
        />
      </section>

      <div className="workbench-field-remap-convert-note__footer">
        <Button
          compact
          type="button"
          data-testid="field-remap-convert-note-remove"
          onClick={() => {
            const next = removeTransformStepFromEdge(edge, stepIndex);
            applyEdge(next);
            const nextLen = next.transformIds?.length ?? 0;
            if (nextLen === 0) {
              onSelectionChange({ kind: 'edge', edgeId: edge.id });
            } else {
              onSelectionChange({
                kind: 'transformStep',
                edgeId: edge.id,
                stepIndex: Math.min(stepIndex, nextLen - 1),
              });
            }
          }}
        >
          Remove convert
        </Button>
      </div>
    </aside>
  );
}
