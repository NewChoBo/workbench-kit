/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { SampleSchemaMapperDemo } from './schema-mapper-demo.js';

describe('SampleSchemaMapperDemo', () => {
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

  it('renders FieldRemapPanel flow for nested-ab', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<SampleSchemaMapperDemo sampleId="nested-ab" />);
    });

    const result = container.querySelector('[data-testid="field-remap-result"]');
    expect(result).toBeTruthy();
    const output = JSON.parse(result!.textContent ?? '{}');

    expect(output.name).toBe('Ada Lovelace');
    expect(output.location).toEqual({ city: 'London', country: 'UK' });
    expect(container.querySelector('[data-sample-id="nested-ab"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="field-remap-flow"]')).toBeTruthy();
  });

  it('renders date/time sample T_EVENT → T_SLOT', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<SampleSchemaMapperDemo sampleId="t-event-time" />);
    });

    const output = JSON.parse(
      container.querySelector('[data-testid="field-remap-result"]')?.textContent ?? '{}',
    );
    expect(output).toMatchObject({
      displayDate: '2026.07.20',
      startsAt: '2026-07-20T14:30:00',
      occurDate: '2026-07-21',
      occurTime: '09:15:00',
    });
    expect(container.querySelector('[data-sample-id="t-event-time"]')).toBeTruthy();
  });
});
