import { useState, useMemo, type ReactNode } from 'react';
import { useWorkspaceDrafts } from './workspace/WorkspaceDraftsContext';
import { WorkspaceEditor, type WorkspaceEditorTheme } from './workspace/WorkspaceEditor';
import { WorkbenchStructuredDataSchemaPanelEmbed } from './settings/StructuredDataSchemaPanelEmbed';
import { type WorkbenchStructuredDataSchemaDocument } from './settings/StructuredDataForm';
import { type WorkbenchArtifactMode, WorkbenchArtifactModeControls } from './ArtifactShell';
import { Button } from '../primitives/Button';
import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { Toolbar } from '../primitives/Toolbar';
import { SplitView } from './SplitView';
import { type WorkspaceFile } from './workspace/types';
import { fileNameOfPath } from './workspace/path';

export interface StructuredArtifactEditorProps {
  activePattern?: string;
  defaultMode?: WorkbenchArtifactMode;
  emptyLabel?: ReactNode;
  file: WorkspaceFile | null;
  headerActions?: ReactNode;
  mode?: WorkbenchArtifactMode;
  onModeChange?: (mode: WorkbenchArtifactMode) => void;
  onSaveFile?: (path: string, content: string) => void | Promise<void>;
  preferredTableColumns?: readonly string[];
  readOnly?: boolean;
  schema?: WorkbenchStructuredDataSchemaDocument | null;
  sectionValueAliases?: Record<string, readonly (string | number)[][]>;
  theme?: WorkspaceEditorTheme;
  titleFallback?: string;
  serialize?: (data: unknown) => string;
  deserialize?: (content: string) => unknown;
}

const defaultSerialize = (data: unknown) => JSON.stringify(data, null, 2);
const defaultDeserialize = (content: string) => {
  if (!content.trim()) return null;
  return JSON.parse(content);
};

export function StructuredArtifactEditor({
  activePattern,
  defaultMode = 'preview',
  emptyLabel = 'No artifact selected',
  file,
  headerActions,
  mode,
  onModeChange,
  onSaveFile,
  preferredTableColumns,
  readOnly = false,
  schema,
  sectionValueAliases,
  theme = 'dark',
  titleFallback,
  serialize = defaultSerialize,
  deserialize = defaultDeserialize,
}: StructuredArtifactEditorProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<WorkbenchArtifactMode>(defaultMode);
  const resolvedMode = mode ?? uncontrolledMode;

  const { getDraft, isDirty, updateDraft, saveDraft, discardDraft } = useWorkspaceDrafts();

  const setMode = (nextMode: WorkbenchArtifactMode) => {
    if (mode === undefined) {
      setUncontrolledMode(nextMode);
    }
    onModeChange?.(nextMode);
  };

  const currentContent = file ? getDraft(file.path, file.content) : '';
  const dirty = file ? isDirty(file.path, file.content) : false;

  const structuredData = useMemo(() => {
    if (!currentContent) return null;
    try {
      return deserialize(currentContent);
    } catch {
      return null;
    }
  }, [currentContent, deserialize]);

  if (!file) {
    return (
      <Panel className="ui-structured-artifact-editor ui-structured-artifact-editor--empty">
        <PanelBody>
          <div className="ui-workbench-artifact-shell__empty">{emptyLabel}</div>
        </PanelBody>
      </Panel>
    );
  }

  const handleTextChange = (text: string) => {
    updateDraft(file.path, text, file.content);
  };

  const handleDataChange = (nextData: unknown) => {
    try {
      const nextText = serialize(nextData);
      updateDraft(file.path, nextText, file.content);
    } catch {
      // ignore serialization failures during active input
    }
  };

  const handleSave = () => {
    if (!dirty) return;
    Promise.resolve(onSaveFile?.(file.path, currentContent))
      .then(() => {
        saveDraft(file.path, currentContent);
      })
      .catch(() => {
        // keep draft intact on failure
      });
  };

  const handleDiscard = () => {
    discardDraft(file.path, file.content);
  };

  const codePane = (
    <WorkspaceEditor
      file={file}
      readOnly={readOnly}
      showHeader={false}
      theme={theme}
      value={currentContent}
      onChange={handleTextChange}
    />
  );

  const previewPane = (
    <WorkbenchStructuredDataSchemaPanelEmbed
      activePattern={activePattern}
      ariaLabel="Schema sections"
      data={structuredData}
      preferredTableColumns={preferredTableColumns}
      readOnly={readOnly}
      schema={schema}
      sectionValueAliases={sectionValueAliases}
      titleFallback={titleFallback ?? fileNameOfPath(file.path)}
      onDataChange={handleDataChange}
    />
  );

  return (
    <Panel className="ui-structured-artifact-editor" data-theme={theme} data-mode={resolvedMode}>
      <PanelHeader
        actions={
          <Toolbar>
            {dirty && !readOnly ? (
              <>
                <Button onClick={handleDiscard}>Discard</Button>
                <Button variant="primary" onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : null}
            {headerActions}
            <WorkbenchArtifactModeControls mode={resolvedMode} onModeChange={setMode} />
          </Toolbar>
        }
      >
        <span className="ui-structured-artifact-editor__title">
          {titleFallback ?? fileNameOfPath(file.path)}
          {dirty ? (
            <span
              className="ui-structured-artifact-editor__dirty-indicator"
              title="Unsaved changes"
            >
              ●
            </span>
          ) : null}
        </span>
      </PanelHeader>
      <PanelBody className="ui-structured-artifact-editor__body">
        {resolvedMode === 'code' ? (
          <section className="ui-structured-artifact-editor__pane" aria-label="Code">
            {codePane}
          </section>
        ) : null}
        {resolvedMode === 'preview' ? (
          <section className="ui-structured-artifact-editor__pane" aria-label="Preview">
            {previewPane}
          </section>
        ) : null}
        {resolvedMode === 'split' ? (
          <SplitView
            className="ui-structured-artifact-editor__split"
            defaultPrimarySizePercent={50}
            minPrimarySizePercent={20}
            primary={
              <section className="ui-structured-artifact-editor__pane" aria-label="Code">
                {codePane}
              </section>
            }
            secondary={
              <section className="ui-structured-artifact-editor__pane" aria-label="Preview">
                {previewPane}
              </section>
            }
          />
        ) : null}
      </PanelBody>
    </Panel>
  );
}
