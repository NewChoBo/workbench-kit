import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StructuredArtifactEditor } from './StructuredArtifactEditor';
import { WorkspaceDraftsProvider } from './workspace/WorkspaceDraftsContext';
import { type WorkspaceFile } from './workspace/types';
import { type WorkbenchStructuredDataSchemaDocument } from './settings/StructuredDataForm';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

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

describe('StructuredArtifactEditor', () => {
  it('renders preview mode by default and displays structured form sections', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceDraftsProvider>
        <StructuredArtifactEditor file={mockFile} schema={mockSchema} defaultMode="preview" />
      </WorkspaceDraftsProvider>,
    );

    expect(markup).toContain('ui-structured-artifact-editor');
    expect(markup).toContain('data-mode="preview"');
    expect(markup).toContain('Basic Settings');
    expect(markup).toContain('Title');
    expect(markup).toContain('value="Project Alpha"');
    expect(markup).toContain('ui-workbench-structured-data-schema-panel-embed');
    expect(markup).toContain('ui-workbench-structured-data-schema-panel--fill');
  });

  it('renders code mode without displaying preview panel', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceDraftsProvider>
        <StructuredArtifactEditor file={mockFile} schema={mockSchema} defaultMode="code" />
      </WorkspaceDraftsProvider>,
    );

    expect(markup).toContain('ui-structured-artifact-editor');
    expect(markup).toContain('data-mode="code"');
    expect(markup).not.toContain('Basic Settings');
  });

  it('renders read-only mode by applying readonly attributes', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceDraftsProvider>
        <StructuredArtifactEditor
          file={mockFile}
          schema={mockSchema}
          defaultMode="preview"
          readOnly
        />
      </WorkspaceDraftsProvider>,
    );

    expect(markup).toContain('data-readonly="true"');
    expect(markup).toContain('readOnly=""');
  });

  it('renders split mode showing both code and preview panes', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceDraftsProvider>
        <StructuredArtifactEditor file={mockFile} schema={mockSchema} defaultMode="split" />
      </WorkspaceDraftsProvider>,
    );

    expect(markup).toContain('ui-structured-artifact-editor');
    expect(markup).toContain('data-mode="split"');
    expect(markup).toContain('Basic Settings');
  });
});
