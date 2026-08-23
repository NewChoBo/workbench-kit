import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  createBuiltinValueTransformRegistry,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import {
  FieldRemapFlowMapper,
  FieldRemapIoClassBrowse,
  getFieldRemapBrowseDemoShapes,
} from '@workbench-kit/shell-react/field-remap';

import { FieldRemapDemo } from './FieldRemapDemo';

const meta = {
  title: 'Workbench Sample/Field Remap',
  component: FieldRemapDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Field remap panel: convert palette place-then-wire, schema A/B ports, n→m operators. Sample app: **Field Remap** activity.',
      },
    },
  },
  argTypes: {
    sampleId: {
      control: 'select',
      description: 'Selects the deterministic source and target schema fixture.',
      options: [
        'nested-ab',
        't-user-contact',
        't-event-time',
        't-emp-dept',
        't-product-catalog',
        'nm-combine-split',
      ],
    },
    showMinimap: { control: 'boolean', description: 'Shows the Flow minimap.' },
    chrome: {
      control: 'inline-radio',
      description: 'Uses card defaults or the embed chrome preset for the Flow mapper.',
      options: ['card', 'embed'],
    },
    showFlowHint: { control: 'boolean', description: 'Explicitly shows or hides the Flow hint.' },
    showBindingsList: {
      control: 'boolean',
      description: 'Explicitly shows or hides the bottom binding list.',
    },
    showConvertPalette: {
      control: 'boolean',
      description: 'Mounts the Convert palette; when false, the workspace expands.',
    },
    emptyDetail: {
      control: 'inline-radio',
      description: 'Keeps the empty detail hint or collapses its rail until selection.',
      options: ['hint', 'collapse'],
    },
    detailPresentation: {
      control: 'inline-radio',
      description: 'Shows selection detail in the resizable rail or shared Modal.',
      options: ['rail', 'modal'],
    },
    readOnly: {
      control: 'boolean',
      description: 'Keeps inspection and viewport controls while disabling authoring.',
    },
    showHostChromeDemo: { control: 'boolean', description: 'Shows host-owned editor actions.' },
    ioChrome: {
      control: 'select',
      description: 'Switches the schema I/O chrome between browse and edit modes.',
      options: ['browse', 'edit', 'none'],
    },
    browseSeedShapes: { control: 'boolean', description: 'Seeds class and hidden-field metadata.' },
  },
} satisfies Meta<typeof FieldRemapDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

async function expectCanvasFillsPane(flow: HTMLElement, pane: HTMLElement): Promise<void> {
  await waitFor(() => {
    const flowRect = flow.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    expect(flowRect.width).toBeGreaterThan(0);
    expect(flowRect.height).toBeGreaterThan(0);
    expect(Math.abs(flowRect.width - paneRect.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(flowRect.height - paneRect.height)).toBeLessThanOrEqual(1);
  });
}

const rewireSources: readonly SourceField[] = [
  { id: 'src.name', label: 'Current name', dataType: 'string' },
  { id: 'src.other', label: 'Other name', dataType: 'string' },
];
const rewireTargets: readonly TargetSlot[] = [
  { id: 'tgt.name', label: 'Name', dataType: 'string' },
];
const rewireEdges: readonly MappingEdge[] = [
  { id: 'edge:name', sourceFieldId: 'src.name', targetSlotId: 'tgt.name' },
];
const rewireTransforms = createBuiltinValueTransformRegistry();

function RewireRejectDemo() {
  return (
    <FieldRemapFlowMapper
      sources={rewireSources}
      targets={rewireTargets}
      edges={rewireEdges}
      transforms={rewireTransforms}
      rewirePolicy="reject"
      showConvertPalette={false}
      showMinimap={false}
      onEdgesChange={() => {
        throw new Error('Rejected rewire mutated durable edges');
      }}
    />
  );
}

export const NestedAB: Story = {
  name: 'A → B',
  args: { sampleId: 'nested-ab' },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('field-remap-convert-palette')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-place-draft')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-place-draft')).toHaveAccessibleName(
      'Place convert',
    );
    await expect(canvas.getByTestId('field-remap-add-node-e-name')).toHaveAccessibleName(
      'Add convert',
    );
    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    const step = await canvas.findByTestId('field-remap-detail-step-0');
    await userEvent.click(step);
    await expect(canvas.getByTestId('field-remap-convert-note')).toBeVisible();
    await userEvent.click(canvas.getByTestId('field-remap-palette-item-string:upper'));
    await userEvent.click(canvas.getByTestId('field-remap-place-draft'));
    await expect(canvas.getByTestId('field-remap-detail-draft-id')).toBeVisible();
  },
};

