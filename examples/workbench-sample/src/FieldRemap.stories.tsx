import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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
      options: [
        'nested-ab',
        't-user-contact',
        't-event-time',
        't-emp-dept',
        't-product-catalog',
        'nm-combine-split',
      ],
    },
    showMinimap: { control: 'boolean' },
    showHostChromeDemo: { control: 'boolean' },
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
    await userEvent.click(canvas.getByTestId('field-remap-toggle-minimap'));
    await expect(canvas.getByTestId('field-remap-mapper')).toHaveAttribute('data-minimap', 'off');
    await expect(canvasElement.querySelector('.react-flow__minimap')).toBeNull();
    await userEvent.click(canvas.getByTestId('field-remap-fit-view'));
    await expect(canvas.getByTestId('field-remap-fit-view')).toBeVisible();
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
  tags: ['storybook-play-required', 'storybook-play-sample'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('field-remap-convert-palette')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-add-combine')).toBeVisible();
    await expect(canvas.getByTestId('field-remap-op-op-name')).toBeVisible();
    await expect(await canvas.findByTestId('field-remap-result')).toHaveTextContent('Ada');
  },
};
