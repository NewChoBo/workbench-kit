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

  function getActiveSeparators(): NodeListOf<HTMLElement> {
    return container!.querySelectorAll<HTMLElement>(
      '.ui-workbench-split-view:not(.ui-workbench-split-view--primary-collapsed):not(.ui-workbench-split-view--secondary-collapsed) > [role="separator"]',
    );
  }

  async function pressKey(
    target: Element,
    key: string,
    init: KeyboardEventInit = {},
  ): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...init,
    });
    await act(async () => {
      target.dispatchEvent(event);
      await Promise.resolve();
    });
    return event;
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

  it('owns one parent/child conflict status for standalone Flow and honors an explicit empty override', async () => {
    const sources: readonly SourceField[] = [
      {
        id: 'source:profile',
        label: 'Profile',
        dataType: 'object',
        children: [{ id: 'source:profile.name', label: 'Name', dataType: 'string' }],
      },
    ];
    const targets: readonly TargetSlot[] = [
      { id: 'target:profile', label: 'Profile', dataType: 'object' },
      { id: 'target:name', label: 'Name', dataType: 'string' },
    ];
    const edges: readonly MappingEdge[] = [
      {
        id: 'edge:profile',
        sourceFieldId: 'source:profile',
        targetSlotId: 'target:profile',
      },
      {
        id: 'edge:name',
        sourceFieldId: 'source:profile.name',
        targetSlotId: 'target:name',
      },
    ];

    await renderMapper({ sources, targets, edges });
    const status = container!.querySelector('[data-testid="field-remap-conflicts"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('source:profile / source:profile.name');
    expect(container!.querySelectorAll('[data-testid="field-remap-conflicts"]')).toHaveLength(1);

    await rerenderMapper({ sources, targets, edges, parentChildConflicts: [] });
    expect(container!.querySelector('[data-testid="field-remap-conflicts"]')).toBeNull();
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
    expect(mapper?.getAttribute('data-empty-detail')).toBe('hint');
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(2);
  });

  it('uses embed defaults that omit the demo hint and binding list', async () => {
    await renderMapper({ chrome: 'embed' });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-chrome')).toBe('embed');
    expect(mapper?.getAttribute('data-flow-hint')).toBe('off');
    expect(mapper?.getAttribute('data-bindings-list')).toBe('off');
    expect(mapper?.getAttribute('data-empty-detail')).toBe('collapse');
    expect(container!.querySelector('[data-testid="field-remap-hint"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-edges"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-convert-palette"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(getActiveSeparators()).toHaveLength(1);
  });

  it('restores an embed detail rail for a selection and honors the empty hint override', async () => {
    await renderMapper({
      chrome: 'embed',
      emptyDetail: 'hint',
      labels: { emptyDetailTitle: 'Choose a mapping' },
    });

    expect(container!.querySelector('[data-testid="field-remap-detail"]')?.textContent).toContain(
      'Choose a mapping',
    );

    await rerenderMapper({
      chrome: 'embed',
      selection: { kind: 'edge', edgeId: 'e-name' },
    });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    expect(mapper?.getAttribute('data-empty-detail')).toBe('collapse');
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(2);
    expect(getActiveSeparators()[0]?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('projects one injected preview across document, binding, and transform-step selections', async () => {
    const preview = {
      status: 'ready' as const,
      result: {
        output: { name: 'post-operator' },
        slots: [
          {
            edgeId: 'e-name',
            targetSlotId: 'b.name',
            path: 'name',
            value: 'edge-local',
          },
        ],
      },
    };
    await renderMapper({ chrome: 'embed', emptyDetail: 'collapse', preview });

    expect(
      container!.querySelector('[data-testid="field-remap-preview-value"]')?.textContent,
    ).toContain('post-operator');
    expect(getActiveSeparators()).toHaveLength(2);

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      preview,
      selection: { kind: 'edge', edgeId: 'e-name' },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-value"]')?.textContent,
    ).toContain('edge-local');
    expect(container!.querySelector('[data-testid="field-remap-preview-notice"]')).toBeNull();

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      preview,
      selection: { kind: 'transformStep', edgeId: 'e-name', stepIndex: 0 },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-value"]')?.textContent,
    ).toContain('edge-local');
    expect(
      container!.querySelector('[data-testid="field-remap-preview-notice"]')?.textContent,
    ).toContain('Per-step intermediate values are unavailable');
  });

  it('keeps draft/stale preview states deterministic without executing or inventing values', async () => {
    const preview = {
      status: 'ready' as const,
      result: { output: { current: true }, slots: [] },
    };
    await renderMapper({
      preview,
      selection: { kind: 'draft', localId: 'draft-1' },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-unavailable"]')?.textContent,
    ).toContain('not executable');
    expect(container!.querySelector('[data-testid="field-remap-preview-value"]')).toBeNull();

    await rerenderMapper({
      preview,
      selection: { kind: 'edge', edgeId: 'missing' },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-unavailable"]')?.textContent,
    ).toContain('no longer available');
  });

  it('rejects result slots whose durable binding or transform step no longer exists', async () => {
    const preview = {
      status: 'ready' as const,
      result: {
        output: { current: true },
        slots: [
          {
            edgeId: 'e-name',
            targetSlotId: 'b.name',
            path: 'name',
            value: 'stale value',
          },
        ],
      },
    };
    await renderMapper({
      edges: [],
      preview,
      selection: { kind: 'edge', edgeId: 'e-name' },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-unavailable"]')?.textContent,
    ).toContain('no longer available');

    await rerenderMapper({
      preview,
      selection: { kind: 'transformStep', edgeId: 'e-name', stepIndex: 1 },
    });
    expect(
      container!.querySelector('[data-testid="field-remap-preview-unavailable"]')?.textContent,
    ).toContain('no longer available');
  });

  it('announces injected loading and error states accessibly', async () => {
    await renderMapper({ preview: { status: 'loading' } });
    expect(container!.querySelector('[role="status"]')?.textContent).toContain('Updating preview');

    await rerenderMapper({ preview: { status: 'error', message: 'Sample failed' } });
    expect(container!.querySelector('[role="alert"]')?.textContent).toContain(
      'Preview failed: Sample failed',
    );
  });

  it('unmounts preview rail and splitter track for explicit hidden and no-sample states', async () => {
    const ready = {
      status: 'ready' as const,
      result: { output: { ready: true }, slots: [] },
    };
    await renderMapper({ chrome: 'embed', emptyDetail: 'collapse', preview: ready });
    expect(container!.querySelector('[data-testid="field-remap-preview"]')).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(2);

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      preview: ready,
      showPreview: false,
    });
    expect(container!.querySelector('[data-testid="field-remap-preview"]')).toBeNull();
    expect(getActiveSeparators()).toHaveLength(1);

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      preview: { status: 'unavailable', reason: 'no-sample' },
    });
    expect(container!.querySelector('[data-testid="field-remap-preview"]')).toBeNull();
    expect(getActiveSeparators()).toHaveLength(1);
  });

  it('fills the workspace through collapsed split panes when optional rails are unmounted', async () => {
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
    expect(
      container!
        .querySelector('.workbench-field-remap-flow__palette-split')
        ?.classList.contains('ui-workbench-split-view--primary-collapsed'),
    ).toBe(true);
    expect(
      container!
        .querySelector('.workbench-field-remap-flow__canvas-detail-split')
        ?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(true);
    expect(getActiveSeparators()).toHaveLength(0);
  });

  it('preserves the canvas and React Flow viewport identity while collapsed detail toggles', async () => {
    await renderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      showConvertPalette: false,
      selection: null,
    });

    const canvas = container!.querySelector('[data-testid="field-remap-flow"]');
    const reactFlow = container!.querySelector('.react-flow');
    const viewport = container!.querySelector('.react-flow__viewport');
    expect(canvas).toBeTruthy();
    expect(reactFlow).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(0);

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      showConvertPalette: false,
      selection: { kind: 'edge', edgeId: 'e-name' },
    });

    expect(container!.querySelector('[data-testid="field-remap-flow"]')).toBe(canvas);
    expect(container!.querySelector('.react-flow')).toBe(reactFlow);
    expect(container!.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(1);

    await rerenderMapper({
      chrome: 'embed',
      emptyDetail: 'collapse',
      showConvertPalette: false,
      selection: null,
    });

    expect(container!.querySelector('[data-testid="field-remap-flow"]')).toBe(canvas);
    expect(container!.querySelector('.react-flow')).toBe(reactFlow);
    expect(container!.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(getActiveSeparators()).toHaveLength(0);
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

  it('routes Delete through the selected edge mutation path', async () => {
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
      onEdgesChange,
    });

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const event = await pressKey(mapper, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(onEdgesChange).toHaveBeenCalledOnce();
    expect(onEdgesChange.mock.lastCall?.[0].some((edge: MappingEdge) => edge.id === 'e-name')).toBe(
      false,
    );
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it('routes Backspace through transform-step removal and preserves a valid selection', async () => {
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 0 },
      onSelectionChange,
      onEdgesChange,
    });

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const event = await pressKey(mapper, 'Backspace');
    const nextEdges = onEdgesChange.mock.lastCall?.[0] as readonly MappingEdge[];

    expect(event.defaultPrevented).toBe(true);
    expect(nextEdges.find((edge) => edge.id === 'e-title')?.transformIds).toEqual(['string:upper']);
    expect(onSelectionChange).toHaveBeenCalledWith({
      kind: 'transformStep',
      edgeId: 'e-title',
      stepIndex: 0,
    });
  });

  it('deletes authorable operators and leaves read-only operators unconsumed', async () => {
    const sample = getFieldRemapSample('nm-combine-split');
    const sources = sourceFieldsFromPlainObject(sample.source, {
      idPrefix: sample.sourceIdPrefix,
    });
    const targets = targetSlotsFromPlainObject(sample.targetShape, {
      idPrefix: sample.targetIdPrefix,
    });
    const onOperatorsChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      sources,
      targets,
      edges: [],
      operators: sample.operators,
      onOperatorsChange,
      selection: { kind: 'operator', operatorId: 'op-name' },
      onSelectionChange,
    });

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const consumed = await pressKey(mapper, 'Delete');
    expect(consumed.defaultPrevented).toBe(true);
    expect(onOperatorsChange).toHaveBeenCalledWith([sample.operators?.[1]]);
    expect(onSelectionChange).toHaveBeenCalledWith(null);

    onOperatorsChange.mockClear();
    onSelectionChange.mockClear();
    await rerenderMapper({
      sources,
      targets,
      edges: [],
      operators: sample.operators,
      selection: { kind: 'operator', operatorId: 'op-name' },
      onSelectionChange,
    });
    const unconsumed = await pressKey(mapper, 'Backspace');
    expect(unconsumed.defaultPrevented).toBe(false);
    expect(onOperatorsChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('removes mapper-local drafts without creating a durable mutation path', async () => {
    await renderMapper();
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const placeDraft = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-place-draft"]',
    )!;
    await act(async () => placeDraft.click());
    expect(container!.querySelector('[data-testid="field-remap-detail-draft-id"]')).toBeTruthy();

    const event = await pressKey(mapper, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(container!.querySelector('[data-testid="field-remap-detail-draft-id"]')).toBeNull();
  });

  it('preserves native Delete behavior for editable and transform-option surfaces', async () => {
    const onEdgesChange = vi.fn();
    await renderMapper({
      selection: { kind: 'transformStep', edgeId: 'e-tag-line', stepIndex: 0 },
      onSelectionChange: () => undefined,
      onEdgesChange,
    });

    const search = container!.querySelector<HTMLInputElement>('input[type="search"]')!;
    const searchEvent = await pressKey(search, 'Delete');
    expect(searchEvent.defaultPrevented).toBe(false);
    expect(onEdgesChange).not.toHaveBeenCalled();

    const options = container!.querySelector<HTMLElement>('[data-field-remap-shortcuts="ignore"]')!;
    const optionsEvent = await pressKey(options, 'Backspace');
    expect(optionsEvent.defaultPrevented).toBe(false);
    expect(onEdgesChange).not.toHaveBeenCalled();
  });

  it('restores focus to the non-tab-stop mapper root after focused detail chrome collapses', async () => {
    await renderMapper({ chrome: 'embed', showBindingsList: true });
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const selectEdge = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    await act(async () => selectEdge.click());

    const separator = container!.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__canvas-detail-split > [role="separator"]',
    )!;
    separator.focus();
    expect(document.activeElement).toBe(separator);

    const event = await pressKey(separator, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(mapper.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(mapper);
  });

  it('restores focus when a focused convert editor is removed by Escape', async () => {
    await renderMapper({ chrome: 'embed', showBindingsList: true });
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const selectEdge = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    await act(async () => selectEdge.click());
    const selectStep = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-detail-step-0"]',
    )!;
    await act(async () => selectStep.click());

    const stepEditor = container!.querySelector<HTMLSelectElement>(
      '[data-testid="field-remap-step-id"]',
    )!;
    stepEditor.focus();
    const event = await pressKey(stepEditor, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(container!.querySelector('[data-testid="field-remap-convert-note"]')).toBeNull();
    expect(document.activeElement).toBe(mapper);
  });

  it('respects Escape already consumed by a nested editor', async () => {
    await renderMapper({ showBindingsList: true });
    const selectEdge = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    await act(async () => selectEdge.click());
    const search = container!.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(search, 'trim');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    search.focus();

    const event = await pressKey(search, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(search.value).toBe('');
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(document.activeElement).toBe(search);
  });

  it('does not move focus when Escape collapses detail outside the focused chrome', async () => {
    await renderMapper({ chrome: 'embed', showBindingsList: true });
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const selectEdge = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    await act(async () => selectEdge.click());
    selectEdge.focus();

    const event = await pressKey(selectEdge, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(container!.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(document.activeElement).toBe(selectEdge);

    const unconsumed = await pressKey(mapper, 'Escape');
    expect(unconsumed.defaultPrevented).toBe(false);
  });
});
