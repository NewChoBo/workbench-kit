import type { Meta, StoryObj } from '@storybook/react-vite';

import { RecordMediaHero } from './RecordMediaHero';

const sampleCover =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg';

const meta = {
  title: 'Primitives/RecordMediaHero',
  component: RecordMediaHero,
  parameters: {
    layout: 'padded',
  },
  args: {
    alt: 'Sample record cover',
    imageUrl: sampleCover,
  },
} satisfies Meta<typeof RecordMediaHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Banner: Story = {
  args: {
    layout: 'banner',
  },
};

export const CompactCover: Story = {
  name: 'Compact (Steam-style)',
  args: {
    layout: 'compact',
  },
};

export const Background: Story = {
  name: 'Background (Playnite-style)',
  render: (args) => (
    <div
      style={{
        position: 'relative',
        minHeight: 240,
        padding: 16,
        border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.12))',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <RecordMediaHero {...args} layout="background" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <strong>Game Title</strong>
        <p style={{ margin: '8px 0 0', opacity: 0.85 }}>
          Metadata and actions render above the blurred background hero.
        </p>
      </div>
    </div>
  ),
};
