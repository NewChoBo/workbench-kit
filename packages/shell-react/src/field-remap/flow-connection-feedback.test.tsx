/** @vitest-environment jsdom */
import { act, type ComponentProps, type DragEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import type {
  Connection,
  Edge,
  FinalConnectionState,
  OnSelectionChangeParams,
} from '@xyflow/react';

const flowHarness = vi.hoisted(() => ({
  props: null as CapturedReactFlowProps | null,
  screenToFlowPosition: vi.fn((point: { readonly x: number; readonly y: number }) => ({
    x: point.x + 10,
    y: point.y + 20,
  })),
}));

interface CapturedReactFlowProps {
  readonly children?: ReactNode;
  readonly isValidConnection: (connection: Connection) => boolean;
  readonly onConnect: (connection: Connection) => void;
  readonly onConnectStart: () => void;
  readonly onConnectEnd: (event: MouseEvent, state: FinalConnectionState) => void;
  readonly onEdgesDelete?: ((edges: readonly unknown[]) => void) | undefined;
  readonly onEdgeClick?: ((event: MouseEvent, edge: Edge) => void) | undefined;
  readonly onNodeClick?:
    ((event: MouseEvent, node: { readonly data: Record<string, unknown> }) => void) | undefined;
  readonly onSelectionChange?: ((selection: OnSelectionChangeParams) => void) | undefined;
  readonly onDragOver?: ((event: DragEvent<HTMLDivElement>) => void) | undefined;
  readonly onDrop?: ((event: DragEvent<HTMLDivElement>) => void) | undefined;
  readonly nodes?:
    | readonly {
        readonly draggable?: boolean | undefined;
        readonly data?: Record<string, unknown> | undefined;
        readonly position?: { readonly x: number; readonly y: number } | undefined;
      }[]
    | undefined;
  readonly nodesDraggable?: boolean | undefined;
  readonly nodesConnectable?: boolean | undefined;
  readonly edgesReconnectable?: boolean | undefined;
  readonly elementsSelectable?: boolean | undefined;
}

vi.mock('@xyflow/react', async () => {
  const { createElement, useState } = await import('react');
  const passthrough = ({ children }: { readonly children?: ReactNode }) => children ?? null;
  return {
    Background: () => null,
    ControlButton: ({ children, ...props }: { readonly children?: ReactNode }) =>
      createElement('button', props, children),
    Controls: passthrough,
    Handle: () => null,
    MiniMap: () => null,
    Position: { Left: 'left', Right: 'right' },
    ReactFlow: (props: CapturedReactFlowProps) => {
      flowHarness.props = props;
      return createElement('div', { 'data-testid': 'mock-react-flow' }, props.children);
    },
    ReactFlowProvider: passthrough,
    useEdgesState: (initial: readonly unknown[]) => {
      const [value, setValue] = useState(initial);
      return [value, setValue, () => undefined];
    },
    useNodesState: (initial: readonly unknown[]) => {
      const [value, setValue] = useState(initial);
      return [value, setValue, () => undefined];
    },
    useReactFlow: () => ({
      fitView: () => Promise.resolve(true),
      screenToFlowPosition: flowHarness.screenToFlowPosition,
    }),
  };
});

import { FieldRemapFlowMapper } from './flow.js';
import { writeFieldRemapTransformDragData } from './drag-payload.js';

describe('FieldRemapFlowMapper completed connection feedback', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  const sources: readonly SourceField[] = [
    { id: 'src.name', label: 'Name', dataType: 'string' },
    { id: 'src.other', label: 'Other', dataType: 'string' },
    { id: 'src.count', label: 'Count', dataType: 'number' },
  ];
  const targets: readonly TargetSlot[] = [{ id: 'tgt.name', label: 'Name', dataType: 'string' }];
  const edge: MappingEdge = {
    id: 'edge:name',
    sourceFieldId: 'src.name',
    targetSlotId: 'tgt.name',
  };

  beforeAll(() => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
    flowHarness.props = null;
    flowHarness.screenToFlowPosition.mockClear();
  });

  function createDataTransfer(): DataTransfer {
    const entries = new Map<string, string>();
    return {
      dropEffect: 'none',
      effectAllowed: 'uninitialized',
      get types() {
        return [...entries.keys()];
      },
      getData: (type: string) => entries.get(type) ?? '',
      setData: (type: string, value: string) => {
        entries.set(type, value);
      },
    } as unknown as DataTransfer;
  }

  async function renderFlow(
    overrides: Partial<ComponentProps<typeof FieldRemapFlowMapper>> = {},
  ): Promise<void> {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <FieldRemapFlowMapper
          sources={sources}
          targets={targets}
          edges={[edge]}
          transforms={createBuiltinValueTransformRegistry()}
          onEdgesChange={() => {}}
          {...overrides}
        />,
      );
      await Promise.resolve();
    });
  }

  function finalState(connection: Connection, isValid: boolean): FinalConnectionState {
    return {
      isValid,
      from: { x: 0, y: 0 },
      fromHandle: {
        id: connection.sourceHandle,
        nodeId: connection.source,
        type: 'source',
        position: 'right',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      fromPosition: 'right',
      fromNode: { id: connection.source },
      to: { x: 1, y: 1 },
      toHandle: {
        id: connection.targetHandle,
        nodeId: connection.target,
        type: 'target',
        position: 'left',
        x: 1,
        y: 1,
        width: 1,
        height: 1,
      },
      toPosition: 'left',
      toNode: { id: connection.target },
      pointer: { x: 1, y: 1 },
    } as unknown as FinalConnectionState;
  }

  it('keeps repeated hover validation silent and publishes one reason at attempt completion', async () => {
    const onConnectionFeedback = vi.fn();
    await renderFlow({ onConnectionFeedback });
    const connection: Connection = {
      source: 'obj:source',
      sourceHandle: 'src.count',
      target: 'obj:target',
      targetHandle: 'tgt.name',
    };

    expect(flowHarness.props?.isValidConnection(connection)).toBe(false);
    expect(flowHarness.props?.isValidConnection(connection)).toBe(false);
    expect(flowHarness.props?.isValidConnection(connection)).toBe(false);
    expect(onConnectionFeedback).not.toHaveBeenCalled();
    expect(container!.querySelector('[role="status"]')).toBeNull();

    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnectEnd(new MouseEvent('pointerup'), finalState(connection, false));
      flowHarness.props?.onConnectEnd(new MouseEvent('pointerup'), finalState(connection, false));
      await Promise.resolve();
    });

    expect(onConnectionFeedback).toHaveBeenCalledOnce();
    expect(onConnectionFeedback).toHaveBeenCalledWith({
      reason: 'incompatible-port-types',
    });
    expect(container!.querySelector('[role="status"]')?.textContent).toContain(
      'incompatible-port-types',
    );
  });

  it('projects accepted drop client coordinates once without a durable edge mutation', async () => {
    const onEdgesChange = vi.fn();
    await renderFlow({ onEdgesChange });
    const dataTransfer = createDataTransfer();
    writeFieldRemapTransformDragData(dataTransfer, 'string:upper');
    const dragOver = {
      dataTransfer,
      preventDefault: vi.fn(),
    } as unknown as DragEvent<HTMLDivElement>;
    const drop = {
      clientX: 111,
      clientY: 222,
      dataTransfer,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent<HTMLDivElement>;

    await act(async () => {
      flowHarness.props?.onDragOver?.(dragOver);
      flowHarness.props?.onDrop?.(drop);
      await Promise.resolve();
    });

    expect(dragOver.preventDefault).toHaveBeenCalledOnce();
    expect(dataTransfer.dropEffect).toBe('copy');
    expect(drop.preventDefault).toHaveBeenCalledOnce();
    expect(drop.stopPropagation).toHaveBeenCalledOnce();
    expect(flowHarness.screenToFlowPosition).toHaveBeenCalledOnce();
    expect(flowHarness.screenToFlowPosition).toHaveBeenCalledWith({ x: 111, y: 222 });
    const draftNode = flowHarness.props?.nodes?.find(
      (node) => node.data?.kind === 'draft-transform',
    );
    expect(draftNode?.position).toEqual({ x: 121, y: 242 });
    expect(container!.querySelector('[data-testid="field-remap-detail-draft-id"]')).toBeTruthy();
    expect(onEdgesChange).not.toHaveBeenCalled();
  });

  it('disables connection and deletion entry points at the React Flow boundary in read-only mode', async () => {
    const onEdgesChange = vi.fn();
    const onConnectionFeedback = vi.fn();
    const onSelectionChange = vi.fn();
    await renderFlow({
      readOnly: true,
      edges: [{ ...edge, transformIds: ['string:trim'] }],
      onEdgesChange,
      onConnectionFeedback,
      onSelectionChange,
    });

    expect(flowHarness.props?.nodesDraggable).toBe(false);
    expect(flowHarness.props?.nodes?.every((node) => node.draggable === undefined)).toBe(true);
    expect(flowHarness.props?.nodesConnectable).toBe(false);
    expect(flowHarness.props?.edgesReconnectable).toBe(false);
    expect(flowHarness.props?.elementsSelectable).toBe(false);
    expect(flowHarness.props?.onConnect).toBeUndefined();
    expect(flowHarness.props?.onConnectStart).toBeUndefined();
    expect(flowHarness.props?.onConnectEnd).toBeUndefined();
    expect(flowHarness.props?.onEdgesDelete).toBeUndefined();
    expect(
      flowHarness.props?.isValidConnection({
        source: 'obj:source',
        sourceHandle: 'src.other',
        target: 'obj:target',
        targetHandle: 'tgt.name',
      }),
    ).toBe(false);
    expect(onEdgesChange).not.toHaveBeenCalled();
    expect(onConnectionFeedback).not.toHaveBeenCalled();

    expect(flowHarness.props?.onSelectionChange).toBeUndefined();
    flowHarness.props?.onEdgeClick?.(new MouseEvent('click'), {
      id: 'fe:edge:name:in',
      source: 'obj:source',
      target: 'xf:edge:name:0',
      data: { mappingEdgeId: 'edge:name', segment: 'in' },
    });
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'edge:name' });

    onSelectionChange.mockClear();
    flowHarness.props?.onNodeClick?.(new MouseEvent('click'), {
      data: {
        kind: 'transform',
        mappingEdgeId: 'edge:name',
        stepIndex: 0,
      },
    });
    expect(onSelectionChange).toHaveBeenCalledWith({
      kind: 'transformStep',
      edgeId: 'edge:name',
      stepIndex: 0,
    });
  });

  it('reports a concrete same-direction drop but keeps handle-less cancellation silent', async () => {
    const onConnectionFeedback = vi.fn();
    await renderFlow({ onConnectionFeedback });
    const unsupported: Connection = {
      source: 'obj:source',
      sourceHandle: 'src.name',
      target: 'obj:source',
      targetHandle: 'src.other',
    };
    const concreteState = finalState(unsupported, false) as unknown as {
      fromHandle: { type: 'source' | 'target' };
      toHandle: { type: 'source' | 'target' } | null;
      toNode: unknown;
    };
    concreteState.toHandle!.type = 'source';

    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnectEnd(
        new MouseEvent('pointerup'),
        concreteState as unknown as FinalConnectionState,
      );
      await Promise.resolve();
    });
    expect(onConnectionFeedback).toHaveBeenCalledOnce();
    expect(onConnectionFeedback).toHaveBeenCalledWith({
      reason: 'unsupported-topology',
    });

    concreteState.toHandle = null;
    concreteState.toNode = null;
    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnectEnd(
        new MouseEvent('pointerup'),
        concreteState as unknown as FinalConnectionState,
      );
      await Promise.resolve();
    });
    expect(onConnectionFeedback).toHaveBeenCalledOnce();
    expect(container!.querySelector('[role="status"]')).toBeNull();
  });

  it('rejects a synchronous rewire without mutating prior edges and replaces by default', async () => {
    const rejectEdgesChange = vi.fn();
    const rejectFeedback = vi.fn();
    await renderFlow({
      onEdgesChange: rejectEdgesChange,
      onConnectionFeedback: rejectFeedback,
      rewirePolicy: 'reject',
    });
    const connection: Connection = {
      source: 'obj:source',
      sourceHandle: 'src.other',
      target: 'obj:target',
      targetHandle: 'tgt.name',
    };

    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnect(connection);
      await Promise.resolve();
    });
    expect(rejectEdgesChange).not.toHaveBeenCalled();
    expect(rejectFeedback).toHaveBeenCalledOnce();
    expect(rejectFeedback).toHaveBeenCalledWith({
      reason: 'rewire-policy-rejected',
      impactedEdgeIds: ['edge:name'],
    });

    const replaceEdgesChange = vi.fn();
    await act(async () => {
      root!.render(
        <FieldRemapFlowMapper
          sources={sources}
          targets={targets}
          edges={[edge]}
          transforms={createBuiltinValueTransformRegistry()}
          onEdgesChange={replaceEdgesChange}
        />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnect(connection);
      await Promise.resolve();
    });

    expect(replaceEdgesChange).toHaveBeenCalledOnce();
    expect(replaceEdgesChange).toHaveBeenCalledWith([{ ...edge, sourceFieldId: 'src.other' }]);
  });
});
