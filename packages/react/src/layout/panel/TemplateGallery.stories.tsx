import type { Meta, StoryObj } from '@storybook/react-vite';
import '../../styles.css';
import {
  TemplateGallery,
  TemplateGalleryCard,
  TemplateGalleryFooter,
  TemplateGalleryGrid,
  TemplateGalleryHeader,
} from './TemplateGallery';

const meta = {
  component: TemplateGallery,
  title: 'react/layout/TemplateGallery',
} satisfies Meta<typeof TemplateGallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TemplateGallery style={{ height: 360 }}>
      <TemplateGalleryHeader>
        <strong>Templates</strong>
      </TemplateGalleryHeader>
      <TemplateGalleryGrid>
        <TemplateGalleryCard
          description="Starter layout for a workbench host."
          eyebrow="Layout"
          preview="▦"
          heading="Blank shell"
        />
        <TemplateGalleryCard skeleton heading="Loading" />
      </TemplateGalleryGrid>
      <TemplateGalleryFooter>2 templates</TemplateGalleryFooter>
    </TemplateGallery>
  ),
};
