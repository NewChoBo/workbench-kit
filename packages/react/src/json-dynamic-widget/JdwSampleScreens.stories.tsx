import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { JsonWidgetPreview } from '../json-widget/JsonWidgetPreview.js';
import { JdwSampleScreenExplorer } from './JdwSampleScreenExplorer.js';
import {
  formatJdwSampleScreenJson,
  JDW_SAMPLE_SCREENS,
  sampleLayoutConstraints,
  type JdwSampleScreenDefinition,
} from './fixtures/jdw-sample-screens.js';

interface JdwSampleScreenFrameProps {
  readonly sample: JdwSampleScreenDefinition;
}

function JdwSampleScreenFrame({ sample }: JdwSampleScreenFrameProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: sample.frameWidth }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e8eaed' }}>{sample.title}</h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: '#9aa0a6' }}>
          {sample.description}
        </p>
      </div>
      <div
        style={{
          width: sample.frameWidth,
          maxWidth: '100%',
          border: '1px solid #3c4043',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#0d0f12',
        }}
      >
        <JsonWidgetPreview
          json={formatJdwSampleScreenJson(sample)}
          layoutConstraints={sampleLayoutConstraints(sample)}
        />
      </div>
    </div>
  );
}

interface JdwSampleGalleryProps {
  readonly samples: readonly JdwSampleScreenDefinition[];
}

function JdwSampleGallery({ samples }: JdwSampleGalleryProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 28,
        alignItems: 'start',
      }}
    >
      {samples.map((sample) => (
        <JdwSampleScreenFrame key={sample.id} sample={sample} />
      ))}
    </div>
  );
}

const meta = {
  title: 'JsonDynamicWidget/SampleScreens',
  component: JdwSampleScreenExplorer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
} satisfies Meta<typeof JdwSampleScreenExplorer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Explorer: Story = {
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('jdw-sample-explorer')).toBeVisible();
    const sampleSelect = canvas.getByTestId('jdw-sample-screen-select');
    const jsonEditor = canvas.getByTestId('jdw-sample-explorer-json');
    const preview = canvas.getByTestId('json-widget-preview-output');

    await expect(sampleSelect).toHaveValue('analytics-dashboard');
    await expect(jsonEditor).toBeVisible();
    await expect(preview).toHaveTextContent('12,480');

    await userEvent.selectOptions(sampleSelect, 'user-profile');

    await expect(sampleSelect).toHaveValue('user-profile');
    await expect(preview).toHaveTextContent('Alex Morgan');

    await userEvent.selectOptions(sampleSelect, 'pricing-plans');

    await expect(sampleSelect).toHaveValue('pricing-plans');
    await expect(preview).toHaveTextContent('Choose a plan');
    await expect(preview).toHaveTextContent('$12');

    await userEvent.click(canvas.getByTestId('jdw-sample-source-spec'));
    await expect(canvas.getByTestId('jdw-sample-source-spec')).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(canvas.getByTestId('jdw-sample-source-jdw'));
    await expect(canvas.getByTestId('jdw-sample-source-jdw')).toHaveAttribute('aria-pressed', 'true');
    await expect(preview).toHaveTextContent('Choose a plan');

    await userEvent.click(canvas.getByTestId('jdw-sample-source-spec'));
    const editor = canvas.getByTestId('jdw-sample-explorer-json');
    await userEvent.clear(editor);
    await userEvent.click(editor);
    await userEvent.paste(
      JSON.stringify(
        {
          id: 'playground',
          title: 'Playground',
          description: 'Edited in Storybook play',
          frameWidth: 320,
          layout: { maxWidth: 320, maxHeight: 120 },
          root: { kind: 'text', content: 'Edited from spec', style: { fontSize: 18 } },
        },
        null,
        2,
      ),
    );
    await expect(canvas.queryByTestId('jdw-sample-explorer-error')).not.toBeInTheDocument();
    await expect(preview).toHaveTextContent('Edited from spec');
  },
};

export const Gallery: Story = {
  render: () => <JdwSampleGallery samples={JDW_SAMPLE_SCREENS} />,
  parameters: {
    layout: 'padded',
  },
};

function previewStoryFor(id: string): Story {
  const sample = JDW_SAMPLE_SCREENS.find((entry) => entry.id === id);
  if (!sample) {
    throw new Error(`Unknown JDW sample screen: ${id}`);
  }

  return {
    render: () => <JdwSampleScreenFrame sample={sample} />,
    parameters: {
      layout: 'padded',
    },
  };
}

export const AnalyticsDashboard: Story = previewStoryFor('analytics-dashboard');
export const UserProfile: Story = previewStoryFor('user-profile');
export const SettingsPanel: Story = previewStoryFor('settings-panel');
export const PricingPlans: Story = previewStoryFor('pricing-plans');
export const MediaGallery: Story = previewStoryFor('media-gallery');
export const InboxList: Story = previewStoryFor('inbox-list');
export const AppToolbar: Story = previewStoryFor('app-toolbar');
export const HeroLanding: Story = previewStoryFor('hero-landing');
export const StackBadgeCard: Story = previewStoryFor('stack-badge-card');
export const FeatureGrid: Story = previewStoryFor('feature-grid');
export const StatusBoard: Story = previewStoryFor('status-board');
