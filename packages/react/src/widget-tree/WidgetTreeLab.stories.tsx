import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { formatWidgetDocumentJson } from '@workbench-kit/jdw';

import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { WidgetTreeLab } from './WidgetTreeLab.js';
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
    readonly text?: string;
  };
}

export const OutlineKeyboard: Story = {
  name: 'Outline keyboard',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForWidgetTreeSourcePane(canvasElement);

    const titleNode = await canvas.findByTestId('widget-tree-node-$.children[0]');
    await userEvent.click(within(titleNode).getByRole('button'));
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

function WidgetTreeStoryHarness() {
  const [value, setValue] = useState(OUTLINE_STORY_DOCUMENT);

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
