import { useMemo, useState, type JSX } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createBuiltinValueTransformRegistry } from '@workbench-kit/field-remap';
import {
  FieldRemapFlowMapper,
  FieldRemapPanel,
  getFieldRemapSample,
  type FieldRemapFlowMapperProps,
  type FieldRemapPanelProps,
  type FieldRemapPreviewState,
  type FieldRemapSelection,
} from '@workbench-kit/shell-react/field-remap';

type PreviewMode = 'ready' | 'hidden' | 'no-sample';

function waitForPreviewDelay(value: unknown, signal: AbortSignal | undefined): Promise<unknown> {
  const delayMs = value === 'slow result' ? 250 : 20;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    }, delayMs);
    const onAbort = (): void => {
      window.clearTimeout(timeout);
      reject(new DOMException('Superseded preview', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function FieldRemapPreviewScenario(): JSX.Element {
  const transforms = useMemo(() => createBuiltinValueTransformRegistry(), []);
  const sources = useMemo<FieldRemapFlowMapperProps['sources']>(
    () => [
      {
        id: 'source.value',
        label: 'value',
        path: 'value',
        dataType: 'string',
        sampleValue: 'Ada',
      },
    ],
    [],
  );
  const targets = useMemo<FieldRemapFlowMapperProps['targets']>(
    () => [
      {
        id: 'target.name',
        label: 'name',
        path: 'name',
        dataType: 'string',
      },
    ],
    [],
  );
  const edge: FieldRemapFlowMapperProps['edges'][number] = {
    id: 'edge-value',
    sourceFieldId: 'source.value',
    targetSlotId: 'target.name',
    transformIds: ['identity'],
  };
  const operator: NonNullable<FieldRemapFlowMapperProps['operators']>[number] = {
    kind: 'combine',
    id: 'op-preview',
    inputFieldIds: [edge.sourceFieldId],
    outputSlotId: edge.targetSlotId,
  };
  const readyPreview: FieldRemapPreviewState = {
    status: 'ready',
    result: {
      output: { final: 'post-operator document output' },
      slots: [
        {
          edgeId: edge.id,
          targetSlotId: edge.targetSlotId,
          path: 'name',
          value: 'edge-local binding value',
        },
      ],
    },
  };
  const [selection, setSelection] = useState<FieldRemapSelection>(null);
  const [mode, setMode] = useState<PreviewMode>('ready');
  const preview: FieldRemapPreviewState =
    mode === 'no-sample' ? { status: 'unavailable', reason: 'no-sample' } : readyPreview;

  return (
    <div style={{ minBlockSize: '30rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <button type="button" onClick={() => setSelection(null)}>
          Document preview
        </button>
        <button type="button" onClick={() => setSelection({ kind: 'edge', edgeId: edge.id })}>
          Edge preview
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: 'transformStep', edgeId: edge.id, stepIndex: 0 })}
        >
          Step preview
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: 'operator', operatorId: operator.id })}
        >
          Operator preview
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: 'draft', localId: 'draft-preview' })}
        >
          Draft preview
        </button>
        <button type="button" onClick={() => setMode('ready')}>
          Ready preview
        </button>
        <button type="button" onClick={() => setMode('no-sample')}>
          No sample
        </button>
        <button type="button" onClick={() => setMode('hidden')}>
          Hide preview
        </button>
      </div>
      <FieldRemapFlowMapper
        chrome="embed"
        emptyDetail="collapse"
        sources={sources}
        targets={targets}
        edges={[edge]}
        transforms={transforms}
        onEdgesChange={() => {}}
        operators={[operator]}
        selection={selection}
        onSelectionChange={setSelection}
        preview={preview}
        showPreview={mode !== 'hidden'}
      />
    </div>
  );
}

function FieldRemapLatestResultScenario(): JSX.Element {
  const sample = getFieldRemapSample('nested-ab');
  const [sourceSample, setSourceSample] = useState<Record<string, unknown>>({
    ...sample.source,
    user_name: 'initial result',
  });
  const transforms = useMemo(() => {
    const registry = createBuiltinValueTransformRegistry();
    registry.register({
      id: 'preview:delayed',
      label: 'Delayed preview evidence',
      apply: (value, context) => waitForPreviewDelay(value, context.signal),
    });
    return registry;
  }, []);
  const edges = useMemo<NonNullable<FieldRemapPanelProps['edges']>>(
    () => [{ ...sample.edges[0]!, transformIds: ['preview:delayed'] }, ...sample.edges.slice(1)],
    [sample],
  );

  return (
    <div style={{ minBlockSize: '36rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <button
          type="button"
          onClick={() => setSourceSample({ ...sample.source, user_name: 'slow result' })}
        >
          Run slow preview
        </button>
        <button
          type="button"
          onClick={() => setSourceSample({ ...sample.source, user_name: 'latest result' })}
        >
          Run latest preview
        </button>
      </div>
      <FieldRemapPanel
        sample={sample}
        sourceSample={sourceSample}
        edges={edges}
        onEdgesChange={() => {}}
        transforms={transforms}
        editableShapes={false}
        chrome="embed"
        emptyDetail="collapse"
        showFlowPreview
      />
    </div>
  );
}

const meta = {
  title: 'Workbench Sample/Field Remap/Preview',
  component: FieldRemapPreviewScenario,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FieldRemapPreviewScenario>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InjectedRuntimePreview: Story = {
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const previewValue = () => canvas.queryByTestId('field-remap-preview-value');

    await expect(await canvas.findByTestId('field-remap-preview')).toBeVisible();
    await expect(previewValue()).toHaveTextContent('post-operator document output');

    await userEvent.click(canvas.getByRole('button', { name: 'Edge preview' }));
    await expect(previewValue()).toHaveTextContent('edge-local binding value');

    await userEvent.click(canvas.getByRole('button', { name: 'Step preview' }));
    await expect(canvas.getByTestId('field-remap-preview-notice')).toHaveTextContent(
      'Per-step intermediate values are unavailable',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Operator preview' }));
    await expect(previewValue()).toHaveTextContent('post-operator document output');
    await expect(canvas.getByTestId('field-remap-preview-notice')).toHaveTextContent(
      'Selected-operator intermediate values are unavailable',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Draft preview' }));
    await expect(canvas.getByTestId('field-remap-preview-unavailable')).toHaveTextContent(
      'not executable',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'No sample' }));
    await waitFor(() => expect(canvas.queryByTestId('field-remap-preview')).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Ready preview' }));
    await expect(await canvas.findByTestId('field-remap-preview')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Hide preview' }));
    await waitFor(() => expect(canvas.queryByTestId('field-remap-preview')).toBeNull());
  },
};

export const LatestPanelRuntimePreview: Story = {
  tags: ['storybook-play-required', 'storybook-play-sample'],
  render: () => <FieldRemapLatestResultScenario />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panelValue = () => canvas.getByTestId('field-remap-result');
    const railValue = () => canvas.getByTestId('field-remap-preview-value');

    await waitFor(() => expect(panelValue()).toHaveTextContent('initial result'));
    await expect(railValue()).toHaveTextContent('initial result');

    await userEvent.click(canvas.getByRole('button', { name: 'Run slow preview' }));
    await expect(await canvas.findByTestId('field-remap-preview-loading')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Run latest preview' }));

    await waitFor(() => expect(panelValue()).toHaveTextContent('latest result'));
    await expect(railValue()).toHaveTextContent('latest result');
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    await expect(panelValue()).not.toHaveTextContent('slow result');
    await expect(railValue()).not.toHaveTextContent('slow result');
  },
};
