import { useState, type JSX } from 'react';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import { FieldRemapFlowMapper } from '@workbench-kit/shell-react/field-remap';

const sources: readonly SourceField[] = [
  { id: 'source.first', label: 'First name', dataType: 'string' },
  { id: 'source.last', label: 'Last name', dataType: 'string' },
];

const targets: readonly TargetSlot[] = [
  { id: 'target.fullName', label: 'Full name', dataType: 'string' },
  { id: 'target.alias', label: 'Alias', dataType: 'string' },
];

const initialEdges: readonly MappingEdge[] = [
  {
    id: 'story-edge',
    sourceFieldId: 'source.first',
    targetSlotId: 'target.alias',
    transformIds: ['string:trim'],
  },
];

const inspectOperator: MappingOperator = {
  kind: 'combine',
  id: 'story-inspect-combine',
  inputFieldIds: ['source.first', 'source.last'],
  outputSlotId: 'target.fullName',
};

const transforms = createBuiltinValueTransformRegistry();

export function FieldRemapOperatorEmbedFixture({
  mode,
}: {
  readonly mode: 'author' | 'inspect';
}): JSX.Element {
  const [edges, setEdges] = useState(initialEdges);
  const [operators, setOperators] = useState<readonly MappingOperator[]>(() =>
    mode === 'author' ? [] : [inspectOperator],
  );
  const [operatorCommits, setOperatorCommits] = useState(0);

  const commitOperators = (next: readonly MappingOperator[]) => {
    setOperatorCommits((count) => count + 1);
    setOperators(next);
  };

  return (
    <section data-testid={`field-remap-operator-embed-${mode}`}>
      <output data-testid="field-remap-operator-embed-state">
        {JSON.stringify({
          operatorCommits,
          operators: operators.map((operator) => ({ id: operator.id, kind: operator.kind })),
        })}
      </output>

      <FieldRemapFlowMapper
        chrome="embed"
        edges={edges}
        emptyDetail="collapse"
        onEdgesChange={setEdges}
        operators={operators}
        showBindingsList={false}
        showMinimap={false}
        sources={sources}
        targets={targets}
        transforms={transforms}
        {...(mode === 'author'
          ? { onOperatorsChange: commitOperators }
          : { selection: { kind: 'operator' as const, operatorId: inspectOperator.id } })}
      />
    </section>
  );
}
