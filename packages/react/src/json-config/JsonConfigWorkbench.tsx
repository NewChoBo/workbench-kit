import { useMemo, useState, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import { parseWidgetJson } from '@workbench-kit/json-widget';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { EmptyState } from '../primitives/EmptyState';
import { Button } from '../primitives/Button';
import { Toolbar } from '../primitives/Toolbar';
import {
  JsonCodeEditorPane,
  JsonConfigValidationBanner,
} from '../json-widget/JsonCodeEditorPane.js';
import { JsonWidgetPreview } from '../json-widget/JsonWidgetPreview.js';
import { JsonWidgetCanvas } from '../json-widget/JsonWidgetCanvas.js';
import type {
  WidgetAssetResolver,
  WidgetRendererRegistry,
} from '../json-widget/renderer/context.js';
import {
  WorkbenchArtifactModeControls,
  type WorkbenchArtifactMode,
} from '../workbench/ArtifactShell';
import { SplitView } from '../workbench/SplitView';
import { WorkbenchStructuredDataSchemaPanel } from '../workbench/settings/StructuredDataSchemaPanel';
import { type WorkbenchStructuredDataSchemaDocument } from '../workbench/settings/StructuredDataForm';
import { type WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor';
import { type WorkspaceFile } from '../workbench/workspace/types';
import { createJsonConfigEditorState } from './json-config-editor-state.js';

export type JsonConfigPreviewKind = 'auto' | 'none' | 'schema' | 'widget';

export interface JsonConfigWorkbenchProps {
  activePattern?: string | undefined;
  baselineValue?: string | undefined;
  defaultMode?: WorkbenchArtifactMode | undefined;
  emptyPreviewLabel?: ReactNode | undefined;
  headerActions?: ReactNode | undefined;
  mode?: WorkbenchArtifactMode | undefined;
  onChange: (value: string) => void;
  onApply?: (() => void) | undefined;
  onDiscard?: (() => void) | undefined;
  onModeChange?: ((mode: WorkbenchArtifactMode) => void) | undefined;
  onSave?: (() => void) | undefined;
  path?: string | undefined;
  preferredTableColumns?: readonly string[] | undefined;
  previewKind?: JsonConfigPreviewKind | undefined;
  readOnly?: boolean | undefined;
  schema?: WorkbenchStructuredDataSchemaDocument | null | undefined;
  sectionValueAliases?: Record<string, readonly (string | number)[][]> | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  title?: ReactNode | undefined;
  titleFallback?: string | undefined;
  value: string;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  /**
   * When true, the widget preview pane renders the document to real DOM with
   * `JsonWidgetCanvas` (builtin layout/leaf renderers + optional custom
   * renderers) instead of the summary `JsonWidgetPreview`.
   */
  useWidgetCanvas?: boolean | undefined;
  /** Custom renderers for the real-rendering canvas (builtins always available). */
  widgetRendererRegistry?: WidgetRendererRegistry | undefined;
  /** Asset reference resolver injected into the real-rendering canvas. */
  resolveAssetSrc?: WidgetAssetResolver | undefined;
}

const defaultDeserialize = (content: string) => {
  if (!content.trim()) return null;
  return JSON.parse(content);
};

const defaultSerialize = (data: unknown) => JSON.stringify(data, null, 2);

export function resolveJsonConfigPreviewKind(
  previewKind: JsonConfigPreviewKind,
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  json: string,
): 'none' | 'schema' | 'widget' {
  if (previewKind === 'none') return 'none';
  if (previewKind === 'schema') return schema ? 'schema' : 'none';
  if (previewKind === 'widget') return 'widget';
  if (schema) return 'schema';

  const parsed = parseWidgetJson(json);
  if (parsed.value !== null && typeof parsed.value.type === 'string') {
    return 'widget';
  }

  return 'none';
}

export function JsonConfigWorkbench({
  activePattern,
  baselineValue,
  defaultMode = 'split',
  emptyPreviewLabel = 'No preview available for this document.',
  headerActions,
  mode,
  onChange,
  onApply,
  onDiscard,
  onModeChange,
  onSave,
  path = 'config.json',
  preferredTableColumns,
  previewKind = 'auto',
  readOnly = false,
  schema,
  sectionValueAliases,
  theme = 'dark',
  title = 'Configuration',
  titleFallback,
  value,
  widgetRegistry,
  useWidgetCanvas = false,
  widgetRendererRegistry,
  resolveAssetSrc,
}: JsonConfigWorkbenchProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<WorkbenchArtifactMode>(defaultMode);
  const resolvedMode = mode ?? uncontrolledMode;

  const setMode = (nextMode: WorkbenchArtifactMode) => {
    if (mode === undefined) {
      setUncontrolledMode(nextMode);
    }
    onModeChange?.(nextMode);
  };

  const dirty = baselineValue !== undefined && value !== baselineValue;
  const editorState = useMemo(
    () =>
      createJsonConfigEditorState({
        baselineValue: baselineValue ?? value,
        currentValue: value,
      }),
    [baselineValue, value],
  );
  const resolvedPreviewKind = resolveJsonConfigPreviewKind(previewKind, schema, value);

  const structuredData = useMemo(() => {
    try {
      return defaultDeserialize(value);
    } catch {
      return null;
    }
  }, [value]);

  const editorFile = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: 'application/json',
      path,
    }),
    [path, value],
  );

  const handleDataChange = (nextData: unknown) => {
    try {
      onChange(defaultSerialize(nextData));
    } catch {
      // ignore serialization failures during active input
    }
  };

  const codePane = (
    <JsonCodeEditorPane
      file={editorFile}
      readOnly={readOnly}
      showProblemsPanel
      theme={theme}
      value={value}
      onChange={onChange}
      onSave={onSave}
    />
  );

  const previewPane = (() => {
    if (resolvedPreviewKind === 'schema' && schema) {
      return (
        <div className="ui-json-config-workbench__preview">
          <WorkbenchStructuredDataSchemaPanel
            activePattern={activePattern}
            ariaLabel="Configuration sections"
            data={structuredData}
            preferredTableColumns={preferredTableColumns}
            readOnly={readOnly}
            schema={schema}
            sectionValueAliases={sectionValueAliases}
            titleFallback={titleFallback ?? path}
            onDataChange={handleDataChange}
          />
        </div>
      );
    }

    if (resolvedPreviewKind === 'widget') {
      return (
        <div className="ui-json-config-workbench__preview">
          {useWidgetCanvas ? (
            <JsonWidgetCanvas
              json={value}
              registry={widgetRendererRegistry}
              resolveAssetSrc={resolveAssetSrc}
            />
          ) : (
            <JsonWidgetPreview json={value} registry={widgetRegistry} />
          )}
        </div>
      );
    }

    return (
      <EmptyState compact icon="codicon-open-preview">
        {emptyPreviewLabel}
      </EmptyState>
    );
  })();

  return (
    <Panel className="ui-json-config-workbench" data-theme={theme} data-mode={resolvedMode}>
      <PanelHeader
        actions={
          <Toolbar>
            {editorState.canApply && onApply ? (
              <Button variant="primary" onClick={onApply}>
                Apply
              </Button>
            ) : null}
            {dirty && !readOnly ? (
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
        <span className="ui-json-config-workbench__title">
          {title}
          {dirty ? (
            <span className="ui-json-config-workbench__dirty-indicator" title="Unsaved changes">
              ●
            </span>
          ) : null}
        </span>
      </PanelHeader>
      <PanelBody className="ui-json-config-workbench__body">
        <JsonConfigValidationBanner
          canApply={editorState.canApply}
          firstError={editorState.firstError}
          validationOk={editorState.validationOk}
        />
        {resolvedMode === 'code' ? (
          <section className="ui-json-config-workbench__pane" aria-label="Code">
            {codePane}
          </section>
        ) : null}
        {resolvedMode === 'preview' ? (
          <section className="ui-json-config-workbench__pane" aria-label="Preview">
            {previewPane}
          </section>
        ) : null}
        {resolvedMode === 'split' ? (
          <SplitView
            className="ui-json-config-workbench__split"
            defaultPrimarySizePercent={50}
            minPrimarySizePercent={20}
            primary={
              <section className="ui-json-config-workbench__pane" aria-label="Code">
                {codePane}
              </section>
            }
            secondary={
              <section className="ui-json-config-workbench__pane" aria-label="Preview">
                {previewPane}
              </section>
            }
          />
        ) : null}
      </PanelBody>
    </Panel>
  );
}