export const ReadOnly: Story = {
  name: 'Read-only inspection',
  args: { sampleId: 'nested-ab', readOnly: true, ioChrome: 'edit' },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('field-remap-demo')).toHaveAttribute('data-read-only', 'true');
    await expect(canvas.getByTestId('field-remap-io-browse')).toBeVisible();
    await expect(canvas.queryByTestId('field-remap-shape-io-source')).toBeNull();
    await expect(canvas.queryByTestId('field-remap-convert-palette')).toBeNull();
    await expect(canvas.getByTestId('field-remap-detail')).toHaveTextContent('Inspect mappings');
    await expect(canvas.getByTestId('field-remap-detail')).not.toHaveTextContent('Convert palette');
    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    await expect(canvas.getByTestId('field-remap-detail-binding')).toBeVisible();
    await expect(canvas.queryByTestId('field-remap-add-node-e-name')).toBeNull();
    await expect(canvas.queryByTestId('field-remap-remove-edge-e-name')).toBeNull();
    await userEvent.click(canvas.getByTestId('field-remap-detail-step-0'));
    await expect(canvas.getByTestId('field-remap-step-id')).toBeDisabled();
    await expect(canvas.queryByTestId('field-remap-convert-note-remove')).toBeNull();
  },
};

export const ReadOnlyEmbed: Story = {
  name: 'Read-only embed inspection',
  args: {
    sampleId: 'nested-ab',
    readOnly: true,
    chrome: 'embed',
    emptyDetail: 'collapse',
    showBindingsList: false,
    ioChrome: 'none',
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('field-remap-detail')).toBeNull();
    await expect(canvas.queryByTestId('field-remap-edges')).toBeNull();
    const transformNode = await waitFor(() => {
      const node = canvasElement.querySelector<HTMLElement>(
        '.react-flow__node[data-id="xf:e-name:0"]',
      );
      expect(node).toBeTruthy();
      return node!;
    });
    transformNode.focus();
    await expect(transformNode).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('field-remap-convert-note')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-step-id')).toBeDisabled();
    const directEdge = await waitFor(() => {
      const edge = canvasElement.querySelector<SVGGElement>(
        '.react-flow__edge[data-id="fe:e-country:direct"]',
      );
      expect(edge).toBeTruthy();
      return edge!;
    });
    directEdge.focus();
    await expect(directEdge).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('field-remap-detail-binding')).toHaveTextContent(
      'a.profile.country → b.location.country',
    );
  },
};

export const ConnectionRejectFeedback: Story = {
  name: 'Connection reject feedback',
  args: { sampleId: 'nested-ab' },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sourceHandle = canvasElement.querySelector<HTMLElement>(
      '.react-flow__handle.source[data-nodeid="obj:source"][data-handleid="a.user_name"]',
    );
    const targetHandle = canvasElement.querySelector<HTMLElement>(
      '.react-flow__handle.target[data-nodeid="obj:target"][data-handleid="b.labels"]',
    );
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();
    await expect(canvas.getByTestId('field-remap-lane-e-tags')).toBeVisible();

    const sourceRect = sourceHandle!.getBoundingClientRect();
    const targetRect = targetHandle!.getBoundingClientRect();
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: sourceHandle!,
        coords: {
          clientX: sourceRect.x + sourceRect.width / 2,
          clientY: sourceRect.y + sourceRect.height / 2,
        },
      },
      {
        target: targetHandle!,
        coords: {
          clientX: targetRect.x + targetRect.width / 2,
          clientY: targetRect.y + targetRect.height / 2,
        },
      },
      {
        keys: '[/MouseLeft]',
        target: targetHandle!,
        coords: {
          clientX: targetRect.x + targetRect.width / 2,
          clientY: targetRect.y + targetRect.height / 2,
        },
      },
    ]);

    const feedback = await canvas.findByText('incompatible-port-types');
    await expect(feedback).toHaveAttribute('role', 'status');
    await expect(canvas.getAllByText('incompatible-port-types')).toHaveLength(1);
    await expect(canvas.getByTestId('field-remap-lane-e-tags')).toBeVisible();
  },
};

