/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, createRef, type ComponentProps } from 'react';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

import { FieldRemapFlowMapper, type FieldRemapFlowActions } from './flow.js';
import { getFieldRemapSample } from './samples.js';

describe('FieldRemapFlowMapper host chrome', () => {
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

  async function renderMapper(
    overrides: Partial<ComponentProps<typeof FieldRemapFlowMapper>> = {},
  ): Promise<void> {
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

    await act(async () => {
      root!.render(
        <FieldRemapFlowMapper
          sources={sources}
          targets={targets}
          edges={sample.edges}
          transforms={createBuiltinValueTransformRegistry()}
          onEdgesChange={() => {}}
          {...overrides}
        />,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it('omits MiniMap when showMinimap is false', async () => {
    await renderMapper({ showMinimap: false });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-minimap')).toBe('off');
    expect(container!.querySelector('.react-flow__minimap')).toBeNull();
  });

  it('mounts MiniMap by default', async () => {
    await renderMapper();

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-minimap')).toBe('on');
    expect(container!.querySelector('.react-flow__minimap')).toBeTruthy();
  });

  it('fires pane context-menu callback with selection payload', async () => {
    const onPaneContextMenu = vi.fn();
    await renderMapper({ onPaneContextMenu });

    const pane =
      container!.querySelector('.react-flow__pane') ??
      container!.querySelector('[data-testid="field-remap-flow"]');
    expect(pane).toBeTruthy();

    await act(async () => {
      pane!.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 18,
        }),
      );
    });

    expect(onPaneContextMenu).toHaveBeenCalledTimes(1);
    expect(onPaneContextMenu.mock.calls[0]?.[1]).toEqual({ selection: null });
  });

  it('exposes fitView through flowActionsRef', async () => {
    const flowActionsRef = createRef<FieldRemapFlowActions | null>();
    await renderMapper({ flowActionsRef });

    expect(flowActionsRef.current?.fitView).toEqual(expect.any(Function));
    expect(() => flowActionsRef.current?.fitView({ padding: 0.2 })).not.toThrow();
  });
});
