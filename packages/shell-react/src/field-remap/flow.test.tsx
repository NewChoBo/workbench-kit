/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, createRef, useState, type ComponentProps } from 'react';
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

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('FieldRemapFlowMapper host chrome', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeAll(() => {
    testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
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
      await vi.dynamicImportSettled();
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

  async function clickWithModifiers(
    target: Element,
    init: MouseEventInit = {},
  ): Promise<MouseEvent> {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
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
    const status = container!.querySelector('[role="status"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('source:profile / source:profile.name');
    expect(container!.querySelectorAll('[role="status"]')).toHaveLength(1);

    await rerenderMapper({ sources, targets, edges, parentChildConflicts: [] });
    expect(container!.querySelector('[role="status"]')).toBeNull();
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

  it('renders selection detail in the shared Modal without reserving the detail split', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });

    const mapper = container!.querySelector('[data-testid="field-remap-mapper"]');
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const sideRail = container!.querySelector('.workbench-field-remap-flow__side-rail');
    expect(mapper?.getAttribute('data-detail-presentation')).toBe('modal');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.textContent).toContain('Binding');
    expect(dialog?.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(sideRail).toBeNull();
    expect(container!.querySelector('.workbench-field-remap-flow__canvas-detail-split')).toBeNull();
    expect(getActiveSeparators()).toHaveLength(1);

    await rerenderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 0 },
      onSelectionChange,
    });
    expect(document.body.querySelector('[data-testid="field-remap-convert-note"]')).toBeTruthy();

    await rerenderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });

    const overlay = document.body.querySelector<HTMLElement>('.ui-modal-overlay');
    await act(async () => overlay!.click());
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();

    await rerenderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      selection: null,
      onSelectionChange,
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens a mapper-owned draft editor and discards the actual draft from modal detail', async () => {
    await renderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
    });

    const placeDraft = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-place-draft"]',
    )!;
    await act(async () => {
      placeDraft.click();
      await vi.dynamicImportSettled();
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.querySelector('[data-testid="field-remap-detail-draft-id"]')).toBeTruthy();
    expect(
      dialog.querySelector('[data-testid="field-remap-detail-draft-ports"]')?.textContent,
    ).toContain('Unwired');

    const discard = dialog.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-detail-discard-draft"]',
    )!;
    await act(async () => discard.click());
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps focus in an actual operator editor across its controlled modal rerender', async () => {
    const sample = getFieldRemapSample('nm-combine-split');
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

    function OperatorModalHarness() {
      const [operators, setOperators] = useState<readonly MappingOperator[]>(
        sample.operators ?? [],
      );
      return (
        <FieldRemapFlowMapper
          sources={sources}
          targets={targets}
          edges={[]}
          transforms={transforms}
          operators={operators}
          detailPresentation="modal"
          emptyDetail="collapse"
          selection={{ kind: 'operator', operatorId: 'op-name' }}
          onEdgesChange={() => undefined}
          onOperatorsChange={setOperators}
          onSelectionChange={() => undefined}
        />
      );
    }

    await act(async () => {
      root!.render(<OperatorModalHarness />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(
      dialog.querySelector('[data-testid="field-remap-detail-operator-id"]')?.textContent,
    ).toBe('op-name');
    const output = dialog.querySelector<HTMLSelectElement>(
      '[data-testid="field-remap-operator-output"]',
    )!;
    output.focus();
    expect(document.activeElement).toBe(output);

    await act(async () => {
      output.value = 'b.city';
      output.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(output.value).toBe('b.city');
    expect(document.body.querySelector('[data-testid="field-remap-operator-output"]')).toBe(output);
    expect(document.activeElement).toBe(output);
  });

  it('keeps preview in its rail while modal detail uses the same selection authority', async () => {
    const ready = {
      status: 'ready' as const,
      result: { output: { ready: true }, slots: [] },
    };
    await renderMapper({
      chrome: 'embed',
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      preview: ready,
      selection: { kind: 'edge', edgeId: 'e-name' },
      showConvertPalette: false,
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    const sideRail = container!.querySelector('.workbench-field-remap-flow__side-rail');
    expect(dialog?.querySelector('[data-testid="field-remap-detail"]')).toBeTruthy();
    expect(sideRail?.querySelector('[data-testid="field-remap-detail"]')).toBeNull();
    expect(sideRail?.querySelector('[data-testid="field-remap-preview"]')).toBeTruthy();
    expect(getActiveSeparators()).toHaveLength(1);
  });

  it('defers modal Escape to the mapper keyboard owner', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({
      detailPresentation: 'modal',
      emptyDetail: 'collapse',
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    const event = await pressKey(dialog, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
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

  it('keeps inspection and controlled updates while suppressing every visible authoring path', async () => {
    const sample = getFieldRemapSample('nested-ab');
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    const onIncludeHiddenChange = vi.fn();
    const onPaneContextMenu = vi.fn();
    const flowActionsRef = createRef<FieldRemapFlowActions | null>();
    await renderMapper({
      readOnly: true,
      showConvertPalette: true,
      selection: { kind: 'edge', edgeId: 'e-name' },
      onEdgesChange,
      onSelectionChange,
      onIncludeHiddenChange,
      onPaneContextMenu,
      flowActionsRef,
      preview: {
        status: 'ready',
        result: {
          output: { inspected: true },
          slots: [{ edgeId: 'e-name', targetSlotId: 'b.name', path: 'name', value: 'inspected' }],
        },
      },
    });

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    expect(mapper.getAttribute('data-read-only')).toBe('true');
    expect(mapper.getAttribute('data-convert-palette')).toBe('off');
    expect(container!.querySelector('[data-testid="field-remap-convert-palette"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-detail-binding"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-add-node-e-name"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-edit-items-e-tags"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-remove-edge-e-name"]')).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-transform-palette"]')).toBeNull();
    expect(container!.querySelector('.react-flow__minimap')).toBeTruthy();
    expect(
      container!.querySelector('[data-testid="field-remap-preview-value"]')?.textContent,
    ).toContain('inspected');
    expect(() => flowActionsRef.current?.fitView()).not.toThrow();

    await act(async () => {
      container!
        .querySelector<HTMLButtonElement>('[data-testid="field-remap-toggle-hidden-fields"]')!
        .click();
    });
    expect(onIncludeHiddenChange).toHaveBeenCalledWith(true);

    const pane =
      container!.querySelector('.react-flow__pane') ??
      container!.querySelector('[data-testid="field-remap-flow"]');
    await act(async () => {
      pane!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    expect(onPaneContextMenu).toHaveBeenCalledWith(expect.anything(), {
      selection: { kind: 'edge', edgeId: 'e-name' },
    });

    const deleteEvent = await pressKey(mapper, 'Delete');
    expect(deleteEvent.defaultPrevented).toBe(false);
    expect(onEdgesChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    await act(async () => {
      container!
        .querySelector<HTMLButtonElement>('[data-testid="field-remap-select-edge-e-tags"]')!
        .click();
    });
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'e-tags' });

    onSelectionChange.mockClear();
    await rerenderMapper({
      readOnly: true,
      selection: { kind: 'edge', edgeId: 'e-tags' },
      onEdgesChange,
      onSelectionChange,
    });
    expect(container!.querySelector('[data-testid="field-remap-list-context"]')).toBeTruthy();
    expect(
      container!.querySelector('[data-testid="field-remap-item-edge-e-tag-title"]'),
    ).toBeTruthy();
    expect(container!.querySelector('[data-testid="field-remap-item-source"]')).toBeNull();
    expect(
      container!.querySelector('[data-testid="field-remap-item-edge-e-tag-title"] button'),
    ).toBeNull();

    const updatedEdges = sample.edges.map((edge) =>
      edge.id === 'e-title' ? { ...edge, transformIds: ['string:upper'] } : edge,
    );
    await rerenderMapper({
      readOnly: true,
      edges: updatedEdges,
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 0 },
      onEdgesChange,
      onSelectionChange,
    });

    expect(container!.querySelector('[data-testid="field-remap-step-id"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(container!.querySelector('[data-testid="field-remap-convert-note-remove"]')).toBeNull();
    expect(
      container!.querySelector('[data-testid="field-remap-lane-e-title"]')?.textContent,
    ).toContain('string:upper');

    onSelectionChange.mockClear();
    const escapeEvent = await pressKey(mapper, 'Escape');
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(onEdgesChange).not.toHaveBeenCalled();
  });

  it('uses inspection copy for an empty read-only detail rail', async () => {
    await renderMapper({ readOnly: true });

    const detail = container!.querySelector('[data-testid="field-remap-detail"]');
    expect(detail?.textContent).toContain('Inspect mappings');
    expect(detail?.textContent).toContain('Select a mapping to inspect its details.');
    expect(detail?.textContent).not.toContain('Convert palette');
  });

  it('resolves read-only inspection copy through host labels', async () => {
    await renderMapper({
      readOnly: true,
      labels: {
        readOnlyEmptyDetailTitle: 'Review mappings',
        readOnlyEmptyDetailDescription: 'Choose a mapping to review.',
      },
    });

    const detail = container!.querySelector('[data-testid="field-remap-detail"]');
    expect(detail?.textContent).toContain('Review mappings');
    expect(detail?.textContent).toContain('Choose a mapping to review.');
  });

  it('renders operator state for inspection without operator authoring controls', async () => {
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
      readOnly: true,
      sources,
      targets,
      edges: [],
      operators: sample.operators,
      onOperatorsChange,
      selection: { kind: 'operator', operatorId: 'op-name' },
      onSelectionChange,
    });

    expect(
      container!.querySelector('[data-testid="field-remap-detail-operator-id"]')?.textContent,
    ).toBe('op-name');
    expect(
      container!.querySelector('[data-testid="field-remap-detail-delete-operator"]'),
    ).toBeNull();
    expect(container!.querySelector('[data-testid="field-remap-operator-add-input"]')).toBeNull();
    const operatorOutput = container!.querySelector<HTMLSelectElement>(
      '[data-testid="field-remap-operator-output"]',
    )!;
    expect(operatorOutput.disabled).toBe(true);

    await act(async () => {
      operatorOutput.value = 'b.city';
      operatorOutput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onOperatorsChange).not.toHaveBeenCalled();

    const operatorNode = container!.querySelector('[data-testid="field-remap-op-op-name"]')!;
    await act(async () => {
      operatorNode.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
    });
    expect(onOperatorsChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    const updatedOperators = sample.operators?.map((operator) =>
      operator.id === 'op-name' && operator.kind === 'combine'
        ? { ...operator, outputSlotId: 'b.city' }
        : operator,
    );
    await rerenderMapper({
      readOnly: true,
      sources,
      targets,
      edges: [],
      operators: updatedOperators,
      onOperatorsChange,
      selection: { kind: 'operator', operatorId: 'op-name' },
      onSelectionChange,
    });
    expect(
      container!.querySelector<HTMLSelectElement>('[data-testid="field-remap-operator-output"]')
        ?.value,
    ).toBe('b.city');

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const event = await pressKey(mapper, 'Backspace');
    expect(event.defaultPrevented).toBe(false);
    expect(onOperatorsChange).not.toHaveBeenCalled();
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

  it('shares plain, toggle, and additive membership across uncontrolled binding buttons', async () => {
    await renderMapper();
    const name = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    const title = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-title"]',
    )!;
    const tags = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-tags"]',
    )!;

    await clickWithModifiers(name);
    expect(name.getAttribute('aria-pressed')).toBe('true');
    expect(name.dataset.primary).toBe('true');

    await clickWithModifiers(tags, { ctrlKey: true });
    expect(name.getAttribute('aria-pressed')).toBe('true');
    expect(tags.getAttribute('aria-pressed')).toBe('true');
    expect(tags.dataset.primary).toBe('false');
    expect(name.dataset.primary).toBe('true');

    await clickWithModifiers(title, { shiftKey: true });
    expect(title.getAttribute('aria-pressed')).toBe('true');
    expect(name.dataset.primary).toBe('true');

    await clickWithModifiers(name, { metaKey: true });
    expect(name.getAttribute('aria-pressed')).toBe('true');

    await clickWithModifiers(tags, { metaKey: true });
    expect(tags.getAttribute('aria-pressed')).toBe('false');
    expect(title.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the legacy callback-only selection surface externally managed', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({ onSelectionChange });
    const name = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    await clickWithModifiers(name);

    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'e-name' });
    expect(name.getAttribute('aria-pressed')).toBe('false');
    expect(container!.querySelector('[data-testid="field-remap-detail-binding"]')).toBeNull();
  });

  it('resets mapper-local membership only for a semantic controlled primary change', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });
    const name = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    const tags = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-tags"]',
    )!;

    await clickWithModifiers(tags, { ctrlKey: true });
    expect(name.getAttribute('aria-pressed')).toBe('true');
    expect(tags.getAttribute('aria-pressed')).toBe('true');
    expect(onSelectionChange).not.toHaveBeenCalled();

    await rerenderMapper({
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });
    expect(name.getAttribute('aria-pressed')).toBe('true');
    expect(tags.getAttribute('aria-pressed')).toBe('true');

    await rerenderMapper({
      selection: { kind: 'edge', edgeId: 'e-title' },
      onSelectionChange,
    });
    expect(name.getAttribute('aria-pressed')).toBe('false');
    expect(tags.getAttribute('aria-pressed')).toBe('false');
    expect(
      container!
        .querySelector('[data-testid="field-remap-select-edge-e-title"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('corrects a stale controlled primary once and preserves surviving membership on acknowledgement', async () => {
    const sample = getFieldRemapSample('nested-ab');
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });
    await clickWithModifiers(
      container!.querySelector('[data-testid="field-remap-select-edge-e-title"]')!,
      { shiftKey: true },
    );
    await clickWithModifiers(
      container!.querySelector('[data-testid="field-remap-select-edge-e-tags"]')!,
      { shiftKey: true },
    );
    const withoutPrimary = sample.edges.filter((edge) => edge.id !== 'e-name');
    onSelectionChange.mockClear();

    await rerenderMapper({
      edges: withoutPrimary,
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
    });
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'e-title' });

    await rerenderMapper({
      edges: withoutPrimary,
      selection: { kind: 'edge', edgeId: 'e-title' },
      onSelectionChange,
    });
    expect(
      container!
        .querySelector('[data-testid="field-remap-select-edge-e-title"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      container!
        .querySelector('[data-testid="field-remap-select-edge-e-tags"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(onSelectionChange).toHaveBeenCalledOnce();
  });

  it('does not loop when a host ignores a stale-primary correction', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'edge', edgeId: 'missing' },
      onSelectionChange,
    });
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith(null);

    await rerenderMapper({
      selection: { kind: 'edge', edgeId: 'missing' },
      onSelectionChange,
    });
    expect(onSelectionChange).toHaveBeenCalledOnce();
  });

  it('routes graph Enter/Space modifiers through semantic membership without raw XYFlow drift', async () => {
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 0 },
      onSelectionChange,
    });
    const primary = container!.querySelector<HTMLElement>(
      '.react-flow__node[data-id="xf:e-title:0"]',
    )!;
    const nameStep = container!.querySelector<HTMLElement>(
      '.react-flow__node[data-id="xf:e-name:0"]',
    )!;
    expect(primary.getAttribute('aria-pressed')).toBe('true');

    const added = await pressKey(nameStep, 'Enter', { ctrlKey: true });
    expect(added.defaultPrevented).toBe(true);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(nameStep.getAttribute('aria-pressed')).toBe('true');
    expect(
      container!
        .querySelector('[data-testid="field-remap-select-edge-e-name"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('false');

    const primaryNoop = await pressKey(primary, ' ', { metaKey: true });
    expect(primaryNoop.defaultPrevented).toBe(true);
    expect(primary.getAttribute('aria-pressed')).toBe('true');
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('allows read-only graph keyboard multi-selection but never bulk deletion', async () => {
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      readOnly: true,
      selection: { kind: 'edge', edgeId: 'e-name' },
      onEdgesChange,
      onSelectionChange,
    });
    const titleStep = container!.querySelector<HTMLElement>(
      '.react-flow__node[data-id="xf:e-title:0"]',
    )!;
    const added = await pressKey(titleStep, ' ', { shiftKey: true });
    expect(added.defaultPrevented).toBe(true);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(
      container!
        .querySelector('[data-testid="field-remap-select-edge-e-name"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(titleStep.getAttribute('aria-pressed')).toBe('true');

    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const deleteEvent = await pressKey(mapper, 'Delete');
    expect(deleteEvent.defaultPrevented).toBe(false);
    expect(onEdgesChange).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('press delete to remove');
  });

  it('plans one bulk edge removal and emits one durable callback', async () => {
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    const onOperatorsChange = vi.fn();
    await renderMapper({ onEdgesChange, onOperatorsChange });
    const name = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-name"]',
    )!;
    const tags = container!.querySelector<HTMLButtonElement>(
      '[data-testid="field-remap-select-edge-e-tags"]',
    )!;
    await clickWithModifiers(name);
    await clickWithModifiers(tags, { shiftKey: true });

    await rerenderMapper({
      selection: { kind: 'edge', edgeId: 'e-name' },
      onSelectionChange,
      onEdgesChange,
      onOperatorsChange,
    });
    await clickWithModifiers(tags, { shiftKey: true });
    onEdgesChange.mockClear();
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    const event = await pressKey(mapper, 'Delete');
    const nextEdges = onEdgesChange.mock.lastCall?.[0] as readonly MappingEdge[];

    expect(event.defaultPrevented).toBe(true);
    expect(onEdgesChange).toHaveBeenCalledOnce();
    expect(nextEdges.some((edge) => edge.id === 'e-name' || edge.id === 'e-tags')).toBe(false);
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(onOperatorsChange).not.toHaveBeenCalled();
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
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('preserves the adjacent-step and owning-edge fallback for singleton Remove', async () => {
    const sample = getFieldRemapSample('nested-ab');
    const onEdgesChange = vi.fn();
    const onSelectionChange = vi.fn();
    await renderMapper({
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 1 },
      onSelectionChange,
      onEdgesChange,
    });
    const mapper = container!.querySelector<HTMLElement>('[data-testid="field-remap-mapper"]')!;
    await pressKey(mapper, 'Delete');
    expect(onSelectionChange).toHaveBeenCalledWith({
      kind: 'transformStep',
      edgeId: 'e-title',
      stepIndex: 0,
    });

    const singleStepEdges = sample.edges.map((edge) =>
      edge.id === 'e-title' ? { ...edge, transformIds: ['string:trim'] } : edge,
    );
    onEdgesChange.mockClear();
    onSelectionChange.mockClear();
    await rerenderMapper({
      edges: singleStepEdges,
      selection: { kind: 'transformStep', edgeId: 'e-title', stepIndex: 0 },
      onSelectionChange,
      onEdgesChange,
    });
    await pressKey(mapper, 'Backspace');
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'edge', edgeId: 'e-title' });
    expect(
      (onEdgesChange.mock.lastCall?.[0] as readonly MappingEdge[]).find(
        (edge) => edge.id === 'e-title',
      )?.transformIds,
    ).toBeUndefined();
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