export const RewireRejectFeedback: Story = {
  name: 'Rewire reject feedback',
  args: { sampleId: 'nested-ab' },
  render: () => <RewireRejectDemo />,
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sourceHandle = canvasElement.querySelector<HTMLElement>(
      '.react-flow__handle.source[data-nodeid="obj:source"][data-handleid="src.other"]',
    );
    const targetHandle = canvasElement.querySelector<HTMLElement>(
      '.react-flow__handle.target[data-nodeid="obj:target"][data-handleid="tgt.name"]',
    );
    const originalLane = canvas.getByTestId('field-remap-lane-edge:name');
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();
    await expect(originalLane).toHaveTextContent('src.name → tgt.name');

    const sourceRect = sourceHandle!.getBoundingClientRect();
    const targetRect = targetHandle!.getBoundingClientRect();
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: sourceHandle!,
        coords: {
          clientX: sourceRect.x + sourceRect.width / 2,
          clientY: sourceRect.y + sourceRect.height / 2,
        },
      },
      {
        target: targetHandle!,
        coords: {
          clientX: targetRect.x + targetRect.width / 2,
          clientY: targetRect.y + targetRect.height / 2,
        },
      },
      {
        keys: '[/MouseLeft]',
        target: targetHandle!,
        coords: {
          clientX: targetRect.x + targetRect.width / 2,
          clientY: targetRect.y + targetRect.height / 2,
        },
      },
    ]);

    const feedback = await canvas.findByText('rewire-policy-rejected');
    await expect(feedback).toHaveAttribute('role', 'status');
    await expect(canvas.getAllByText('rewire-policy-rejected')).toHaveLength(1);
    await expect(originalLane).toHaveTextContent('src.name → tgt.name');
  },
};

export const ConvertPaletteFilterKeyboard: Story = {
  name: 'Convert palette filter / keyboard',
  args: { sampleId: 'nested-ab' },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const filter = canvas.getByRole('searchbox', { name: 'Filter converts' });
    const placeButton = canvas.getByTestId('field-remap-place-draft');
    const converts = within(canvas.getByRole('listbox', { name: 'Converts' }));

    await userEvent.type(filter, 'UPPERCASE');
    await expect(canvas.getByTestId('field-remap-palette-item-string:upper')).toBeVisible();
    await expect(canvas.queryByTestId('field-remap-palette-item-array:first')).toBeNull();
    await expect(converts.queryByRole('option', { selected: true })).toBeNull();
    await expect(placeButton).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Clear convert filter' }));
    await expect(filter).toHaveValue('');
    await expect(canvas.getByTestId('field-remap-palette-item-array:first')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(placeButton).toBeEnabled();

    filter.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByTestId('field-remap-palette-item-array:first')).toHaveFocus();
    await userEvent.keyboard('{End}{Enter}');
    await expect(canvas.getByTestId('field-remap-detail-draft-id')).toBeVisible();
  },
};

export const HostChromeHooks: Story = {
  name: 'Host chrome (minimap / fitView)',
  args: {
    sampleId: 'nested-ab',
    showHostChromeDemo: true,
    showMinimap: true,
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('field-remap-host-chrome')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-minimap', 'on');
    // MiniMap toggle lives in Flow Controls (not host chrome) when onShowMinimapChange is set.
    await userEvent.click(await canvas.findByTestId('field-remap-toggle-minimap'));
    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-minimap', 'off');
    await expect(canvasElement.querySelector('.react-flow__minimap')).toBeNull();
    await userEvent.click(canvas.getByTestId('field-remap-fit-view'));
    await expect(canvas.getByTestId('field-remap-fit-view')).toBeVisible();
  },
};

export const SemanticHistory: Story = {
  name: 'Semantic undo / redo',
  args: {
    sampleId: 'nested-ab',
    showHostChromeDemo: true,
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const undo = canvas.getByTestId('field-remap-undo');
    const redo = canvas.getByTestId('field-remap-redo');

    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();
    await userEvent.click(canvas.getByTestId('field-remap-remove-edge-e-name'));
    await waitFor(() => expect(canvas.queryByTestId('field-remap-lane-e-name')).toBeNull());
    await expect(undo).toBeEnabled();

    await userEvent.click(undo);
    await expect(await canvas.findByTestId('field-remap-lane-e-name')).toBeVisible();
    await expect(redo).toBeEnabled();

    await userEvent.click(redo);
    await waitFor(() => expect(canvas.queryByTestId('field-remap-lane-e-name')).toBeNull());
  },
};

