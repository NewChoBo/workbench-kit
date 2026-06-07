import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { WidgetJsonSchema, WidgetRegistryContract } from '@workbench-kit/contracts';
import { ROOT_WIDGET_PATH, type WidgetPath } from '@workbench-kit/json-widget';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { WorkbenchParseError } from '../layout/WorkbenchLayout';
import { EmptyState } from '../primitives/EmptyState';
import { Button } from '../primitives/Button';
import { Toolbar } from '../primitives/Toolbar';
import {
  WorkbenchArtifactModeControls,
  type WorkbenchArtifactMode,
} from '../workbench/ArtifactShell';
import { SplitView } from '../workbench/SplitView';
import { WorkspaceEditor, type WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor';
import { type WorkspaceFile } from '../workbench/workspace/types';
import { JsonWidgetPreview } from './JsonWidgetPreview.js';
import { JsonWidgetPreviewCanvas } from './JsonWidgetPreviewCanvas.js';
import { useJsonWidgetEditorSync } from './useJsonWidgetEditorSync.js';
import { WidgetInspectorPanel } from './WidgetEditorPanels.js';
import { WidgetTreePanel } from './tree-panel/WidgetTreePanel.js';

export interface JsonWidgetEditorProps {
  baselineValue?: string | undefined;
  defaultMode?: WorkbenchArtifactMode | undefined;
  headerActions?: ReactNode | undefined;
  mode?: WorkbenchArtifactMode | undefined;
  onChange: (value: string) => void;
  onDiscard?: (() => void) | undefined;
  onModeChange?: ((mode: WorkbenchArtifactMode) => void) | undefined;
  onSave?: (() => void) | undefined;
  onSelectionChange?: ((path: WidgetPath | null) => void) | undefined;
  path?: string | undefined;
  readOnly?: boolean | undefined;
  showInspectorPanel?: boolean | undefined;
  showTreePanel?: boolean | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  title?: ReactNode | undefined;
  value: string;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  jsonSchema?: WidgetJsonSchema | undefined;
  interactivePreview?: boolean | undefined;
}

export function JsonWidgetEditor({
  baselineValue,
  defaultMode = 'split',
  headerActions,
  mode,
  onChange,
  onDiscard,
  onModeChange,
  onSave,
  onSelectionChange,
  path = 'widget.json',
  readOnly = false,
  showInspectorPanel = true,
  showTreePanel = true,
  theme = 'dark',
  title = 'Widget editor',
  value,
  widgetRegistry,
  jsonSchema,
  interactivePreview = false,
}: JsonWidgetEditorProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<WorkbenchArtifactMode>(defaultMode);
  const resolvedMode = mode ?? uncontrolledMode;

  const setMode = (nextMode: WorkbenchArtifactMode) => {
    if (mode === undefined) {
      setUncontrolledMode(nextMode);
    }
    onModeChange?.(nextMode);
  };

  const sync = useJsonWidgetEditorSync({ baselineValue, resetKey: path, value });

  useEffect(() => {
    if (sync.root && sync.selection.pathKeys.size === 0) {
      sync.selectPath(ROOT_WIDGET_PATH);
    }
  }, [sync.root, sync.selection.pathKeys.size, sync.selectPath]);

  useEffect(() => {
    onSelectionChange?.(sync.selectedPath);
  }, [onSelectionChange, sync.selectedPath]);

  const editorFile = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: 'application/json',
      path,
    }),
    [path, value],
  );

  const handleEditorMount = useCallback<OnMount>(
    (editor, monaco) => {
      sync.handleEditorMount(editor, monaco);

      if (!jsonSchema) return;

      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'https://workbench-kit.dev/schemas/playground-widget.schema.json',
            fileMatch: [path],
            schema: jsonSchema,
          },
        ],
      });
    },
    [jsonSchema, path, sync],
  );

  const codePane = (
    <WorkspaceEditor
      file={editorFile}
      readOnly={readOnly}
      showHeader={false}
      theme={theme}
      value={value}
      onChange={onChange}
      onEditorMount={handleEditorMount}
    />
  );

  const previewPane =
    sync.parseError !== null ? (
      <EmptyState compact icon="codicon-error">
        Fix JSON errors to preview the widget.
      </EmptyState>
    ) : interactivePreview ? (
      <JsonWidgetPreviewCanvas
        json={value}
        selectedPathKeys={sync.selection.pathKeys}
        onSelectPath={sync.selectPath}
      />
    ) : (
      <JsonWidgetPreview json={value} registry={widgetRegistry} />
    );

  const editorBody = (() => {
    if (resolvedMode === 'code') {
      return (
        <section className="ui-json-widget-editor__pane" aria-label="Code">
          {codePane}
        </section>
      );
    }

    if (resolvedMode === 'preview') {
      return (
        <section className="ui-json-widget-editor__pane" aria-label="Preview">
          {previewPane}
        </section>
      );
    }

    return (
      <SplitView
        className="ui-json-widget-editor__split"
        defaultPrimarySizePercent={50}
        minPrimarySizePercent={20}
        primary={
          <section className="ui-json-widget-editor__pane" aria-label="Code">
            {codePane}
          </section>
        }
        secondary={
          <section className="ui-json-widget-editor__pane" aria-label="Preview">
            {previewPane}
          </section>
        }
      />
    );
  })();

  const centerPane = (
    <div className="ui-json-widget-editor__center">
      {editorBody}
      {sync.parseError ? (
        <WorkbenchParseError role="alert">{sync.parseError}</WorkbenchParseError>
      ) : null}
    </div>
  );

  const layout = (() => {
    const withInspector =
      showInspectorPanel && sync.root ? (
        <SplitView
          className="ui-json-widget-editor__inspector-split"
          defaultPrimarySizePercent={68}
          minPrimarySizePercent={45}
          primary={centerPane}
          secondary={
            <section className="ui-json-widget-editor__pane" aria-label="Inspector">
              <WidgetInspectorPanel
                path={sync.selectedPath}
                readOnly={readOnly}
                widget={sync.selectedWidget}
                widgetRegistry={widgetRegistry}
                onPatch={(next) => {
                  const nextDocument = sync.replaceSelectedWidget(next);
                  if (nextDocument) onChange(nextDocument);
                }}
              />
            </section>
          }
        />
      ) : (
        centerPane
      );

    if (!showTreePanel || !sync.root) {
      return withInspector;
    }

    return (
      <SplitView
        className="ui-json-widget-editor__tree-split"
        defaultPrimarySizePercent={22}
        minPrimarySizePercent={15}
        maxPrimarySizePercent={35}
        primary={
          <section className="ui-json-widget-editor__pane" aria-label="Widget tree">
            <WidgetTreePanel
              root={sync.root}
              readOnly={readOnly}
              selection={sync.selection}
              onPatch={(patch) => {
                const nextDocument = sync.applyPatch(patch);
                if (nextDocument) onChange(nextDocument);
              }}
              onSelect={(nextPath) => {
                sync.selectPath(nextPath);
              }}
            />
          </section>
        }
        secondary={withInspector}
      />
    );
  })();

  return (
    <Panel className="ui-json-widget-editor" data-theme={theme} data-mode={resolvedMode}>
      <PanelHeader
        actions={
          <Toolbar>
            {sync.dirty && !readOnly ? (
              <>
                {onDiscard ? <Button onClick={onDiscard}>Discard</Button> : null}
                {onSave ? (
                  <Button variant="primary" onClick={onSave}>
                    Save
                  </Button>
                ) : null}
              </>
            ) : null}
            {headerActions}
            <WorkbenchArtifactModeControls mode={resolvedMode} onModeChange={setMode} />
          </Toolbar>
        }
      >
        <span className="ui-json-widget-editor__title">
          {title}
          {sync.dirty ? (
            <span className="ui-json-widget-editor__dirty-indicator" title="Unsaved changes">
              ●
            </span>
          ) : null}
        </span>
      </PanelHeader>
      <PanelBody className="ui-json-widget-editor__body">{layout}</PanelBody>
    </Panel>
  );
}
