/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
  type MappingOperator,
} from '@workbench-kit/field-remap';

import { FieldRemapDetailPanel } from './detail-panel.js';
import { jsonataValueTransform } from './jsonata-transform.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('FieldRemapDetailPanel', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  const sources = sourceFieldsFromPlainObject(
    {
      user_name: 'Ada',
      tags: [{ name: 'math', rank: 1 }],
    },
    { idPrefix: 'a' },
  );
  const targets = targetSlotsFromPlainObject(
    {
      name: '',
      labels: [{ title: '', order: 0 }],
    },
    { idPrefix: 'b' },
  );
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

  const expectDetailPropertyStack = () => {
    expect(
      container!.querySelector('[data-testid="field-remap-detail"] > .ui-workbench-property-stack'),
    ).toBeTruthy();
  };

  it('uses the shared property stack for informational, draft, and operator branches', () => {
    const combine: MappingOperator = {
      kind: 'combine',
      id: 'combine-name',
      inputFieldIds: ['a.user_name'],
      outputSlotId: 'b.name',
    };
    const split: MappingOperator = {
      kind: 'split',
      id: 'split-name',
      inputFieldId: 'a.user_name',
      outputSlotIds: ['b.name'],
    };
    const common = {
      edges: [] as readonly MappingEdge[],
      sources,
      targets,
      transforms,
      onEdgesChange: () => undefined,
      onSelectionChange: () => undefined,
    };

    mount(<FieldRemapDetailPanel {...common} selection={null} />);
    expectDetailPropertyStack();
    expect(container!.querySelector('.ui-workbench-property-hint')).toBeTruthy();

    act(() => {
      root!.render(
        <FieldRemapDetailPanel
          {...common}
          selection={{ kind: 'draft', localId: 'draft-trim' }}
          drafts={[{ localId: 'draft-trim', transformId: 'string:trim' }]}
        />,
      );
    });
    expectDetailPropertyStack();
    expect(container!.querySelector('[data-testid="field-remap-detail-draft-ports"]')).toBeTruthy();

    for (const operator of [combine, split]) {
      act(() => {
        root!.render(
          <FieldRemapDetailPanel
            {...common}
            selection={{ kind: 'operator', operatorId: operator.id }}
            operators={[operator]}
            onOperatorsChange={() => undefined}
          />,
        );
      });
      expectDetailPropertyStack();
      expect(
        container!.querySelector('[data-testid="field-remap-detail-operator-id"]'),
      ).toBeTruthy();
      expect(container!.querySelectorAll('.ui-workbench-property-section').length).toBeGreaterThan(
        1,
      );
    }

    act(() => {
      root!.render(
        <FieldRemapDetailPanel {...common} selection={{ kind: 'edge', edgeId: 'missing-edge' }} />,
      );
    });
    expectDetailPropertyStack();
    expect(container!.querySelector('.ui-workbench-property-hint')).toBeTruthy();
  });

  it('gates convert note editor to transformStep selection only', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:trim'],
      },
    ];

    mount(
      <FieldRemapDetailPanel
        selection={{ kind: 'edge', edgeId: 'e-name' }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={() => undefined}
        onSelectionChange={() => undefined}
      />,
    );

    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expectDetailPropertyStack();
    expect(container!.querySelector('[data-testid="field-remap-convert-note"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-step-settings"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-step-id"]')).toBeNull();

    act(() => {
      root!.render(
        <FieldRemapDetailPanel
          selection={{ kind: 'transformStep', edgeId: 'e-name', stepIndex: 0 }}
          edges={edges}
          sources={sources}
          targets={targets}
          transforms={transforms}
          onEdgesChange={() => undefined}
          onSelectionChange={() => undefined}
        />,
      );
    });

    expect(container!.querySelector('[data-testid="field-remap-convert-note"]')).toBeTruthy();
    expect(
      container!.querySelector('[data-testid="field-remap-detail-transform-step"]'),
    ).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-list-context"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-transform-palette"]')).toBeNull();
  });

  it('opens convert note editor from binding chain step', () => {
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
      <FieldRemapDetailPanel
        selection={{ kind: 'edge', edgeId: 'e-name' }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={() => undefined}
        onSelectionChange={onSelectionChange}
      />,
    );

    act(() => {
      (
        container!.querySelector('[data-testid="field-remap-detail-step-0"]') as HTMLButtonElement
      ).click();
    });
    expect(onSelectionChange).toHaveBeenCalledWith({
      kind: 'transformStep',
      edgeId: 'e-name',
      stepIndex: 0,
    });
  });

  it('edits transform step id from convert note surface', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:trim'],
      },
    ];
    const onEdgesChange = vi.fn();

    mount(
      <FieldRemapDetailPanel
        selection={{ kind: 'transformStep', edgeId: 'e-name', stepIndex: 0 }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={onEdgesChange}
        onSelectionChange={() => undefined}
      />,
    );

    expect(container!.querySelector('[data-testid="field-remap-step-settings"]')).toBeTruthy();
    const select = container!.querySelector(
      '[data-testid="field-remap-step-id"]',
    ) as HTMLSelectElement;
    act(() => {
      select.value = 'string:upper';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const nextEdges = onEdgesChange.mock.calls[
      onEdgesChange.mock.calls.length - 1
    ]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.transformIds).toEqual(['string:upper']);
  });

  it('adds a chosen convert from the binding palette', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
      },
    ];
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();

    mount(
      <FieldRemapDetailPanel
        selection={{ kind: 'edge', edgeId: 'e-name' }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
      />,
    );

    const select = container!.querySelector(
      '[data-testid="field-remap-palette-select"]',
    ) as HTMLSelectElement;
    const add = container!.querySelector(
      '[data-testid="field-remap-palette-add"]',
    ) as HTMLButtonElement;
    act(() => {
      select.value = 'expr:jsonata';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      add.click();
    });

    const nextEdges = onEdgesChange.mock.calls[
      onEdgesChange.mock.calls.length - 1
    ]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.transformIds).toEqual(['expr:jsonata']);
    expect(onSelectionChange).toHaveBeenCalledWith({
      kind: 'transformStep',
      edgeId: 'e-name',
      stepIndex: 0,
    });
  });

  it('edits itemEdges list context for array bindings', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-tags',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        itemEdges: [],
      },
    ];
    const onEdgesChange = vi.fn();

    mount(
      <FieldRemapDetailPanel
        selection={{ kind: 'edge', edgeId: 'e-tags' }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={onEdgesChange}
        onSelectionChange={() => undefined}
      />,
    );

    expect(container!.querySelector('[data-testid="field-remap-list-context"]')).toBeTruthy();
    expectDetailPropertyStack();
    expect(
      container!.querySelectorAll(
        '[data-testid="field-remap-list-context"] .ui-workbench-property-row',
      ).length,
    ).toBe(2);
    const sourceSelect = container!.querySelector(
      '[data-testid="field-remap-item-source"]',
    ) as HTMLSelectElement;
    const targetSelect = container!.querySelector(
      '[data-testid="field-remap-item-target"]',
    ) as HTMLSelectElement;

    act(() => {
      sourceSelect.value = 'a.tags.item.name';
      sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      targetSelect.value = 'b.labels.item.title';
      targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const nextEdges = onEdgesChange.mock.calls[
      onEdgesChange.mock.calls.length - 1
    ]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.itemEdges).toHaveLength(1);
    expect(nextEdges[0]?.itemEdges?.[0]?.sourceFieldId).toBe('a.tags.item.name');
    expect(nextEdges[0]?.itemEdges?.[0]?.targetSlotId).toBe('b.labels.item.title');
  });

  it('lets users edit JSONata expression option on convert surface', () => {
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
      <FieldRemapDetailPanel
        selection={{ kind: 'transformStep', edgeId: 'e-name', stepIndex: 0 }}
        edges={edges}
        sources={sources}
        targets={targets}
        transforms={transforms}
        onEdgesChange={onEdgesChange}
        onSelectionChange={() => undefined}
      />,
    );

    const input = container!.querySelector(
      '[data-testid="field-remap-option-expression"]',
    ) as HTMLInputElement;
    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(input, '$uppercase($)');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const nextEdges = onEdgesChange.mock.calls[
      onEdgesChange.mock.calls.length - 1
    ]?.[0] as MappingEdge[];
    expect(nextEdges[0]?.transformOptionSteps?.[0]).toEqual({
      expression: '$uppercase($)',
    });
  });
});
