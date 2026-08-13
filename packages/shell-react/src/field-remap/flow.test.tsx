/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, createRef, type ComponentProps } from 'react';
import {
  createBuiltinValueTransformRegistry,
  createValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
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

    await rerenderMapper(overrides);
  }

  async function rerenderMapper(
    overrides: Partial<ComponentProps<typeof FieldRemapFlowMapper>> = {},
  ): Promise<void> {
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

  it('resyncs controlled node content when render metadata changes without topology changes', async () => {
    const sources: readonly SourceField[] = [
      { id: 'source:name', label: 'Original source field', dataType: 'string' },
    ];
    const targets: readonly TargetSlot[] = [
      { id: 'target:name', label: 'Original target field', dataType: 'string' },
    ];
    const edges: readonly MappingEdge[] = [
      {
        id: 'edge:name',
        sourceFieldId: 'source:name',
        targetSlotId: 'target:name',
        transformIds: ['test:normalize'],
      },
    ];
    const transforms = createValueTransformRegistry();
    const registerTransform = (label: string, optionLabel: string) => {
      transforms.register({
        id: 'test:normalize',
        label,
        inputTypes: ['string', 'object'],
        outputType: 'string',
        optionFields: [{ key: 'pattern', label: optionLabel, kind: 'string' }],
        apply: (value) => value,
      });
    };
    registerTransform('Original transform', 'Original option');

    await renderMapper({
      sources,
      targets,
      edges,
      transforms,
      sourceTitle: 'Original source',
      targetTitle: 'Original target',
      selection: { kind: 'transformStep', edgeId: 'edge:name', stepIndex: 0 },
    });

    expect(
      container!.querySelector('[data-testid="field-remap-source-schema"]')?.textContent,
    ).toContain('Original source field');
    expect(container!.textContent).toContain('Original transform');
    expect(container!.textContent).toContain('Original option');

    registerTransform('Updated transform', 'Updated option');
    await rerenderMapper({
      sources,
      targets,
      edges,
      transforms,
      sourceTitle: 'Original source',
      targetTitle: 'Original target',
      selection: { kind: 'transformStep', edgeId: 'edge:name', stepIndex: 0 },
    });

    expect(container!.textContent).toContain('Updated transform');
    expect(container!.textContent).toContain('Updated option');
    expect(container!.textContent).not.toContain('Original transform');
    expect(container!.textContent).not.toContain('Original option');

    await rerenderMapper({
      sources: [{ id: 'source:name', label: 'Updated source field', dataType: 'object' }],
      targets: [{ id: 'target:name', label: 'Updated target field', dataType: 'array' }],
      edges,
      transforms,
      sourceTitle: 'Updated source',
      targetTitle: 'Updated target',
      selection: { kind: 'transformStep', edgeId: 'edge:name', stepIndex: 0 },
    });

    const sourceNode = container!.querySelector('[data-testid="field-remap-source-schema"]');
    const targetNode = container!.querySelector('[data-testid="field-remap-target-schema"]');
    expect(sourceNode?.textContent).toContain('Updated source');
    expect(sourceNode?.textContent).toContain('Updated source field');
    expect(sourceNode?.textContent).toContain('object');
    expect(targetNode?.textContent).toContain('Updated target');
    expect(targetNode?.textContent).toContain('Updated target field');
    expect(targetNode?.textContent).toContain('array');
    expect(container!.textContent).toContain('Updated transform');
    expect(container!.textContent).not.toContain('Original transform');
  });

  it('uses the latest operator callback, data, and selection after a controlled rerender', async () => {
    const sources: readonly SourceField[] = [
      { id: 'source:first', label: 'First', dataType: 'string' },
      { id: 'source:second', label: 'Second', dataType: 'string' },
    ];
    const targets: readonly TargetSlot[] = [
      { id: 'target:value', label: 'Value', dataType: 'string' },
    ];
    const edges: readonly MappingEdge[] = [];
    const firstOperator: MappingOperator = {
      kind: 'combine',
      id: 'combine:first',
      inputFieldIds: ['source:first'],
      outputSlotId: 'target:value',
    };
    const secondOperator: MappingOperator = {
      kind: 'combine',
      id: 'combine:second',
      inputFieldIds: ['source:second'],
      outputSlotId: '',
    };
    const transforms = createBuiltinValueTransformRegistry();
    const onEdgesChange = vi.fn();
    const previousOnOperatorsChange = vi.fn();
    const currentOnOperatorsChange = vi.fn();
    const onSelectionChange = vi.fn();

    await renderMapper({
      sources,
      targets,
      edges,
      transforms,
      operators: [firstOperator],
      onEdgesChange,
      onOperatorsChange: previousOnOperatorsChange,
      selection: null,
      onSelectionChange,
    });
    await rerenderMapper({
      sources,
      targets,
      edges,
      transforms,
      operators: [firstOperator, secondOperator],
      onEdgesChange,
      onOperatorsChange: currentOnOperatorsChange,
      selection: { kind: 'operator', operatorId: firstOperator.id },
      onSelectionChange,
    });

    const operatorNode = container!.querySelector(
      `[data-testid="field-remap-op-${firstOperator.id}"]`,
    );
    expect(operatorNode).toBeTruthy();
    await act(async () => {
      operatorNode!.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
    });

    expect(previousOnOperatorsChange).not.toHaveBeenCalled();
    expect(currentOnOperatorsChange).toHaveBeenCalledWith([secondOperator]);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

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

  it('keeps all demo chrome mounted by default', async () => {
    await renderMapper();

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-chrome')).toBe('card');
    expect(container!.querySelector('[data-testid="field-remap-hint"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-edges"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-convert-palette"]')).toBeTruthy();
  });

  it('uses embed defaults that omit the demo hint and binding list', async () => {
    await renderMapper({ chrome: 'embed' });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-chrome')).toBe('embed');
    expect(mapper?.getAttribute('data-flow-hint')).toBe('off');
    expect(mapper?.getAttribute('data-bindings-list')).toBe('off');
    expect(container!.querySelector('[data-testid="field-remap-hint"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-edges"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-convert-palette"]')).toBeTruthy();
  });

  it('honors explicit chrome visibility overrides and expands when palette is unmounted', async () => {
    await renderMapper({
      chrome: 'embed',
      showFlowHint: true,
      showBindingsList: true,
      showConvertPalette: false,
    });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-convert-palette')).toBe('off');
    expect(container!.querySelector('[data-testid="field-remap-hint"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-edges"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-convert-palette"]')).toBeNull();
    expect(
      container!.querySelector('.workbench-field-remap-flow__workspace--without-palette'),
    ).toBeTruthy();
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

  it('renders host label override for the edge-list heading', async () => {
    await renderMapper({ labels: { bindingsTitle: 'Field maps' } });

    const heading = container!.querySelector('.workbench-field-remap-flow__bindings > h4');
    expect(heading?.textContent).toBe('Field maps');
  });

  it('uses labelled IconButtons for binding-row chrome actions', async () => {
    await renderMapper({
      labels: {
        addTransform: 'Append convert',
        editItems: 'Configure item bindings',
        removeBinding: 'Delete binding',
      },
    });

    const addTransform = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-add-node-e-name"]',
    );
    expect(addTransform?.classList.contains('ui-icon-button')).toBe(true);
    expect(addTransform?.getAttribute('aria-label')).toBe('Append convert');

    const editItems = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-edit-items-e-tags"]',
    );
    expect(editItems?.classList.contains('ui-icon-button')).toBe(true);
    expect(editItems?.getAttribute('aria-label')).toBe('Configure item bindings');

    const removeBinding = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-remove-edge-e-name"]',
    );
    expect(removeBinding?.classList.contains('ui-icon-button')).toBe(true);
    expect(removeBinding?.getAttribute('aria-label')).toBe('Delete binding');
    expect(removeBinding?.getAttribute('data-variant')).toBe('danger');
  });

  it('includes a Controls MiniMap toggle when onShowMinimapChange is set', async () => {
    const onShowMinimapChange = vi.fn();
    await renderMapper({ showMinimap: false, onShowMinimapChange });

    const toggle = container!.querySelector(
      '.workbench-field-remap-flow__minimap-toggle',
    ) as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();

    await act(async () => {
      toggle!.click();
    });

    expect(onShowMinimapChange).toHaveBeenCalledWith(true);
  });

  it('includes a Controls hidden-fields toggle when onIncludeHiddenChange is set', async () => {
    const onIncludeHiddenChange = vi.fn();
    await renderMapper({ includeHidden: false, onIncludeHiddenChange });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-hidden-fields')).toBe('off');

    const toggle = container!.querySelector(
      '.workbench-field-remap-flow__hidden-toggle',
    ) as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();

    await act(async () => {
      toggle!.click();
    });

    expect(onIncludeHiddenChange).toHaveBeenCalledWith(true);
  });
});
