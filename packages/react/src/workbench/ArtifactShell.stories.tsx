import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
  WorkbenchArtifactShell,
  type WorkbenchArtifactDescriptor,
  type WorkbenchArtifactMode,
  type WorkbenchPreviewRenderer,
} from './ArtifactShell';

const meta = {
  component: WorkbenchArtifactShell,
  title: 'React/Workbench/ArtifactShell',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof WorkbenchArtifactShell>;

export default meta;

type Story = StoryObj<typeof meta>;

const markdownArtifact: WorkbenchArtifactDescriptor = {
  content: '# Release Notes\n\n- Added preview shell\n- Added renderer registry',
  id: 'artifact.release-notes',
  mimeType: 'text/markdown',
  path: 'docs/release-notes.md',
};

const jsonArtifact: WorkbenchArtifactDescriptor = {
  artifactKind: 'schema',
  content: {
    fields: ['name', 'enabled', 'threshold'],
    title: 'Settings schema',
  },
  id: 'artifact.settings-schema',
  mimeType: 'application/json',
  path: 'artifacts/settings.schema.json',
};

const imageArtifact: WorkbenchArtifactDescriptor = {
  artifactKind: 'diagram',
  content: 'diagram://workflow',
  id: 'artifact.workflow-diagram',
  mimeType: 'image/svg+xml',
  path: 'artifacts/workflow.svg',
};

const previewRenderers: WorkbenchPreviewRenderer[] = [
  {
    artifactKinds: ['diagram'],
    id: 'diagram-preview',
    priority: 10,
    render: (artifact) => (
      <div className="ui-workbench-artifact-story-preview">
        <strong>{artifact.path}</strong>
        <div className="ui-workbench-artifact-story-diagram">
          <span>Input</span>
          <span>Validate</span>
          <span>Output</span>
        </div>
      </div>
    ),
  },
  {
    id: 'json-preview',
    mimeTypes: ['application/json'],
    priority: 5,
    render: (artifact) => (
      <div className="ui-workbench-artifact-story-preview">
        <strong>{artifact.path}</strong>
        <pre>{JSON.stringify(artifact.content, null, 2)}</pre>
      </div>
    ),
  },
  {
    extensions: ['md', 'markdown'],
    id: 'markdown-preview',
    render: (artifact) => (
      <article className="ui-workbench-artifact-story-preview">
        <strong>Markdown preview</strong>
        <p>{String(artifact.content).split('\n')[0]?.replace(/^#\s*/, '')}</p>
      </article>
    ),
  },
  {
    fallback: true,
    id: 'fallback-preview',
    render: (artifact) => (
      <div className="ui-workbench-artifact-story-preview">
        <strong>{artifact.path ?? artifact.id}</strong>
        <span>Fallback preview</span>
      </div>
    ),
  },
];

function ShellHarness({
  artifact = markdownArtifact,
  initialMode = 'code',
  renderers = previewRenderers,
}: {
  artifact?: WorkbenchArtifactDescriptor;
  initialMode?: WorkbenchArtifactMode;
  renderers?: WorkbenchPreviewRenderer[];
}) {
  const [mode, setMode] = useState<WorkbenchArtifactMode>(initialMode);

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        height: 'min(calc(100vh - 96px), 680px)',
        padding: 24,
        width: 'min(100%, 960px)',
      }}
    >
      <WorkbenchArtifactShell
        artifact={artifact}
        mode={mode}
        previewRenderers={renderers}
        onModeChange={setMode}
      />
    </div>
  );
}

export const CodeOnly: Story = {
  render: () => <ShellHarness initialMode="code" />,
};

export const PreviewOnly: Story = {
  render: () => <ShellHarness artifact={jsonArtifact} initialMode="preview" />,
};

export const SplitMode: Story = {
  render: () => <ShellHarness initialMode="split" />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: 'Split' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByText('Markdown preview')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    await expect(canvas.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByText('Release Notes')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Code' }));
    await expect(canvas.getByRole('button', { name: 'Code' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByText(/Added renderer registry/)).toBeVisible();
  },
};

export const RendererPriority: Story = {
  render: () => <ShellHarness artifact={imageArtifact} initialMode="preview" />,
};

export const UnsupportedPreview: Story = {
  render: () => <ShellHarness artifact={markdownArtifact} initialMode="preview" renderers={[]} />,
};