export const IoBrowseChrome: Story = {
  name: 'I/O browse (classRef / hidden)',
  args: {
    sampleId: 'nested-ab',
    ioChrome: 'browse',
    browseSeedShapes: true,
    labels: { bindingsTitle: 'Field maps' },
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ioBrowse = within(canvas.getByTestId('field-remap-io-browse'));
    const ioBrowseElement = canvas.getByTestId('field-remap-io-browse');
    await expect(ioBrowse.getByText('PersonProfile@1')).toBeVisible();
    await expect(ioBrowseElement.querySelector('.ui-sidebar-row')).toBeTruthy();
    await expect(ioBrowseElement.querySelector('ul ul')).toBeTruthy();
    await expect(ioBrowseElement.querySelector('button, [tabindex]')).toBeNull();
    await expect(ioBrowseElement.querySelector('[role="tree"], [role="treeitem"]')).toBeNull();
    // Browse rows render `path` (e.g. profile.internal_id), not bare label text.
    await expect(ioBrowse.queryByText('profile.internal_id')).toBeNull();
    await userEvent.click(canvas.getByLabelText('Show hidden fields'));
    await expect(await ioBrowse.findByText('profile.internal_id')).toBeVisible();
    await expect(ioBrowse.getByText('Hidden')).toBeVisible();
    const bindingsHeading = canvasElement.querySelector(
      '.workbench-field-remap-flow__bindings > h4',
    );
    await expect(bindingsHeading).toHaveTextContent('Field maps');
  },
};

const narrowIoBrowseShapes = getFieldRemapBrowseDemoShapes();

export const IoBrowseNarrowHost: Story = {
  name: 'I/O browse narrow host',
  args: { sampleId: 'nested-ab' },
  render: () => (
    <div style={{ inlineSize: '34rem', maxInlineSize: '100%' }}>
      <FieldRemapIoClassBrowse
        includeHidden
        sources={narrowIoBrowseShapes.sources}
        targets={narrowIoBrowseShapes.targets}
      />
    </div>
  ),
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ioBrowse = canvas.getByTestId('field-remap-io-browse');
    const sections = Array.from(ioBrowse.querySelectorAll('section'));

    await expect(ioBrowse.querySelector('ul ul')).toBeTruthy();
    await expect(ioBrowse.querySelector('button, [tabindex]')).toBeNull();
    await waitFor(() => {
      expect(sections).toHaveLength(2);
      const sourcesRect = sections[0]!.getBoundingClientRect();
      const targetsRect = sections[1]!.getBoundingClientRect();
      expect(Math.abs(sourcesRect.left - targetsRect.left)).toBeLessThanOrEqual(1);
      expect(targetsRect.top).toBeGreaterThan(sourcesRect.top);
    });
  },
};

export const EmbedChrome: Story = {
  name: 'Embed chrome',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    emptyDetail: 'collapse',
    showBindingsList: true,
    showConvertPalette: false,
    showMinimap: false,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '72rem', maxInlineSize: '100%', minInlineSize: '72rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByTestId('field-remap-workspace');
    const flow = canvas.getByTestId('field-remap-flow');
    const canvasPane = canvasElement.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__canvas-detail-split > .ui-workbench-split-view__primary',
    );
    const viewport = canvasElement.querySelector<HTMLElement>('.react-flow__viewport');
    await expect(canvasPane).toBeTruthy();
    await expect(viewport).toBeTruthy();

    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-chrome', 'embed');
    await expect(workspace).toHaveAttribute('data-layout', 'wide');
    await expect(canvas.queryByTestId('field-remap-hint')).toBeNull();
    await expect(canvas.getByTestId('field-remap-edges')).toBeVisible();
    await expect(canvas.queryByTestId('field-remap-convert-palette')).toBeNull();
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__workspace--without-palette'),
    ).not.toBeNull();
    await waitFor(() => {
      const workspaceRect = workspace.getBoundingClientRect();
      const flowRect = flow.getBoundingClientRect();
      expect(flowRect.width).toBeGreaterThan(0);
      expect(flowRect.height).toBeGreaterThan(0);
      expect(Math.abs(flowRect.width - workspaceRect.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(flowRect.height - workspaceRect.height)).toBeLessThanOrEqual(1);
    });
    await expectCanvasFillsPane(flow, canvasPane!);
    await waitFor(() => expect(viewport!.style.transform).not.toBe('translate(0px, 0px) scale(1)'));
    const viewportTransform = viewport!.style.transform;
    expect(
      canvasElement
        .querySelector('.workbench-field-remap-flow__palette-split')
        ?.classList.contains('ui-workbench-split-view--primary-collapsed'),
    ).toBe(true);
    expect(
      canvasElement
        .querySelector('.workbench-field-remap-flow__canvas-detail-split')
        ?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(true);

    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    await expect(canvas.getByTestId('field-remap-detail')).toBeVisible();
    await expect(canvas.queryByTestId('field-remap-convert-palette')).toBeNull();
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__canvas-detail-split'),
    ).not.toHaveClass('ui-workbench-split-view--secondary-collapsed');
    await expect(canvasElement.querySelector('[data-testid="field-remap-flow"]')).toBe(flow);
    await expect(canvasElement.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(viewport!.style.transform).toBe(viewportTransform);
    await expectCanvasFillsPane(flow, canvasPane!);
  },
};

