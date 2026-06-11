import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { screenColumn, screenText, type JdwScreenSpec } from '@workbench-kit/jdw';

import { JdwPreview } from '../jdw/JdwPreview.js';
import { ScreenSpecEditor, useScreenSpecPipeline } from '@workbench-kit/jdw-editor';
import { JDW_SAMPLE_SCREENS } from './fixtures/jdw-sample-screens.js';

function ScreenSpecEditorHarness({ sampleId = 'user-profile' }: { readonly sampleId?: string }) {
  const sample =
    JDW_SAMPLE_SCREENS.find((entry) => entry.id === sampleId) ?? JDW_SAMPLE_SCREENS[0]!;
  const pipeline = useScreenSpecPipeline(sample);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        minHeight: 520,
        padding: 16,
      }}
    >
      <ScreenSpecEditor value={pipeline.spec} onChange={pipeline.setSpec} />
      <JdwPreview json={pipeline.json} layoutConstraints={pipeline.layoutConstraints} />
    </div>
  );
}

function PlaygroundHarness() {
  const [spec, setSpec] = useState<JdwScreenSpec>(() => ({
    id: 'playground',
    title: 'Playground',
    description: 'Standalone screen spec editor',
    frameWidth: 360,
    layout: { maxWidth: 360, maxHeight: 200 },
    root: screenColumn(
      [screenText('Editable headline', { fontSize: 20 }), screenText('Supporting copy')],
      { gap: 8, padding: 16 },
    ),
  }));
  const pipeline = useScreenSpecPipeline(spec);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        minHeight: 520,
        padding: 16,
      }}
    >
      <ScreenSpecEditor
        value={pipeline.spec}
        onChange={(nextSpec) => {
          setSpec(nextSpec);
          pipeline.setSpec(nextSpec);
        }}
      />
      <JdwPreview json={pipeline.json} layoutConstraints={pipeline.layoutConstraints} />
    </div>
  );
}

const meta = {
  title: 'JDW/ScreenSpecEditor',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const UserProfileSample: Story = {
  render: () => <ScreenSpecEditorHarness sampleId="user-profile" />,
};

export const Playground: Story = {
  render: () => <PlaygroundHarness />,
};
