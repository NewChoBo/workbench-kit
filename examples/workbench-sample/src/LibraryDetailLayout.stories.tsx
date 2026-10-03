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

export const HeroCover: Story = {
  args: { mode: 'hero-cover', scrollMode: 'all' },
  decorators: [
    (Story) => (
      <div style={{ width: 640, height: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export const NarrowHeroCover: Story = {
  args: { mode: 'hero-cover', scrollMode: 'all' },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export const MissingHeroCover: Story = {
  args: { mode: 'hero-cover', scrollMode: 'all', showMedia: false },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 320 }}>
        <Story />
      </div>
    ),
  ],
};
