import { useId, useMemo, type JSX } from 'react';
import {
  Button,
  Select,
  WorkbenchPropertyHint,
  WorkbenchPropertyRow,
  WorkbenchPropertySection,
  WorkbenchPropertyStack,
} from '@workbench-kit/react/primitives';
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
  readonly readOnly?: boolean | undefined;
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
  readOnly = false,
}: ConvertNoteEditorProps): JSX.Element | null {
  const transformSelectId = useId();
  const chain = edge.transformIds ?? [];
  const transformId = chain[stepIndex];

  const portTypes = useMemo(() => edgePortTypes(edge, sources, targets), [edge, sources, targets]);

  // ValueTransformRegistry is intentionally mutable (`register`). Resolve its
  // display contract on render so a host rerender sees replacement definitions.
  const optionFields = optionFieldsForStep(transforms, transformId);

  const optionValue = useMemo(() => {
    if (!transformId) {
      return {};
    }
    return resolveOptionSteps(chain, edge.transformOptionSteps)[stepIndex] ?? {};
  }, [chain, edge.transformOptionSteps, stepIndex, transformId]);

  const replaceCatalog = listCompatibleTransforms({
    registry: transforms,
    edge,
    stepIndex,
    sourceType: portTypes.sourceType,
    targetType: portTypes.targetType,
    mode: 'replace',
  });

  if (!transformId) {
    return null;
  }

  const definition = transforms.get(transformId);
  const stepLabel = definition?.label ?? transformId;

  const applyEdge = (next: MappingEdge | null) => {
    if (readOnly || !next) {
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
      <WorkbenchPropertyStack gap="sm">
        <WorkbenchPropertySection
          title="Convert"
          actions={
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
          }
        >
          <WorkbenchPropertyRow label="Transform">
            <strong data-testid="field-remap-convert-note-title">{stepLabel}</strong>
          </WorkbenchPropertyRow>
          <WorkbenchPropertyRow label="Binding">
            <code
              className="workbench-field-remap-convert-note__binding"
              data-testid="field-remap-convert-note-binding"
            >
              {edge.sourceFieldId} → {edge.targetSlotId}
            </code>
          </WorkbenchPropertyRow>
          <WorkbenchPropertyHint className="workbench-field-remap-convert-note__muted">
            Step {stepIndex + 1} of {chain.length} on this binding
          </WorkbenchPropertyHint>
        </WorkbenchPropertySection>

        <WorkbenchPropertySection title="Transform" data-testid="field-remap-step-settings">
          <WorkbenchPropertyRow htmlFor={transformSelectId} label="Registry id">
            <Select
              id={transformSelectId}
              aria-label="Convert transform id"
              controlWidth="full"
              data-testid="field-remap-step-id"
              value={transformId}
              disabled={readOnly}
              onValueChange={(nextTransformId) => {
                applyEdge(
                  setTransformStepIdOnEdge(edge, stepIndex, nextTransformId, {
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
            </Select>
          </WorkbenchPropertyRow>
        </WorkbenchPropertySection>

        <WorkbenchPropertySection title="Options">
          <TransformOptionsEditor
            fields={optionFields}
            value={optionValue}
            disabled={readOnly}
            onChange={(nextOptions) => {
              applyEdge(replaceTransformStepOptionsOnEdge(edge, stepIndex, nextOptions));
            }}
          />
        </WorkbenchPropertySection>

        {!readOnly ? (
          <WorkbenchPropertySection title="Actions">
            <WorkbenchPropertyRow label="Convert step">
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
            </WorkbenchPropertyRow>
          </WorkbenchPropertySection>
        ) : null}
      </WorkbenchPropertyStack>
    </aside>
  );
}
