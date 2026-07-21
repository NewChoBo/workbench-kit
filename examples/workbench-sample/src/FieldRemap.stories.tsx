import type { Meta, StoryObj } from '@storybook/react-vite';

import { FieldRemapDemo } from './FieldRemapDemo';

const meta = {
  title: 'Workbench Sample/Field Remap',
  component: FieldRemapDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Field remap panel: object ports, date/time combine·split, templates. Sample app: **Field Remap** activity.',
      },
    },
  },
  argTypes: {
    sampleId: {
      control: 'select',
      options: ['nested-ab', 't-user-contact', 't-event-time', 't-emp-dept', 't-product-catalog'],
    },
  },
} satisfies Meta<typeof FieldRemapDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NestedAB: Story = {
  name: 'A → B',
  args: { sampleId: 'nested-ab' },
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
