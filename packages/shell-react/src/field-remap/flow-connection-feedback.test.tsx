/** @vitest-environment jsdom */
import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import type { Connection, FinalConnectionState } from '@xyflow/react';

const flowHarness = vi.hoisted(() => ({
  props: null as CapturedReactFlowProps | null,
}));

interface CapturedReactFlowProps {
  readonly children?: ReactNode;
  readonly isValidConnection: (connection: Connection) => boolean;
  readonly onConnect: (connection: Connection) => void;
  readonly onConnectStart: () => void;
  readonly onConnectEnd: (event: MouseEvent, state: FinalConnectionState) => void;
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
    useReactFlow: () => ({ fitView: () => Promise.resolve(true) }),
  };
});

import { FieldRemapFlowMapper } from './flow.js';

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
  });

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
    expect(container!.querySelector('[data-testid="field-remap-connection-feedback"]')).toBeNull();

    await act(async () => {
      flowHarness.props?.onConnectStart();
      flowHarness.props?.onConnectEnd(new MouseEvent('pointerup'), finalState(connection, false));
      flowHarness.props?.onConnectEnd(new MouseEvent('pointerup'), finalState(connection, false));
      await Promise.resolve();
    });

    expect(onConnectionFeedback).toHaveBeenCalledOnce();
    expect(onConnectionFeedback).toHaveBeenCalledWith({
      kind: 'rejected',
      reason: 'incompatible-port-types',
    });
    expect(
      container!
        .querySelector('[data-testid="field-remap-connection-feedback"]')
        ?.getAttribute('data-reason'),
    ).toBe('incompatible-port-types');
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
      kind: 'rejected',
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
