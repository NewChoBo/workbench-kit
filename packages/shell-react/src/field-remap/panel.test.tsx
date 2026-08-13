/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/field-remap';

import { FieldRemapPanel } from './panel.js';
import { getFieldRemapSample } from './samples.js';

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
});
