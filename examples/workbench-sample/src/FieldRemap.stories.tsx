import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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
    await expect(ioBrowse.getByText('PersonProfile@1')).toBeVisible();
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

export const EmbedChrome: Story = {
  name: 'Embed chrome',
  args: {
    sampleId: 'nested-ab',
    chrome: 'embed',
    emptyDetail: 'collapse',
    showConvertPalette: false,
    showMinimap: false,
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByTestId('field-remap-workspace');
    const flow = canvas.getByTestId('field-remap-flow');
    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-chrome', 'embed');
    await expect(canvas.queryByTestId('field-remap-hint')).toBeNull();
    await expect(canvas.queryByTestId('field-remap-edges')).toBeNull();
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
    const viewport = canvasElement.querySelector<HTMLElement>('.react-flow__viewport');
    const zoomIn = canvasElement.querySelector<HTMLButtonElement>('.react-flow__controls-zoomin');
    await expect(viewport).toBeTruthy();
    await expect(zoomIn).toBeTruthy();
    await waitFor(() => expect(viewport!.style.transform).not.toBe(''));
    const initialTransform = viewport!.style.transform;
    await userEvent.click(zoomIn!);
    await waitFor(() => expect(viewport!.style.transform).not.toBe(initialTransform));
    const zoomedTransform = viewport!.style.transform;

    await expect(canvas.queryByTestId('field-remap-detail')).toBeNull();
    await expect(
      canvasElement.querySelector('.workbench-field-remap-flow__canvas-detail-split'),
    ).toHaveClass('ui-workbench-split-view--secondary-collapsed');

    await userEvent.click(canvas.getByTestId('field-remap-select-edge-e-name'));
    await expect(canvas.getByTestId('field-remap-detail')).toBeVisible();
    await expect(canvasElement.querySelector('.react-flow__viewport')).toBe(viewport);
    expect(viewport!.style.transform).toBe(zoomedTransform);

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
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const flow = canvas.getByTestId('field-remap-flow');

    await waitFor(() => expect(flow.getBoundingClientRect().width).toBeGreaterThan(280));
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
