import { useState, type JSX } from 'react';
import {
  createValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import { FieldRemapFlowMapper } from '@workbench-kit/shell-react/field-remap';

const sources: readonly SourceField[] = [
  { id: 'source.value', label: 'Source value', dataType: 'string' },
];

const targets: readonly TargetSlot[] = [
  { id: 'target.value', label: 'Target value', dataType: 'string' },
];

const initialEdges: readonly MappingEdge[] = [
  {
    id: 'property-options',
    sourceFieldId: 'source.value',
    targetSlotId: 'target.value',
    transformIds: ['story:property-options'],
    transformOptionSteps: [
      {
        prefix: 'Before',
        maxLength: 12,
        enabled: true,
        codeLabels: { A: 'Alpha' },
        meta: { mode: 'strict' },
      },
    ],
  },
];

const transforms = createValueTransformRegistry([
  {
    id: 'story:property-options',
    label: 'Property options',
    inputTypes: ['string'],
    outputType: 'string',
    optionFields: [
      { key: 'prefix', label: 'Prefix', kind: 'string' },
      { key: 'maxLength', label: 'Max length', kind: 'number' },
      { key: 'enabled', label: 'Enabled', kind: 'boolean' },
      { key: 'codeLabels', label: 'Code labels', kind: 'stringMap' },
      { key: 'meta', label: 'Meta', kind: 'json' },
    ],
    apply: (value) => value,
  },
]);

export interface FieldRemapPropertyStackFixtureProps {
  readonly detailPresentation: 'rail' | 'modal';
  readonly readOnly?: boolean;
}

export function FieldRemapPropertyStackFixture({
  detailPresentation,
  readOnly = false,
}: FieldRemapPropertyStackFixtureProps): JSX.Element {
  const [edges, setEdges] = useState(initialEdges);
  const options = edges[0]?.transformOptionSteps?.[0] ?? {};

  return (
    <div
      data-testid="field-remap-property-stack-fixture"
      style={{ blockSize: '46rem', inlineSize: '72rem', maxInlineSize: '100%' }}
    >
      <FieldRemapFlowMapper
        sources={sources}
        targets={targets}
        edges={edges}
        transforms={transforms}
        onEdgesChange={(next) => setEdges(next)}
        detailPresentation={detailPresentation}
        readOnly={readOnly}
        chrome="embed"
        emptyDetail="collapse"
        showBindingsList
        showConvertPalette={false}
        showMinimap={false}
      />
      <output hidden data-testid="field-remap-property-options-state">
        {JSON.stringify(options)}
      </output>
    </div>
  );
}
