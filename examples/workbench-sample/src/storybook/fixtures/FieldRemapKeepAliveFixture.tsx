import { useRef, useState, type JSX } from 'react';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import {
  FieldRemapFlowMapper,
  type FieldRemapFlowActions,
} from '@workbench-kit/shell-react/field-remap';

const sources: readonly SourceField[] = [
  { id: 'source.name', label: 'Source name', dataType: 'string' },
];

const targets: readonly TargetSlot[] = [
  { id: 'target.name', label: 'Target name', dataType: 'string' },
];

const initialEdges: readonly MappingEdge[] = [
  {
    id: 'keep-alive-name',
    sourceFieldId: 'source.name',
    targetSlotId: 'target.name',
    transformIds: ['string:trim'],
  },
];

const transforms = createBuiltinValueTransformRegistry();

export function FieldRemapKeepAliveFixture(): JSX.Element {
  const [visible, setVisible] = useState(false);
  const [fitRequests, setFitRequests] = useState(0);
  const [edges, setEdges] = useState(initialEdges);
  const flowActionsRef = useRef<FieldRemapFlowActions | null>(null);

  return (
    <section data-testid="field-remap-keep-alive-fixture">
      <div aria-label="Keep-alive host controls" role="group">
        <button
          data-testid="field-remap-keep-alive-show"
          disabled={visible}
          type="button"
          onClick={() => setVisible(true)}
        >
          Show mapping canvas
        </button>
        <button
          data-testid="field-remap-keep-alive-hide"
          disabled={!visible}
          type="button"
          onClick={() => setVisible(false)}
        >
          Hide mapping canvas
        </button>
        <button
          data-testid="field-remap-keep-alive-fit"
          type="button"
          onClick={() => {
            setFitRequests((count) => count + 1);
            flowActionsRef.current?.fitView();
          }}
        >
          Fit mapping canvas
        </button>
      </div>

      <output data-testid="field-remap-keep-alive-state">
        {visible ? 'Host pane visible' : 'Host pane hidden'}
      </output>
      <output data-testid="field-remap-keep-alive-fit-requests">{fitRequests}</output>

      <div
        data-testid="field-remap-keep-alive-host"
        data-visible={visible ? 'true' : 'false'}
        style={{
          blockSize: '40rem',
          display: visible ? 'block' : 'none',
          inlineSize: '72rem',
          maxInlineSize: '100%',
        }}
      >
        <FieldRemapFlowMapper
          chrome="embed"
          edges={edges}
          emptyDetail="collapse"
          flowActionsRef={flowActionsRef}
          onEdgesChange={setEdges}
          showBindingsList={false}
          showConvertPalette={false}
          showMinimap={false}
          sources={sources}
          targets={targets}
          transforms={transforms}
        />
      </div>
    </section>
  );
}
