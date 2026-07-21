import type { Meta, StoryObj } from '@storybook/react-vite';

import { LibraryDetailLayoutDemo } from './LibraryDetailLayoutDemo';

const meta = {
  title: 'Workbench Sample/Library Detail',
  component: LibraryDetailLayoutDemo,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LibraryDetailLayoutDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BannerLayout: Story = {
  name: 'Banner layout',
  args: {
    mode: 'banner',
  },
};

export const BackgroundLayout: Story = {
  name: 'Background layout',
  args: {
    mode: 'background',
  },
};

export const MissingMediaPlaceholders: Story = {
  name: 'Missing media placeholders',
  args: {
    mode: 'banner',
    showMedia: false,
  },
};
