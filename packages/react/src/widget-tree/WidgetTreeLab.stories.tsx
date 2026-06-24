import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { formatWidgetDocumentJson } from '@workbench-kit/jdw';

import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { WidgetTreeLab } from './WidgetTreeLab.js';
import { WidgetTreeWorkbench } from './WidgetTreeWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY } from './demo-registry.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';
import { waitForWidgetTreeSourcePane } from './widget-tree-play-helpers.js';

const OUTLINE_STORY_DOCUMENT = formatWidgetDocumentJson({
  type: 'column',
  gap: 8,
  padding: 12,
  children: [
    { type: 'text', text: 'Title' },
    {
      type: 'row',
      gap: 8,
      children: [
        { type: 'text', text: 'Left', flex: 1 },
        { type: 'text', text: 'Right', flex: 1 },
      ],
    },
    { type: 'text', text: 'Footer' },
  ],
});

const VALIDATION_BASELINE_DOCUMENT = formatWidgetDocumentJson({
  type: 'text',
  text: 'Baseline',
});

const VALIDATION_INVALID_DOCUMENT = formatWidgetDocumentJson({
  type: 'text',
});

const DIRTY_BASELINE_DOCUMENT = formatWidgetDocumentJson({
  type: 'text',
  text: 'Widget Tree',
});

const DIRTY_DRAFT_DOCUMENT = formatWidgetDocumentJson({
  type: 'text',
  text: 'Draft Copy',
});

const STACK_PLACEMENT_DOCUMENT = formatWidgetDocumentJson({
  type: 'stack',
  width: 360,
  height: 220,
  background: '#f3f4f6',
  children: [
    {
      type: 'text',
      text: 'Floating label',
      left: 12,
      top: 16,
      right: 120,
      bottom: 180,
    },
  ],
});

const meta = {
  title: 'JDW/WidgetTree/Lab',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: {
      timeout: 60_000,
    },
  },
  render: () => <WidgetTreeStoryHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface JdwSnapshotNode {
  readonly type?: string;
  readonly args?: {
    readonly child?: JdwSnapshotNode;
    readonly children?: readonly JdwSnapshotNode[];
    readonly bottom?: number;
    readonly left?: number;
    readonly right?: number;
    readonly text?: string;
    readonly top?: number;
  };
}

export const OutlineKeyboard: Story = {
  name: 'Outline keyboard',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    const titleNode = await canvas.findByTestId('widget-tree-node-$.children[0]');
    await userEvent.click(getOutlineNodeButton(titleNode));
    await userEvent.keyboard('{ArrowDown}');

    const rowNode = await canvas.findByTestId('widget-tree-node-$.children[1]');
    await waitFor(() => {
      expect(rowNode).toHaveAttribute('aria-selected', 'true');
      expect(
        canvasElement.querySelector('[data-widget-path="$.children[1]"][data-widget-selected]'),
      ).toBeTruthy();
    });
  },
  tags: ['storybook-play-required'],
};

export const ValidationBanner: Story = {
  name: 'Validation banner',
  render: () => (
    <WidgetTreeWorkbenchStoryHarness
      baselineValue={VALIDATION_BASELINE_DOCUMENT}
      initialValue={VALIDATION_INVALID_DOCUMENT}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    const banner = await canvas.findByTestId('json-config-validation-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-validation', 'invalid');
    await expect(banner).toHaveTextContent('text is required');
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();
  },
  tags: ['storybook-play-required'],
};

export const DirtyDiscard: Story = {
  name: 'Dirty discard',
  render: () => (
    <WidgetTreeWorkbenchStoryHarness
      baselineValue={DIRTY_BASELINE_DOCUMENT}
      initialValue={DIRTY_DRAFT_DOCUMENT}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Draft Copy');

    const banner = await canvas.findByTestId('json-config-validation-banner');
    await expect(banner).toHaveAttribute('data-validation', 'valid');
    await expect(banner).toHaveTextContent(/Valid.*unsaved changes/);
    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }));

    await waitFor(() =>
      expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Widget Tree'),
    );
    await expect(canvas.queryByTestId('json-config-validation-banner')).not.toBeInTheDocument();
    await expect(canvas.queryByTitle('Unsaved changes')).not.toBeInTheDocument();
    expect(readSnapshot(canvasElement)).toEqual(JSON.parse(DIRTY_BASELINE_DOCUMENT));
  },
  tags: ['storybook-play-required'],
};

export const OutlineReorderAndReparent: Story = {
  name: 'Outline reorder and reparent',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    await dragOutlineNode(canvas, '$.children[2]', '$.children[0]', 'before');
    await waitFor(() => {
      expect(readRootChildSummary(canvasElement)).toEqual(['Footer', 'Title', 'row']);
      expect(
        canvasElement.querySelector('[data-widget-path="$.children[0]"][data-widget-type="text"]'),
      ).toBeTruthy();
    });

    await dragOutlineNode(canvas, '$.children[1]', '$.children[2]', 'inside');
    await waitFor(() => {
      expect(readRootChildSummary(canvasElement)).toEqual(['Footer', 'row']);
      expect(readChildTextSummary(canvasElement, [1])).toEqual(['Left', 'Right', 'Title']);
      const rowPreview = canvasElement.querySelector(
        '[data-widget-path="$.children[1]"][data-widget-type="row"]',
      );
      expect(rowPreview?.textContent ?? '').toContain('Title');
    });
  },
  tags: ['storybook-play-required'],
};

