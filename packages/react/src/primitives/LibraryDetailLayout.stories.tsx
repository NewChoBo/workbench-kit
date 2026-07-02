import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import { LibraryDetailLayout } from './LibraryDetailLayout';

const sampleCover =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg';
const sampleBackground =
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/library_hero.jpg';

const meta = {
  title: 'Primitives/LibraryDetailLayout',
  component: LibraryDetailLayout,
  parameters: {
    layout: 'padded',
  },
  args: {
    actions: (
      <>
        <Button variant="primary">Play</Button>
        <Button secondary>Open Path</Button>
      </>
    ),
    coverAlt: 'Sample game',
    coverImageUrl: sampleCover,
    description: 'Short description excerpt for the selected library item.',
    summary: 'Steam · Installed · 42h playtime',
    title: 'Sample Game',
  },
} satisfies Meta<typeof LibraryDetailLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Banner: Story = {
  args: {
    children: <div>Metadata grid slot</div>,
    mode: 'banner',
  },
};

export const Background: Story = {
  args: {
    backgroundImageUrl: sampleBackground,
    children: <div>Metadata grid slot</div>,
    mode: 'background',
  },
};

export const MissingMedia: Story = {
  name: 'Missing media placeholders',
  args: {
    backgroundImageUrl: null,
    children: <div>Metadata grid slot</div>,
    coverImageUrl: null,
    logoImageUrl: null,
    mode: 'banner',
  },
};