export const ModalDetail: Story = {
  name: 'Modal detail',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    detailPresentation: 'modal',
    emptyDetail: 'collapse',
    showBindingsList: true,
    showConvertPalette: false,
    showMinimap: false,
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const selectEdge = canvas.getByTestId('field-remap-select-edge-e-name');
    selectEdge.focus();
    await userEvent.click(selectEdge);

    const dialog = await body.findByRole('dialog', { name: 'Mapping details' });
    await expect(dialog).toBeVisible();
    await expect(within(dialog).getByTestId('field-remap-detail')).toBeVisible();
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__canvas-detail-split'),
    ).toBeNull();
    const overlay = dialog.closest<HTMLElement>('.ui-modal-overlay');
    await waitFor(() => {
      const overlayBounds = overlay!.getBoundingClientRect();
      const dialogBounds = dialog.getBoundingClientRect();
      expect(Math.abs(overlayBounds.width - window.innerWidth)).toBeLessThanOrEqual(1);
      expect(Math.abs(overlayBounds.height - window.innerHeight)).toBeLessThanOrEqual(1);
      expect(dialogBounds.left).toBeGreaterThanOrEqual(overlayBounds.left);
      expect(dialogBounds.top).toBeGreaterThanOrEqual(overlayBounds.top);
      expect(dialogBounds.right).toBeLessThanOrEqual(overlayBounds.right);
      expect(dialogBounds.bottom).toBeLessThanOrEqual(overlayBounds.bottom);
    });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(selectEdge).toHaveFocus());

    await userEvent.click(selectEdge);
    const reopenedDialog = await body.findByRole('dialog', { name: 'Mapping details' });
    await expect(reopenedDialog).toBeVisible();
    await waitFor(() => expect(reopenedDialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(selectEdge).toHaveFocus());
  },
};

export const EmbedEdgeFill: Story = {
  name: 'Embed edge-fill',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    emptyDetail: 'hint',
    showFlowHint: true,
    showBindingsList: true,
    showMinimap: false,
  },
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvasElement.querySelector('.workbench-field-remap-flow__workspace');
    const palette = canvas.getByTestId('field-remap-convert-palette');
    const flow = canvas.getByTestId('field-remap-flow');
    const detail = canvas.getByTestId('field-remap-detail');
    const separators = canvasElement.querySelectorAll('[role="separator"]');

    const mapper = canvas.getByTestId('field-remap-mapper');
    await expect(mapper).toHaveAttribute('data-chrome', 'embed');
    await expect(workspace).not.toBeNull();
    expect(Number.parseFloat(getComputedStyle(mapper).rowGap)).toBeGreaterThan(0);
    expect(getComputedStyle(workspace!).columnGap).toBe('0px');
    expect(getComputedStyle(palette).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(flow).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(detail).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(palette).borderRightWidth).toBe('0px');
    expect(getComputedStyle(detail).borderLeftWidth).toBe('0px');
    expect(separators).toHaveLength(2);
    expect(separators[0]?.getAttribute('aria-orientation')).toBe('vertical');
  },
};

