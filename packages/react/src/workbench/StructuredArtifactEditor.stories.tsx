import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
  StructuredArtifactEditor,
  type StructuredArtifactEditorProps,
} from './StructuredArtifactEditor';
import { WorkspaceDraftsProvider } from './workspace/WorkspaceDraftsContext';
import { type WorkspaceFile } from './workspace/types';
import { type WorkbenchStructuredDataSchemaDocument } from './settings/StructuredDataForm';

const meta = {
  title: 'React/Workbench/StructuredArtifactEditor',
  decorators: [
    (Story) => (
      <WorkspaceDraftsProvider>
        <Story />
      </WorkspaceDraftsProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const mockSchema: WorkbenchStructuredDataSchemaDocument = {
  activePattern: 'DBtoDB',
  schema: {
    properties: {
      'basic.title': { title: 'Title', type: 'string' },
      'basic.version': { title: 'Version', type: 'string' },
    },
    sections: [
      { fields: ['title', 'version'], sectionKey: 'basic', title: 'Basic Settings', type: 'form' },
    ],
  },
};

const mockFile: WorkspaceFile = {
  content: JSON.stringify(
    {
      basic: {
        title: 'Project Alpha',
        version: '1.0.0',
      },
    },
    null,
    2,
  ),
  path: 'config/project.schema.json',
  mimeType: 'application/json',
};

function EditorHarness(props: Partial<StructuredArtifactEditorProps>) {
  const [file, setFile] = useState<WorkspaceFile>(mockFile);

  const handleSaveFile = (_path: string, content: string) => {
    setFile((prev) => ({ ...prev, content }));
  };

  return (
    <div style={{ padding: 24, height: 600, background: 'var(--color-bg)' }}>
      <StructuredArtifactEditor
        file={file}
        schema={mockSchema}
        onSaveFile={handleSaveFile}
        {...props}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <EditorHarness defaultMode="preview" />,
};

export const CodeOnly: Story = {
  render: () => <EditorHarness defaultMode="code" />,
};

export const SplitMode: Story = {
  render: () => <EditorHarness defaultMode="split" />,
};

export const ReadOnly: Story = {
  render: () => <EditorHarness defaultMode="preview" readOnly />,
};

export const Interaction: Story = {
  render: () => <EditorHarness defaultMode="split" />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 초기 렌더링 확인 (Title 값 확인)
    const titleInput = canvas.getByRole('textbox', { name: 'Title' });
    await expect(titleInput).toHaveValue('Project Alpha');

    // 2. 폼 필드 수정 시 시뮬레이션
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Project Beta');
    await expect(titleInput).toHaveValue('Project Beta');

    // 3. 더티 마커(●) 및 Discard/Save 버튼 노출 확인
    await expect(canvas.getByTitle('Unsaved changes')).toBeVisible();
    const saveButton = canvas.getByRole('button', { name: 'Save' });
    const discardButton = canvas.getByRole('button', { name: 'Discard' });
    await expect(saveButton).toBeVisible();
    await expect(discardButton).toBeVisible();

    // 4. 취소(Discard) 클릭 시 원복 확인
    await userEvent.click(discardButton);
    await expect(titleInput).toHaveValue('Project Alpha');
  },
};
