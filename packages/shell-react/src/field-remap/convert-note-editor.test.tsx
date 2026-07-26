/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/field-remap';

import { ConvertNoteEditor } from './convert-note-editor.js';
import { jsonataValueTransform } from './jsonata-transform.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('ConvertNoteEditor', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  const sources = sourceFieldsFromPlainObject({ user_name: 'Ada' }, { idPrefix: 'a' });
  const targets = targetSlotsFromPlainObject({ name: '' }, { idPrefix: 'b' });
  const transforms = createBuiltinValueTransformRegistry();
  transforms.register(jsonataValueTransform);

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const mount = (node: ReactNode) => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(node);
    });
  };

  it('edits convert registry id and options', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['expr:jsonata'],
        transformOptionSteps: [{ expression: '$' }],
      },
    ];
    const onEdgesChange = vi.fn();

    mount(
      <ConvertNoteEditor
        edge={edges[0]!}
        stepIndex={0}
        sources={sources}
        targets={targets}
        transforms={transforms}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onSelectionChange={() => undefined}
      />,
    );

    expect(container!.querySelector('[data-testid="field-remap-convert-note"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();

    const select = container!.querySelector(
      '[data-testid="field-remap-step-id"]',
    ) as HTMLSelectElement;
    act(() => {
      select.value = 'string:trim';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    let nextEdges = onEdgesChange.mock.calls[
      onEdgesChange.mock.calls.length - 1
    ]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.transformIds).toEqual(['string:trim']);

    const input = container!.querySelector(
      '[data-testid="field-remap-option-expression"]',
    ) as HTMLInputElement | null;
    // After switching away from jsonata, expression field may disappear — remount with jsonata.
    act(() => {
      root!.render(
        <ConvertNoteEditor
          edge={{
            id: 'e-name',
            sourceFieldId: 'a.user_name',
            targetSlotId: 'b.name',
            transformIds: ['expr:jsonata'],
            transformOptionSteps: [{ expression: '$' }],
          }}
          stepIndex={0}
          sources={sources}
          targets={targets}
          transforms={transforms}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onSelectionChange={() => undefined}
        />,
      );
    });
    const expression = container!.querySelector(
      '[data-testid="field-remap-option-expression"]',
    ) as HTMLInputElement;
    expect(expression || input).toBeTruthy();
    act(() => {
      const el = container!.querySelector(
        '[data-testid="field-remap-option-expression"]',
      ) as HTMLInputElement;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(el, '$uppercase($)');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    nextEdges = onEdgesChange.mock.calls[onEdgesChange.mock.calls.length - 1]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.transformOptionSteps?.[0]).toEqual({
      expression: '$uppercase($)',
    });
  });

  it('returns to binding selection from Convert chrome', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:trim'],
      },
    ];
    const onSelectionChange = vi.fn();

    mount(
      <ConvertNoteEditor
        edge={edges[0]!}
        stepIndex={0}
        sources={sources}
        targets={targets}
        transforms={transforms}
        edges={edges}
        onEdgesChange={() => undefined}
        onSelectionChange={onSelectionChange}
      />,
    );

    act(() => {
      (
        container!.querySelector(
          '[data-testid="field-remap-convert-note-back"]',
        ) as HTMLButtonElement
      ).click();
    });
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'e-name' });
  });
});