export const AssetInsertSelect: Story = {
  name: 'Asset insert selects node',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    const rootNode = await canvas.findByTestId('widget-tree-node-$');
    await userEvent.click(getOutlineNodeButton(rootNode));
    await userEvent.click(canvas.getByRole('button', { name: 'Assets' }));
    await userEvent.click(await canvas.findByTestId('widget-asset-content.heading'));

    const insertedNode = await canvas.findByTestId('widget-tree-node-$.children[3]');
    await waitFor(() => {
      expect(insertedNode).toHaveAttribute('aria-selected', 'true');
      expect(insertedNode).toHaveTextContent('Heading');
      expect(canvasElement.querySelector('[data-widget-path="$.children[3]"]')).toBeTruthy();
    });
    await expect(canvas.getByTestId('widget-tree-inspector-panel')).toBeVisible();
    await expect(canvas.getByDisplayValue('Heading')).toBeVisible();
  },
  tags: ['storybook-play-required'],
};

export const StackPlacement: Story = {
  name: 'Stack placement',
  render: () => <WidgetTreeStoryHarness initialValue={STACK_PLACEMENT_DOCUMENT} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lab = await canvas.findByTestId('widget-tree-lab');
    const labCanvas = within(lab);
    await waitForWidgetTreeSourcePane(lab);

    const stackChildNode = await labCanvas.findByTestId('widget-tree-node-$.children[0]');
    await userEvent.click(getOutlineNodeButton(stackChildNode));

    const inspector = await labCanvas.findByTestId('widget-tree-inspector-panel');
    await expect(inspector).toHaveTextContent('Stack placement');

    const leftInput = within(inspector).getByRole('spinbutton', { name: 'Left' });
    const topInput = within(inspector).getByRole('spinbutton', { name: 'Top' });
    const rightInput = within(inspector).getByRole('spinbutton', { name: 'Right' });
    const bottomInput = within(inspector).getByRole('spinbutton', { name: 'Bottom' });

    await expect(leftInput).toHaveValue(12);
    await expect(topInput).toHaveValue(16);
    await expect(rightInput).toHaveValue(120);
    await expect(bottomInput).toHaveValue(180);

    const child = readSnapshot(canvasElement).args?.children?.[0];
    expect(child?.args?.left).toBe(12);
    expect(child?.args?.top).toBe(16);
    expect(child?.args?.right).toBe(120);
    expect(child?.args?.bottom).toBe(180);

    const previewChild = lab.querySelector<HTMLElement>(
      '[data-widget-path="$.children[0]"][data-widget-type="text"]',
    );
    expect(previewChild?.style.left).toBe('12px');
    expect(previewChild?.style.top).toBe('16px');
    expect(previewChild?.style.width).toBe('228px');
    expect(previewChild?.style.height).toBe('24px');

    const selectionFrame = await labCanvas.findByTestId('widget-tree-canvas-selection-frame');
    expect(selectionFrame).toHaveAttribute('data-widget-path', '$.children[0]');
    expect(selectionFrame).toHaveAttribute('data-widget-type', 'text');

    const dragHandle = await labCanvas.findByTestId('widget-tree-canvas-drag-handle');
    fireEvent.pointerDown(dragHandle, {
      button: 0,
      buttons: 1,
      clientX: 20,
      clientY: 20,
      isPrimary: true,
      pointerId: 7,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(dragHandle, {
      buttons: 1,
      clientX: 32,
      clientY: 29,
      isPrimary: true,
      pointerId: 7,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(dragHandle, {
      button: 0,
      buttons: 0,
      clientX: 32,
      clientY: 29,
      isPrimary: true,
      pointerId: 7,
      pointerType: 'mouse',
    });

    await waitFor(() => {
      const movedChild = readSnapshot(canvasElement).args?.children?.[0];
      expect(movedChild?.args?.left).toBe(24);
      expect(movedChild?.args?.top).toBe(25);
      expect(movedChild?.args?.right).toBe(108);
      expect(movedChild?.args?.bottom).toBe(171);
    });
  },
  tags: ['storybook-play-required'],
};

export const PreviewSelection: Story = {
  name: 'Preview selection',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);
    const snapshotBeforeSelect = readSnapshot(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Assets' }));
    await expect(canvas.getByTestId('widget-tree-asset-palette')).toBeVisible();

    const previewTitle = canvasElement.querySelector<HTMLElement>(
      '[data-widget-path="$.children[0]"][data-widget-type="text"]',
    );
    expect(previewTitle).toBeTruthy();
    await userEvent.click(previewTitle!);

    const outlineTitle = await canvas.findByTestId('widget-tree-node-$.children[0]');
    await waitFor(() => {
      expect(outlineTitle).toHaveAttribute('aria-selected', 'true');
      expect(
        canvasElement.querySelector(
          '[data-widget-path="$.children[0]"][data-widget-selected="true"]',
        ),
      ).toBeTruthy();
    });
    await expect(canvas.getByTestId('widget-tree-inspector-panel')).toBeVisible();
    await expect(canvas.getByDisplayValue('Title')).toBeVisible();
    expect(readSnapshot(canvasElement)).toEqual(snapshotBeforeSelect);
  },
  tags: ['storybook-play-required'],
};

function getOutlineNodeButton(node: HTMLElement): HTMLButtonElement {
  const button = node.querySelector<HTMLButtonElement>('.widget-tree-outline__button');

  if (!button) {
    throw new Error('Expected outline node button to exist.');
  }

  return button;
}

function WidgetTreeStoryHarness({
  initialValue = OUTLINE_STORY_DOCUMENT,
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div style={{ height: '100%', minHeight: 0 }}>
        <WidgetTreeLab
          assetCatalog={WIDGET_TREE_DEMO_ASSET_CATALOG}
          registry={WIDGET_TREE_DEMO_REGISTRY}
          value={value}
          onChange={setValue}
        />
        <pre data-testid="widget-tree-json-snapshot" hidden>
          {value}
        </pre>
      </div>
    </StoryWorkbenchShellFrame>
  );
}

function WidgetTreeWorkbenchStoryHarness({
  baselineValue,
  initialValue,
}: {
  readonly baselineValue: string;
  readonly initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [baseline, setBaseline] = useState(baselineValue);

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <div style={{ height: '100%', minHeight: 0 }}>
        <WidgetTreeWorkbench
          assetCatalog={WIDGET_TREE_DEMO_ASSET_CATALOG}
          baselineValue={baseline}
          path="src/widgets/story.jdw.json"
          registry={WIDGET_TREE_DEMO_REGISTRY}
          value={value}
          onChange={setValue}
          onDiscard={() => setValue(baseline)}
          onSave={() => setBaseline(value)}
        />
        <pre data-testid="widget-tree-json-snapshot" hidden>
          {value}
        </pre>
      </div>
    </StoryWorkbenchShellFrame>
  );
}

async function dragOutlineNode(
  canvas: ReturnType<typeof within>,
  sourcePathKey: string,
  targetPathKey: string,
  placement: 'before' | 'inside' | 'after',
): Promise<void> {
  const source = await canvas.findByTestId(`widget-tree-node-${sourcePathKey}`);
  const target = await canvas.findByTestId(`widget-tree-node-${targetPathKey}`);
  const { clientY } = mockDropRect(target, placement);
  const dataTransfer = createDataTransfer();

  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { clientY, dataTransfer });
  fireEvent.drop(target, { clientY, dataTransfer });
}

function mockDropRect(
  target: HTMLElement,
  placement: 'before' | 'inside' | 'after',
): { readonly clientY: number } {
  const top = 100;
  const height = 30;
  const rect = {
    bottom: top + height,
    height,
    left: 0,
    right: 240,
    top,
    width: 240,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;

  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });

  if (placement === 'before') return { clientY: top + 2 };
  if (placement === 'after') return { clientY: top + height - 2 };
  return { clientY: top + height / 2 };
}

