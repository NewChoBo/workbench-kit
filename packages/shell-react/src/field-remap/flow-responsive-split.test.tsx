/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

import { FieldRemapFlowMapper } from './flow.js';
import type { FieldRemapSelection } from './flow-ops.js';
import { getFieldRemapSample } from './samples.js';

const resizeCallbacks = new Map<Element, ResizeObserverCallback>();
let previousResizeObserver: typeof ResizeObserver | undefined;

class ResizeObserverStub {
  private readonly observed = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    this.observed.add(target);
    resizeCallbacks.set(target, this.callback);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
    if (resizeCallbacks.get(target) === this.callback) {
      resizeCallbacks.delete(target);
    }
  }

  disconnect(): void {
    for (const target of this.observed) {
      if (resizeCallbacks.get(target) === this.callback) {
        resizeCallbacks.delete(target);
      }
    }
    this.observed.clear();
  }
}

function createRect(width: number, height = 640): DOMRect {
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

describe('FieldRemapFlowMapper retained responsive splits', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeAll(() => {
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterAll(() => {
    globalThis.ResizeObserver = previousResizeObserver as typeof ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    resizeCallbacks.clear();
    vi.restoreAllMocks();
    root = undefined;
    container = undefined;
  });

  it('uses narrow split sizes after initial wide mount without remounting the canvas', async () => {
    const sample = getFieldRemapSample('nested-ab');
    const sources = sourceFieldsFromPlainObject(sample.source, {
      idPrefix: sample.sourceIdPrefix,
    });
    const targets = targetSlotsFromPlainObject(sample.targetShape, {
      idPrefix: sample.targetIdPrefix,
    });
    const transforms = createBuiltinValueTransformRegistry();

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    const renderMapper = async (selection: FieldRemapSelection): Promise<void> => {
      await act(async () => {
        root!.render(
          <FieldRemapFlowMapper
            chrome="embed"
            edges={sample.edges}
            emptyDetail="collapse"
            onEdgesChange={() => {}}
            selection={selection}
            showMinimap={false}
            sources={sources}
            targets={targets}
            transforms={transforms}
          />,
        );
      });
      await act(async () => {
        await Promise.resolve();
      });
    };

    await renderMapper(null);

    const mapper = container.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]');
    const workspace = container.querySelector<HTMLElement>('[data-testid="field-remap-workspace"]');
    const flow = container.querySelector<HTMLElement>('[data-testid="field-remap-flow"]');
    const reactFlow = container.querySelector<HTMLElement>('.react-flow');
    const viewport = container.querySelector<HTMLElement>('.react-flow__viewport');
    const paletteSplit = container.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__palette-split',
    );
    const detailSplit = container.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__canvas-detail-split',
    );

    expect(mapper).toBeTruthy();
    expect(workspace).toBeTruthy();
    expect(flow).toBeTruthy();
    expect(reactFlow).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(paletteSplit).toBeTruthy();
    expect(detailSplit).toBeTruthy();
    expect(workspace).toHaveAttribute('data-layout', 'wide');
    expect(paletteSplit!.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('240px');
    expect(detailSplit!.style.getPropertyValue('--ui-workbench-split-secondary-size')).toBe('320px');

    vi.spyOn(mapper!, 'getBoundingClientRect').mockReturnValue(createRect(900));
    const mapperResize = resizeCallbacks.get(mapper!);
    expect(mapperResize).toBeTruthy();

    await act(async () => {
      mapperResize!([], {} as ResizeObserver);
      await Promise.resolve();
    });

    expect(workspace).toHaveAttribute('data-layout', 'narrow');
    expect(paletteSplit!.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('192px');
    expect(detailSplit!.style.getPropertyValue('--ui-workbench-split-secondary-size')).toBe('220px');
    expect(detailSplit).toHaveClass('ui-workbench-split-view--secondary-collapsed');

    await renderMapper({ kind: 'edge', edgeId: 'e-name' });

    expect(container.querySelector('[data-testid="field-remap-flow"]')).toBe(flow);
    expect(container.querySelector('.react-flow')).toBe(reactFlow);
    expect(container.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(container.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(detailSplit).not.toHaveClass('ui-workbench-split-view--secondary-collapsed');
    expect(detailSplit!.style.getPropertyValue('--ui-workbench-split-secondary-size')).toBe('220px');
  });
});
