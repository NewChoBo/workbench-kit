/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, createRef } from 'react';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
  type MappingOperator,
} from '@workbench-kit/field-remap';

import {
  FieldRemapPanel,
  type FieldRemapHistoryActions,
  type FieldRemapHistoryOwner,
  type FieldRemapHistorySnapshot,
} from './panel.js';
import { getFieldRemapBrowseDemoShapes, getFieldRemapSample } from './samples.js';

async function clickTestId(container: HTMLElement, testId: string): Promise<void> {
  const button = container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  expect(button).toBeTruthy();
  await act(async () => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('FieldRemapPanel', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeAll(() => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('keeps uncontrolled sample demos working', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<FieldRemapPanel sample="nested-ab" editableShapes={false} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-edges-mode="uncontrolled"]')).toBeTruthy();
    const output = JSON.parse(
      container.querySelector('[data-testid="field-remap-result"]')?.textContent ?? '{}',
    );
    expect(output.name).toBe('Ada Lovelace');
  });

  it('round-trips controlled edges without remounting', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    const sample = getFieldRemapSample('nested-ab');
    const sources = sourceFieldsFromPlainObject(sample.source, {
      idPrefix: sample.sourceIdPrefix,
    });
    const targets = targetSlotsFromPlainObject(sample.targetShape, {
      idPrefix: sample.targetIdPrefix,
    });
    let edges: readonly MappingEdge[] = [...sample.edges];
    const onEdgesChange = vi.fn((next: readonly MappingEdge[]) => {
      edges = next;
    });

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          edges={edges}
          onEdgesChange={onEdgesChange}
          sources={sources}
          targets={targets}
          sourceSample={sample.source}
          transforms={createBuiltinValueTransformRegistry()}
        />,
      );
    });

    expect(container.querySelector('[data-edges-mode="controlled"]')).toBeTruthy();

    const trimmed: MappingEdge[] = edges.map((edge) =>
      edge.id === 'e-name' ? { ...edge, transformIds: ['string:trim', 'string:upper'] } : edge,
    );

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          edges={trimmed}
          onEdgesChange={onEdgesChange}
          sources={sources}
          targets={targets}
          sourceSample={sample.source}
          transforms={createBuiltinValueTransformRegistry()}
        />,
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-edges-mode="controlled"]')).toBeTruthy();
    expect(onEdgesChange).not.toHaveBeenCalled();
    const output = JSON.parse(
      container.querySelector('[data-testid="field-remap-result"]')?.textContent ?? '{}',
    );
    // Host-updated transform chain is reflected in preview without remount.
    expect(output.name).toBe('ADA LOVELACE');
  });

  it('renders browse I/O chrome when ioChrome is browse', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<FieldRemapPanel sample="nested-ab" ioChrome="browse" />);
    });

    expect(container.querySelector('[data-testid="field-remap-io-browse"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="field-remap-shapes"]')).toBeNull();
  });

  it('forwards embed chrome and explicit Flow visibility overrides', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample="nested-ab"
          chrome="embed"
          showFlowHint
          showBindingsList
          showConvertPalette={false}
        />,
      );
    });

    const mapper = container.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-chrome')).toBe('embed');
    expect(container.querySelector('[data-testid="field-remap-hint"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="field-remap-edges"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="field-remap-convert-palette"]')).toBeNull();
  });

  it('undoes and redoes an uncontrolled semantic edge edit', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample="nested-ab"
          editableShapes={false}
          historyActionsRef={historyActionsRef}
        />,
      );
    });

    expect(historyActionsRef.current?.canUndo).toBe(false);
    await clickTestId(container, 'field-remap-remove-edge-e-name');
    expect(container.querySelector('[data-testid="field-remap-lane-e-name"]')).toBeNull();
    expect(historyActionsRef.current?.canUndo).toBe(true);

    await act(async () => historyActionsRef.current?.undo());
    expect(container.querySelector('[data-testid="field-remap-lane-e-name"]')).toBeTruthy();
    expect(historyActionsRef.current?.canRedo).toBe(true);

    await act(async () => historyActionsRef.current?.redo());
    expect(container.querySelector('[data-testid="field-remap-lane-e-name"]')).toBeNull();
  });

  it('records the full hidden-edge projection before an edit', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();
    const sample = getFieldRemapSample('nested-ab');
    const browseShapes = getFieldRemapBrowseDemoShapes();
    const hiddenEdge: MappingEdge = {
      id: 'e-hidden',
      sourceFieldId: 'a.profile.internal_id',
      targetSlotId: 'b.title',
    };
    const onEdgesChange = vi.fn();

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={{ ...sample, edges: [...sample.edges, hiddenEdge] }}
          editableShapes={false}
          sources={browseShapes.sources}
          targets={browseShapes.targets}
          onEdgesChange={onEdgesChange}
          historyActionsRef={historyActionsRef}
        />,
      );
    });

    expect(container.querySelector('[data-testid="field-remap-lane-e-hidden"]')).toBeNull();
    await clickTestId(container, 'field-remap-remove-edge-e-name');
    expect(onEdgesChange.mock.lastCall?.[0].map((edge: MappingEdge) => edge.id)).toContain(
      'e-hidden',
    );

    await act(async () => historyActionsRef.current?.undo());
    expect(onEdgesChange.mock.lastCall?.[0].map((edge: MappingEdge) => edge.id)).toEqual(
      expect.arrayContaining(['e-name', 'e-hidden']),
    );
  });

  it('keeps draft placement outside semantic history', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample="nested-ab"
          editableShapes={false}
          historyActionsRef={historyActionsRef}
        />,
      );
    });

    await clickTestId(container, 'field-remap-palette-item-string:upper');
    await clickTestId(container, 'field-remap-place-draft');
    expect(container.querySelector('[data-testid="field-remap-detail-draft-id"]')).toBeTruthy();
    expect(historyActionsRef.current?.canUndo).toBe(false);
    await clickTestId(container, 'field-remap-detail-discard-draft');
    expect(historyActionsRef.current?.canUndo).toBe(false);
  });

  it('routes edges-controlled mixed history through the host owner', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();
    const sample = getFieldRemapSample('nm-combine-split');
    const originalOperators = sample.operators ?? [];
    const onOperatorsChange = vi.fn();
    const record = vi.fn();
    const undo = vi.fn<() => FieldRemapHistorySnapshot | undefined>();
    const owner: FieldRemapHistoryOwner = {
      canUndo: false,
      canRedo: false,
      record,
      reset: vi.fn(),
      undo,
      redo: vi.fn(),
    };

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          edges={[]}
          onEdgesChange={() => {}}
          onOperatorsChange={onOperatorsChange}
          historyOwner={owner}
          historyActionsRef={historyActionsRef}
        />,
      );
    });
    await clickTestId(container, 'field-remap-add-combine');

    const [current, next] = record.mock.lastCall as [
      FieldRemapHistorySnapshot,
      FieldRemapHistorySnapshot,
    ];
    expect(current.edges).toEqual([]);
    expect(current.operators).toHaveLength(originalOperators.length);
    expect(next.operators).toHaveLength(originalOperators.length + 1);
    expect(historyActionsRef.current?.canUndo).toBe(false);

    const undoSnapshot = {
      edges: [],
      operators: originalOperators,
    } satisfies FieldRemapHistorySnapshot;
    undo.mockReturnValue(undoSnapshot);
    const undoOwner = { ...owner, canUndo: true };
    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          edges={[]}
          onEdgesChange={() => {}}
          onOperatorsChange={onOperatorsChange}
          historyOwner={undoOwner}
          historyActionsRef={historyActionsRef}
        />,
      );
    });
    await act(async () => historyActionsRef.current?.undo());
    expect(undo).toHaveBeenCalledOnce();
    expect(onOperatorsChange.mock.lastCall?.[0]).toHaveLength(originalOperators.length);
  });

  it('does not synthesize partial history for mixed control without a host owner', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample="nested-ab"
          editableShapes={false}
          operators={[] as readonly MappingOperator[]}
          onOperatorsChange={() => {}}
          historyActionsRef={historyActionsRef}
        />,
      );
    });

    await clickTestId(container, 'field-remap-remove-edge-e-name');
    expect(historyActionsRef.current?.canUndo).toBe(false);
    await act(async () => historyActionsRef.current?.undo());
    expect(container.querySelector('[data-testid="field-remap-lane-e-name"]')).toBeNull();
  });

  it('routes operators-controlled mixed edits and shape reset through the host owner', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();
    const sample = getFieldRemapSample('nested-ab');
    const sources = sourceFieldsFromPlainObject(sample.source, { idPrefix: sample.sourceIdPrefix });
    const targets = targetSlotsFromPlainObject(sample.targetShape, {
      idPrefix: sample.targetIdPrefix,
    });
    const record = vi.fn();
    const reset = vi.fn();
    const owner: FieldRemapHistoryOwner = {
      canUndo: false,
      canRedo: false,
      record,
      reset,
      undo: vi.fn(),
      redo: vi.fn(),
    };

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          operators={[] as readonly MappingOperator[]}
          onOperatorsChange={() => {}}
          sources={sources}
          targets={targets}
          historyOwner={owner}
          historyActionsRef={historyActionsRef}
        />,
      );
    });
    await clickTestId(container, 'field-remap-remove-edge-e-name');
    expect(record).toHaveBeenCalledOnce();
    expect((record.mock.lastCall?.[0] as FieldRemapHistorySnapshot).operators).toEqual([]);
    expect((record.mock.lastCall?.[1] as FieldRemapHistorySnapshot).operators).toEqual([]);

    await act(async () => {
      root!.render(
        <FieldRemapPanel
          sample={sample}
          editableShapes={false}
          operators={[] as readonly MappingOperator[]}
          onOperatorsChange={() => {}}
          sources={[...sources]}
          targets={targets}
          historyOwner={owner}
          historyActionsRef={historyActionsRef}
        />,
      );
    });
    await settle();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('resets Panel-owned history after shape apply and prop replacement', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const historyActionsRef = createRef<FieldRemapHistoryActions | null>();
    const sample = getFieldRemapSample('nested-ab');
    const sources = sourceFieldsFromPlainObject(sample.source, { idPrefix: sample.sourceIdPrefix });
    const targets = targetSlotsFromPlainObject(sample.targetShape, {
      idPrefix: sample.targetIdPrefix,
    });

    const renderPanel = (nextSources: typeof sources, editableShapes: boolean) => (
      <FieldRemapPanel
        sample={sample}
        editableShapes={editableShapes}
        sources={nextSources}
        targets={targets}
        historyActionsRef={historyActionsRef}
      />
    );
    await act(async () => root!.render(renderPanel(sources, false)));
    await clickTestId(container, 'field-remap-remove-edge-e-name');
    expect(historyActionsRef.current?.canUndo).toBe(true);

    await act(async () => root!.render(renderPanel([...sources], false)));
    await settle();
    expect(historyActionsRef.current?.canUndo).toBe(false);

    await clickTestId(container, 'field-remap-remove-edge-e-city');
    expect(historyActionsRef.current?.canUndo).toBe(true);
    await act(async () => root!.render(renderPanel(sources, true)));
    const sourceEditor = container.querySelector('[data-testid="field-remap-shape-io-source"]');
    const textarea = sourceEditor?.querySelector('textarea');
    expect(textarea).toBeTruthy();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(textarea, JSON.stringify({ user_name: 'Grace' }));
      textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      sourceEditor
        ?.querySelector('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(historyActionsRef.current?.canUndo).toBe(false);
  });
});