function createDataTransfer(): DataTransfer {
  if (typeof DataTransfer !== 'undefined') {
    return new DataTransfer();
  }

  const store = new Map<string, string>();
  return {
    clearData: (format?: string) => {
      if (format) store.delete(format);
      else store.clear();
    },
    dropEffect: 'move',
    effectAllowed: 'move',
    files: [] as unknown as FileList,
    getData: (format: string) => store.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setDragImage: () => undefined,
    setData: (format: string, data: string) => {
      store.set(format, data);
    },
    types: [],
  } as unknown as DataTransfer;
}

function readSnapshot(canvasElement: HTMLElement): JdwSnapshotNode {
  const snapshot = canvasElement.querySelector('[data-testid="widget-tree-json-snapshot"]');
  return JSON.parse(snapshot?.textContent ?? '{}') as JdwSnapshotNode;
}

function readRootChildSummary(canvasElement: HTMLElement): string[] {
  return readChildSummary(readSnapshot(canvasElement).args?.children ?? []);
}

function readChildTextSummary(canvasElement: HTMLElement, path: readonly number[]): string[] {
  let current: JdwSnapshotNode | undefined = readSnapshot(canvasElement);
  for (const index of path) {
    current = current?.args?.children?.[index];
  }

  return (current?.args?.children ?? []).map(readNodeLabel);
}

function readChildSummary(children: readonly JdwSnapshotNode[]): string[] {
  return children.map(readNodeLabel);
}

function readNodeLabel(node: JdwSnapshotNode): string {
  if ((node.type === 'expanded' || node.type === 'flexible') && node.args?.child) {
    return readNodeLabel(node.args.child);
  }

  return String(node.args?.text ?? node.type);
}
