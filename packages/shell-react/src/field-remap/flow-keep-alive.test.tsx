/** @vitest-environment jsdom */
import { act, createRef, useEffect, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

const flowHarness = vi.hoisted(() => ({
  fitView: vi.fn(() => Promise.resolve(true)),
  mounts: 0,
  unmounts: 0,
}));

vi.mock('@xyflow/react', async () => {
  const { createElement } = await import('react');
  const passthrough = ({ children }: { readonly children?: ReactNode }) => children ?? null;
  return {
    Background: () => null,
    ControlButton: ({ children, ...props }: { readonly children?: ReactNode }) =>
      createElement('button', props, children),
    Controls: passthrough,
    Handle: () => null,
    MiniMap: () => null,
    Position: { Left: 'left', Right: 'right' },
    ReactFlow: ({ children }: { readonly children?: ReactNode }) => {
      useEffect(() => {
        flowHarness.mounts += 1;
        return () => {
          flowHarness.unmounts += 1;
        };
      }, []);
      return createElement('div', { 'data-testid': 'mock-react-flow' }, children);
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
      fitView: flowHarness.fitView,
      screenToFlowPosition: (point: { readonly x: number; readonly y: number }) => point,
    }),
  };
});

import { FieldRemapFlowMapper, type FieldRemapFlowActions } from './flow.js';
import { getFieldRemapSample } from './samples.js';

const resizeObservers = new Set<ResizeObserverStub>();
let previousResizeObserver: typeof ResizeObserver | undefined;
const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
let previousActEnvironment: boolean | undefined;

function createRect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

class ResizeObserverStub {
  readonly targets = new Set<Element>();

  constructor(readonly callback: ResizeObserverCallback) {
    resizeObservers.add(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    resizeObservers.delete(this);
  }
}

async function emitSize(
  elements: readonly HTMLElement[],
  width: number,
  height: number,
): Promise<void> {
  const rect = createRect(width, height);
  for (const element of elements) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  }

  await act(async () => {
    for (const observer of [...resizeObservers]) {
      const entries = [...observer.targets]
        .filter((target) => elements.includes(target as HTMLElement))
        .map(
          (target) =>
            ({
              target,
              contentRect: rect,
            }) as ResizeObserverEntry,
        );
      if (entries.length > 0) {
        observer.callback(entries, observer as unknown as ResizeObserver);
      }
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await Promise.resolve();
  });
}

describe('FieldRemapFlowMapper zero-size keep-alive', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeAll(() => {
    previousActEnvironment = testGlobal.IS_REACT_ACT_ENVIRONMENT;
    testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterAll(() => {
    testGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    globalThis.ResizeObserver = previousResizeObserver as typeof ResizeObserver;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    resizeObservers.clear();
    vi.restoreAllMocks();
    flowHarness.fitView.mockClear();
    flowHarness.mounts = 0;
    flowHarness.unmounts = 0;
    root = undefined;
    container = undefined;
  });

  it('mounts once after positive sizing and guards fitView across hidden restoration', async () => {
    const sample = getFieldRemapSample('nested-ab');
    const flowActionsRef = createRef<FieldRemapFlowActions | null>();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <FieldRemapFlowMapper
          edges={sample.edges}
          flowActionsRef={flowActionsRef}
          onEdgesChange={() => undefined}
          sources={sourceFieldsFromPlainObject(sample.source, {
            idPrefix: sample.sourceIdPrefix,
          })}
          targets={targetSlotsFromPlainObject(sample.targetShape, {
            idPrefix: sample.targetIdPrefix,
          })}
          transforms={createBuiltinValueTransformRegistry()}
        />,
      );
      await Promise.resolve();
    });

    const mapper = container.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const canvas = container.querySelector<HTMLElement>('[data-testid="field-remap-flow"]')!;
    expect(mapper).toBeTruthy();
    expect(canvas).toBeTruthy();
    expect(canvas.querySelector('[role="status"]')).toBeTruthy();
    expect(canvas.querySelector('[data-testid="mock-react-flow"]')).toBeNull();
    expect(flowHarness.mounts).toBe(0);

    await emitSize([mapper, canvas], 960, 640);

    const mountedFlow = canvas.querySelector('[data-testid="mock-react-flow"]');
    expect(mountedFlow).toBeTruthy();
    expect(canvas.querySelector('[role="status"]')).toBeNull();
    expect(flowHarness.mounts).toBe(1);
    expect(flowHarness.unmounts).toBe(0);
    expect(flowActionsRef.current?.fitView).toEqual(expect.any(Function));
    flowHarness.fitView.mockClear();

    await emitSize([mapper, canvas], 0, 0);

    expect(canvas.querySelector('[data-testid="mock-react-flow"]')).toBe(mountedFlow);
    expect(flowHarness.mounts).toBe(1);
    expect(flowHarness.unmounts).toBe(0);
    expect(() => flowActionsRef.current?.fitView({ padding: 0.2 })).not.toThrow();
    expect(flowHarness.fitView).not.toHaveBeenCalled();

    await emitSize([mapper, canvas], 960, 640);

    expect(canvas.querySelector('[data-testid="mock-react-flow"]')).toBe(mountedFlow);
    expect(flowHarness.mounts).toBe(1);
    expect(flowHarness.unmounts).toBe(0);
    expect(flowHarness.fitView).not.toHaveBeenCalled();

    flowActionsRef.current?.fitView({ padding: 0.2, maxZoom: 1.4 });
    expect(flowHarness.fitView).toHaveBeenCalledOnce();
    expect(flowHarness.fitView).toHaveBeenCalledWith({ padding: 0.2, maxZoom: 1.4 });
  });
});
