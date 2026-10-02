/** @vitest-environment jsdom */
import { act, type ComponentProps, type MouseEvent as ReactMouseEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type * as Xyflow from '@xyflow/react';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';

import type { FieldRemapFlowEdgeData, FieldRemapFlowNodeData } from './flow-adapter.js';

type FlowNode = Xyflow.Node<FieldRemapFlowNodeData>;
type FlowEdge = Xyflow.Edge<FieldRemapFlowEdgeData>;
type CapturedReactFlowProps = Xyflow.ReactFlowProps<FlowNode, FlowEdge>;

const flowHarness = vi.hoisted(() => ({
  props: null as CapturedReactFlowProps | null,
}));

// Only the view is replaced: useNodesState, useEdgesState and the provider are
// real. These tests cover controlled state and projected props, not XYFlow's
// handle measurement, SVG lifetime or native keyboard focus in a browser.
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof Xyflow>();
  const { createElement } = await import('react');
  return {
    ...actual,
    ReactFlow: (props: CapturedReactFlowProps) => {
      flowHarness.props = props;
      return createElement('div', { 'data-testid': 'captured-react-flow' });
    },
  };
});

import { FieldRemapFlowMapper } from './flow.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('FieldRemapFlowMapper selection synchronization', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;
  let previousActEnvironment: boolean | undefined;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  const sources: readonly SourceField[] = [
    { id: 'src.name', label: 'Name', dataType: 'string' },
    { id: 'src.alias', label: 'Alias', dataType: 'string' },
  ];
  const targets: readonly TargetSlot[] = [
    { id: 'tgt.name', label: 'Name', dataType: 'string' },
    { id: 'tgt.alias', label: 'Alias', dataType: 'string' },
  ];
  const directEdge: MappingEdge = {
    id: 'edge:name',
    sourceFieldId: 'src.name',
    targetSlotId: 'tgt.name',
  };
  const transformEdge: MappingEdge = {
    id: 'edge:alias',
    sourceFieldId: 'src.alias',
    targetSlotId: 'tgt.alias',
    transformIds: ['string:trim'],
  };
  const edges = [directEdge, transformEdge];
  const transforms = createBuiltinValueTransformRegistry();

  beforeAll(() => {
    previousActEnvironment = testGlobal.IS_REACT_ACT_ENVIRONMENT;
    testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    previousResizeObserver = globalThis.ResizeObserver;
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.dataset.testid !== 'field-remap-flow') {
        return getBoundingClientRect.call(this);
      }
      return {
        x: 0,
        y: 0,
        width: 960,
        height: 640,
        top: 0,
        right: 960,
        bottom: 640,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterAll(() => {
    testGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    globalThis.ResizeObserver = previousResizeObserver as typeof ResizeObserver;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    flowHarness.props = null;
  });

  async function renderMapper(
    overrides: Partial<ComponentProps<typeof FieldRemapFlowMapper>> = {},
  ): Promise<void> {
    if (!root) {
      container = document.createElement('div');
      document.body.append(container);
      root = createRoot(container);
    }
    await act(async () => {
      root!.render(
        <FieldRemapFlowMapper
          sources={sources}
          targets={targets}
          edges={edges}
          transforms={transforms}
          onEdgesChange={() => undefined}
          selection={null}
          showFlowHint={false}
          showConvertPalette={false}
          {...overrides}
        />,
      );
      await Promise.resolve();
    });
    expect(flowHarness.props).not.toBeNull();
  }

  function currentNodes(): FlowNode[] {
    return flowHarness.props!.nodes!;
  }

  function currentEdges(): FlowEdge[] {
    return flowHarness.props!.edges!;
  }

  async function measureAndDragNodes(): Promise<FlowNode[]> {
    const changes = currentNodes().flatMap<Xyflow.NodeChange<FlowNode>>((node, index) => [
      {
        id: node.id,
        type: 'dimensions',
        dimensions: { width: 180 + index, height: 80 + index },
        setAttributes: true,
      },
      {
        id: node.id,
        type: 'position',
        position: { x: 120 + index * 200, y: 240 + index * 100 },
        dragging: false,
      },
    ]);
    await act(async () => {
      flowHarness.props!.onNodesChange!(changes);
    });
    const measured = currentNodes();
    measured.forEach((node, index) => {
      expect(node.measured).toEqual({ width: 180 + index, height: 80 + index });
      expect(node.position).toEqual({ x: 120 + index * 200, y: 240 + index * 100 });
    });
    return measured;
  }

  async function pressDelete(): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Delete',
    });
    await act(async () => {
      container!.querySelector('[data-testid="field-remap-mapper"]')!.dispatchEvent(event);
    });
    return event;
  }

  it('keeps measured nodes through controlled edge selection and toggling', async () => {
    await renderMapper();
    const measured = await measureAndDragNodes();

    await renderMapper({ selection: { kind: 'edge', edgeId: directEdge.id } });
    expect(currentNodes()).toBe(measured);
    expect(currentEdges().find((edge) => edge.data?.mappingEdgeId === directEdge.id)).toMatchObject(
      {
        selected: true,
        ariaRole: 'button',
        domAttributes: { 'aria-pressed': true },
      },
    );

    for (const selected of [true, false]) {
      await act(async () => {
        const edge = currentEdges().find((item) => item.data?.segment === 'in')!;
        flowHarness.props!.onEdgeClick!(
          new MouseEvent('click', { ctrlKey: true }) as unknown as ReactMouseEvent,
          edge,
        );
      });
      const segments = currentEdges().filter(
        (edge) => edge.data?.mappingEdgeId === transformEdge.id,
      );
      expect(segments.every((edge) => edge.selected === selected)).toBe(true);
      expect(segments.find((edge) => edge.data?.segment === 'in')?.domAttributes).toMatchObject({
        'aria-pressed': selected,
      });
      expect(segments.find((edge) => edge.data?.segment === 'out')).toMatchObject({
        focusable: false,
        ariaRole: 'presentation',
        domAttributes: { 'aria-hidden': true },
      });
      expect(currentNodes()).toBe(measured);
    }

    await renderMapper();
    expect(currentEdges().every((edge) => edge.selected === false)).toBe(true);
    expect(currentNodes()).toBe(measured);
  });

  it.each([false, true])(
    'preserves measured geometry while transform selected/data/ARIA update (readOnly=%s)',
    async (readOnly) => {
      await renderMapper({ readOnly });
      const measured = await measureAndDragNodes();
      const transform = measured.find((node) => node.data.kind === 'transform')!;

      for (const selected of [true, false]) {
        await renderMapper({
          readOnly,
          selection: selected
            ? { kind: 'transformStep', edgeId: transformEdge.id, stepIndex: 0 }
            : null,
        });
        const projected = currentNodes().find((node) => node.id === transform.id)!;
        expect(projected).toMatchObject({
          selected,
          data: { selected },
          ariaRole: 'button',
          domAttributes: { 'aria-pressed': selected },
        });
        expect(projected.measured).toBe(transform.measured);
        expect(projected.position).toBe(transform.position);
        expect(projected.width).toBe(transform.width);
        expect(projected.height).toBe(transform.height);
        for (const node of measured.filter((item) => item.id !== transform.id)) {
          expect(currentNodes().find((item) => item.id === node.id)).toBe(node);
        }
      }
    },
  );

  it('invalidates schema geometry when a selected edge changes handles', async () => {
    await renderMapper();
    const initialSource = currentNodes().find((node) => node.data.kind === 'source-object')!;
    await measureAndDragNodes();

    await renderMapper({
      sources: [{ id: 'src.title', label: 'Title', dataType: 'string' }, sources[1]!],
      edges: [{ ...directEdge, sourceFieldId: 'src.title' }, transformEdge],
      selection: { kind: 'edge', edgeId: directEdge.id },
    });
    const source = currentNodes().find((node) => node.id === initialSource.id)!;
    expect(source.data).toMatchObject({
      ports: [
        { fieldId: 'src.title', label: 'Title', dataType: 'string' },
        { fieldId: 'src.alias', label: 'Alias', dataType: 'string' },
      ],
    });
    expect(source.measured).toBeUndefined();
    expect(source.width).toBeUndefined();
    expect(source.height).toBeUndefined();
    expect(source.position).toEqual(initialSource.position);
    expect(currentEdges().find((edge) => edge.data?.mappingEdgeId === directEdge.id)).toMatchObject(
      {
        sourceHandle: 'src.title',
        selected: true,
        domAttributes: { 'aria-pressed': true },
      },
    );
  });

  it('invalidates geometry when a selected transform changes at the same node id', async () => {
    const selection = { kind: 'transformStep', edgeId: transformEdge.id, stepIndex: 0 } as const;
    await renderMapper({ selection });
    const initialTransform = currentNodes().find((node) => node.data.kind === 'transform')!;
    await measureAndDragNodes();

    await renderMapper({
      selection,
      edges: [directEdge, { ...transformEdge, transformIds: ['string:upper'] }],
    });
    const transform = currentNodes().find((node) => node.id === initialTransform.id)!;
    expect(transform).toMatchObject({
      selected: true,
      data: { transformId: 'string:upper', selected: true },
      domAttributes: { 'aria-pressed': true },
    });
    expect(transform.measured).toBeUndefined();
    expect(transform.width).toBeUndefined();
    expect(transform.height).toBeUndefined();
    expect(transform.position).toEqual(initialTransform.position);
  });

  it('clears a deleted selected edge after controlled acknowledgement', async () => {
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'edge', edgeId: transformEdge.id },
      onEdgesChange,
      onSelectionChange,
    });
    await measureAndDragNodes();

    expect((await pressDelete()).defaultPrevented).toBe(true);
    expect(onEdgesChange).toHaveBeenCalledExactlyOnceWith([directEdge]);
    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(null);

    await renderMapper({ edges: [directEdge], onEdgesChange, onSelectionChange });
    expect(currentEdges()).toHaveLength(1);
    expect(currentEdges()[0]).toMatchObject({
      data: { mappingEdgeId: directEdge.id },
      selected: false,
      domAttributes: { 'aria-pressed': false },
    });
    expect(currentNodes().some((node) => node.data.kind === 'transform')).toBe(false);
    expect(document.activeElement).toBe(
      container!.querySelector('[data-testid="field-remap-mapper"]'),
    );
    expect((await pressDelete()).defaultPrevented).toBe(false);
    expect(onEdgesChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledOnce();
  });

  it('clears stale selection while retaining unchanged measured schema nodes', async () => {
    const onSelectionChange = vi.fn();
    const selection = { kind: 'edge', edgeId: directEdge.id } as const;
    await renderMapper({ edges: [directEdge], selection, onSelectionChange });
    const measured = await measureAndDragNodes();

    await renderMapper({ edges: [], selection, onSelectionChange });
    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(null);
    expect(currentEdges()).toEqual([]);
    expect(currentNodes()).toBe(measured);

    await renderMapper({ edges: [], onSelectionChange });
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(currentNodes()).toBe(measured);
    expect(currentNodes().every((node) => !node.selected)).toBe(true);
  });
});