export const EmbedCollapsedDetail: Story = {
  name: 'Embed collapsed detail (resizable rails)',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    emptyDetail: 'collapse',
    showBindingsList: true,
    showMinimap: false,
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const flow = canvas.getByTestId('field-remap-flow');
    const canvasPane = canvasElement.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__canvas-detail-split > .ui-workbench-split-view__primary',
    );
    const viewport = canvasElement.querySelector<HTMLElement>('.react-flow__viewport');
    const zoomIn = canvasElement.querySelector<HTMLButtonElement>('.react-flow__controls-zoomin');
    await expect(canvasPane).toBeTruthy();
    await expect(viewport).toBeTruthy();
    await expect(zoomIn).toBeTruthy();
    await waitFor(() => expect(viewport!.style.transform).not.toBe(''));
    const initialTransform = viewport!.style.transform;
    await userEvent.click(zoomIn!);
    await waitFor(() => expect(viewport!.style.transform).not.toBe(initialTransform));
    const zoomedTransform = viewport!.style.transform;

    await expect(canvas.queryByTestId('field-remap-detail')).toBeNull();
    await expect(canvas.getByTestId('field-remap-convert-palette')).toBeVisible();
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__canvas-detail-split'),
    ).toHaveClass('ui-workbench-split-view--secondary-collapsed');
    await expectCanvasFillsPane(flow, canvasPane!);

    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    await expect(canvas.getByTestId('field-remap-detail')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-convert-palette')).toBeVisible();
    await expect(canvasElement.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(viewport!.style.transform).toBe(zoomedTransform);
    await expectCanvasFillsPane(flow, canvasPane!);

    const separator = canvasElement.querySelector<HTMLElement>(
      '.workbench-field-remap-flow__canvas-detail-split > [role="separator"]',
    );
    await expect(separator).toBeTruthy();
    const before = separator!.getAttribute('aria-valuenow');
    separator!.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(separator).not.toHaveAttribute('aria-valuenow', before ?? '');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('field-remap-detail')).toBeNull());
    await expect(canvasElement.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(viewport!.style.transform).toBe(zoomedTransform);
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__canvas-detail-split'),
    ).toHaveClass('ui-workbench-split-view--secondary-collapsed');
    await waitFor(() =>
      expect(document.activeElement).toBe(canvas.getByTestId('field-remap-mapper')),
    );

    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    await userEvent.click(canvas.getByTestId('field-remap-detail-step-0'));
    const stepEditor = canvas.getByTestId('field-remap-step-id');
    stepEditor.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('field-remap-convert-note')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(canvas.getByTestId('field-remap-mapper')),
    );
  },
};

export const MediumEmbedLayout: Story = {
  name: 'Embed layout (1024px host)',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    showMinimap: false,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '64rem', maxInlineSize: '100%', minInlineSize: '64rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByTestId('field-remap-workspace');
    const flow = canvas.getByTestId('field-remap-flow');

    await waitFor(() => expect(workspace).toHaveAttribute('data-layout', 'medium'));
    await waitFor(() => {
      expect(flow.getBoundingClientRect().width).toBeGreaterThan(280);
      expect(flow.getBoundingClientRect().height).toBeGreaterThan(200);
    });
  },
};

export const NarrowEmbedLayout: Story = {
  name: 'Embed layout (360px host)',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    showMinimap: false,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '22.5rem', maxInlineSize: '100%', minInlineSize: '22.5rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByTestId('field-remap-workspace');
    const flow = canvas.getByTestId('field-remap-flow');

    await waitFor(() => expect(workspace).toHaveAttribute('data-layout', 'narrow'));
    await waitFor(() => expect(flow.getBoundingClientRect().width).toBeGreaterThan(280));
    await expect(flow.getBoundingClientRect().height).toBeGreaterThan(200);
    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-chrome', 'embed');
  },
};

export const UserContact: Story = {
  name: 'T_USER → T_CONTACT',
  args: { sampleId: 't-user-contact' },
};

export const EventTime: Story = {
  name: 'T_EVENT → T_SLOT',
  args: { sampleId: 't-event-time' },
};

export const EmpDept: Story = {
  name: 'T_EMP → T_EMP_ROW',
  args: { sampleId: 't-emp-dept' },
};

export const ProductCatalog: Story = {
  name: 'T_PRODUCT → T_CATALOG_ITEM',
  args: { sampleId: 't-product-catalog' },
};

export const CombineSplit: Story = {
  name: 'n→m combine / split',
  args: { sampleId: 'nm-combine-split' },
  tags: ['autodocs', 'storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('field-remap-convert-palette')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-add-combine')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-add-combine')).toHaveAccessibleName('Add combine');
    await expect(canvas.getByTestId('field-remap-add-split')).toHaveAccessibleName('Add split');
    await waitFor(() => expect(canvas.getByTestId('field-remap-op-op-name')).toBeVisible());
    await expect(await canvas.findByTestId('field-remap-result')).toHaveTextContent('Ada');
  },
};
