import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  findParentChildMappingConflicts,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  withConversionEdges,
  type MappingEdge,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

import { FieldRemapFlowMapper } from './flow.js';
import {
  getFieldRemapSample,
  type FieldRemapSampleDefinition,
  type FieldRemapSampleId,
} from './samples.js';
import { jsonataValueTransform } from './jsonata-transform.js';
import './view.css';

export interface FieldRemapPanelProps {
  /** Catalog sample id, or a full sample definition. */
  readonly sample?: FieldRemapSampleId | FieldRemapSampleDefinition | undefined;
  /** Optional host-owned transform registry (defaults to builtins + JSONata). */
  readonly transforms?: ValueTransformRegistry | undefined;
  readonly className?: string | undefined;
}

type FieldRemapPreviewResult = {
  readonly output: Record<string, unknown>;
  readonly error?: string;
};

function resolveSample(sample: FieldRemapPanelProps['sample']): FieldRemapSampleDefinition {
  if (!sample) {
    return getFieldRemapSample('nested-ab');
  }
  if (typeof sample === 'string') {
    return getFieldRemapSample(sample);
  }
  return sample;
}

/**
 * Self-contained field-remap workbench panel:
 * XYFlow mapper + convertToShape preview for one A→B (or T_A→T_B) sample.
 *
 * Remount with `key={sampleId}` when switching catalog entries so edge state resets.
 */
export function FieldRemapPanel({
  sample: sampleProp,
  transforms: transformsProp,
  className,
}: FieldRemapPanelProps): JSX.Element {
  const sample = resolveSample(sampleProp);
  const registry = useMemo(() => {
    if (transformsProp) {
      return transformsProp;
    }
    const next = createBuiltinValueTransformRegistry();
    next.register(jsonataValueTransform);
    return next;
  }, [transformsProp]);

  const [edges, setEdges] = useState<readonly MappingEdge[]>(() => [...sample.edges]);
  const [result, setResult] = useState<FieldRemapPreviewResult>({ output: {} });

  const sourceFields = useMemo(
    () => sourceFieldsFromPlainObject(sample.source, { idPrefix: sample.sourceIdPrefix }),
    [sample],
  );
  const targetSlots = useMemo(
    () => targetSlotsFromPlainObject(sample.targetShape, { idPrefix: sample.targetIdPrefix }),
    [sample],
  );

  const shapes = useMemo(
    () => [
      defineDataShape({
        id: sample.sourceIdPrefix,
        label: sample.sourceLabel,
        role: 'source',
        fields: sourceFields,
      }),
      defineDataShape({
        id: sample.targetIdPrefix,
        label: sample.targetLabel,
        role: 'target',
        fields: targetSlots,
      }),
    ],
    [sample, sourceFields, targetSlots],
  );

  const conflicts = useMemo(
    () => findParentChildMappingConflicts(edges, sourceFields, targetSlots),
    [edges, sourceFields, targetSlots],
  );

  useEffect(() => {
    let cancelled = false;
    const conversion = withConversionEdges(
      defineConversion({
        id: `${sample.sourceIdPrefix}→${sample.targetIdPrefix}`,
        sourceShapeIds: [sample.sourceIdPrefix],
        targetShapeId: sample.targetIdPrefix,
        edges: [...sample.edges],
      }),
      edges,
    );

    void convertToShape({
      conversion,
      shapes,
      inputs: { [sample.sourceIdPrefix]: sample.source },
      transforms: registry,
    })
      .then((next) => {
        if (!cancelled) {
          setResult({ output: next.output });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            output: {},
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [edges, registry, sample, shapes]);

  return (
    <div
      className={['workbench-field-remap-demo', className].filter(Boolean).join(' ')}
      data-testid="field-remap-demo"
      data-sample-id={sample.id}
    >
      <header className="workbench-field-remap-demo__header">
        <h2 className="workbench-field-remap-demo__title">{sample.title}</h2>
        <p className="workbench-field-remap-demo__intro">{sample.description}</p>
      </header>

      <FieldRemapFlowMapper
        sources={sourceFields}
        targets={targetSlots}
        edges={edges}
        transforms={registry}
        onEdgesChange={setEdges}
        sourceTitle={sample.sourceLabel}
        targetTitle={sample.targetLabel}
      />

      {conflicts.length > 0 ? (
        <p
          className="workbench-field-remap-demo__warn"
          role="status"
          data-testid="field-remap-conflicts"
        >
          Warning: parent and child fields are both mapped (
          {conflicts.map((item) => `${item.parentId} / ${item.childId}`).join('; ')}). Prefer one
          level.
        </p>
      ) : null}

      {result.error ? (
        <p className="workbench-field-remap-demo__error" role="alert">
          {result.error}
        </p>
      ) : null}

      <div className="workbench-field-remap-demo__panes">
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-source">
          <h3 id="field-remap-source">{sample.sourceLabel}</h3>
          <pre data-testid="field-remap-input">{JSON.stringify(sample.source, null, 2)}</pre>
        </section>
        <section className="workbench-field-remap-demo__pane" aria-labelledby="field-remap-target">
          <h3 id="field-remap-target">{sample.targetLabel}</h3>
          <pre data-testid="field-remap-result">{JSON.stringify(result.output, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
