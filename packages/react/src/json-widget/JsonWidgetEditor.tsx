import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { WidgetJsonSchema, WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  getWidgetAtPath,
  ROOT_WIDGET_PATH,
  type WidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/json-widget';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { WorkbenchParseError } from '../layout/WorkbenchLayout';
import { EmptyState } from '../primitives/EmptyState';
import { Button } from '../primitives/Button';
import { ButtonGroup } from '../primitives/WorkbenchEditor';
import { Toolbar } from '../primitives/Toolbar';
import {
  WorkbenchArtifactModeControls,
  type WorkbenchArtifactMode,
} from '../workbench/ArtifactShell';
import { SplitView } from '../workbench/SplitView';
import { type WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor';
import { type WorkspaceFile } from '../workbench/workspace/types';
import type { AuthoringDropPayload } from '../authoring/authoring-drop.js';
import type { InspectorAssetOption } from '../authoring/InspectorAssetPickerRow.js';
import type { PlaygroundWidgetTemplate } from './playground/demo-registry.js';
import { JsonCodeEditorPane } from './JsonCodeEditorPane.js';
import { JsonWidgetPreview } from './JsonWidgetPreview.js';
import { JsonWidgetPreviewCanvas } from './JsonWidgetPreviewCanvas.js';
import {
  handleAuthoringShortcutKeyDown,
  type AuthoringShortcutHandlers,
} from '../authoring/authoring-shortcuts.js';
import {
  useJsonWidgetEditorSync,
  type JsonWidgetHistoryActions,
} from './useJsonWidgetEditorSync.js';
import type { InspectorPanelMode } from '../authoring/inspector-mode.js';
import { WidgetInspectorPanel } from './WidgetEditorPanels.js';
import { WidgetTreePanel } from './tree-panel/WidgetTreePanel.js';
import { AuthoringSidebarLayout } from '../authoring/AuthoringSidebarLayout.js';
import {
  DEFAULT_AUTHORING_SIDEBAR_PLACEMENT,
  resolveAuthoringSidebarPlacement,
  type AuthoringPanelDefinition,
  type AuthoringSidebarPlacement,
} from '../authoring/authoring-sidebar.js';
import type { WidgetEditorSidePanelTab } from '../authoring/WidgetEditorSidePanel.js';

export interface JsonWidgetEditorProps {
  baselineValue?: string | undefined;
  canvasHeight?: number | undefined;
  canvasWidth?: number | undefined;
  defaultMode?: WorkbenchArtifactMode | undefined;
  emptyStateQuickTemplates?: readonly PlaygroundWidgetTemplate[] | undefined;
  headerActions?: ReactNode | ((history: JsonWidgetHistoryActions) => ReactNode) | undefined;
  historyResetKey?: string | number | undefined;
  imageSrcAssets?: readonly InspectorAssetOption[] | undefined;
  onDeleteSelected?: (() => void) | undefined;
  mode?: WorkbenchArtifactMode | undefined;
  onAuthoringDrop?: (payload: AuthoringDropPayload, position: { x: number; y: number }) => void;
  onChange: (value: string) => void;
  resolveAssetSrc?: ((src: string) => string) | undefined;
  onDiscard?: (() => void) | undefined;
  onEmptyInsertTemplate?: ((template: PlaygroundWidgetTemplate) => void) | undefined;
  onModeChange?: ((mode: WorkbenchArtifactMode) => void) | undefined;
  onSave?: (() => void) | undefined;
  inspectorMode?: InspectorPanelMode | undefined;
  onSelectionChange?:
    | ((path: WidgetPath | null, selection: WidgetSelectionState) => void)
    | undefined;
  path?: string | undefined;
  previewToolbarExtras?: ReactNode | undefined;
  leftPanelTabs?: readonly WidgetEditorSidePanelTab[] | undefined;
  readOnly?: boolean | undefined;
  /** Consumer-provided right sidebar (e.g. authoring chat). Kit stays domain-neutral. */
  renderRightSidebar?: (() => ReactNode) | undefined;
  onSidebarPlacementChange?: ((placement: AuthoringSidebarPlacement) => void) | undefined;
  showInspectorPanel?: boolean | undefined;
  showSidebarMoveControls?: boolean | undefined;
  sidebarPlacement?: AuthoringSidebarPlacement | undefined;
  showProblemsPanel?: boolean | undefined;
  showTreePanel?: boolean | undefined;
  previewModeLabel?: string | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  title?: ReactNode | undefined;
  value: string;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  jsonSchema?: WidgetJsonSchema | undefined;
  interactivePreview?: boolean | undefined;
}

export function JsonWidgetEditor({
  baselineValue,
  canvasHeight,
  canvasWidth,
  defaultMode = 'split',
  emptyStateQuickTemplates,
  headerActions,
  historyResetKey,
  imageSrcAssets,
  inspectorMode = 'advanced',
  mode,
  onAuthoringDrop,
  onChange,
  onDeleteSelected,
  onDiscard,
  onEmptyInsertTemplate,
  onModeChange,
  onSave,
  onSelectionChange,
  resolveAssetSrc,
  path = 'widget.json',
  previewToolbarExtras,
  leftPanelTabs,
  readOnly = false,
  renderRightSidebar,
  onSidebarPlacementChange,
  showInspectorPanel = true,
  showSidebarMoveControls = false,
  sidebarPlacement,
  showProblemsPanel = true,
  showTreePanel = true,
  previewModeLabel = 'GUI',
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

  const historyReset = historyResetKey ?? path;
  const sync = useJsonWidgetEditorSync({ baselineValue, resetKey: String(historyReset), value });

  const historyActions = useMemo<JsonWidgetHistoryActions>(
    () => ({
      canRedo: sync.canRedo,
      canUndo: sync.canUndo,
      redo: sync.redo,
      undo: sync.undo,
    }),
    [sync.canRedo, sync.canUndo, sync.redo, sync.undo],
  );

  const handleDocumentChange = useCallback(
    (next: string) => {
      const committed = sync.commitDocument(next);
      onChange(committed);
    },
    [onChange, sync],
  );

  const handleUndo = useCallback(() => {
    const next = sync.undo();
    if (next !== null) onChange(next);
  }, [onChange, sync]);

  const handleRedo = useCallback(() => {
    const next = sync.redo();
    if (next !== null) onChange(next);
  }, [onChange, sync]);

  useEffect(() => {
    if (sync.root && sync.selection.pathKeys.size === 0) {
      sync.selectPath(ROOT_WIDGET_PATH);
    }
  }, [sync.root, sync.selection.pathKeys.size, sync.selectPath]);

  useEffect(() => {
    onSelectionChange?.(sync.selectedPath, sync.selection);
  }, [onSelectionChange, sync.selectedPath, sync.selection]);

  const editorFile = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: 'application/json',
      path,
    }),
    [path, value],
  );

  const parentWidget = useMemo(() => {
    if (!sync.root || !sync.selectedPath || sync.selectedPath.length === 0) return null;
    return getWidgetAtPath(sync.root, sync.selectedPath.slice(0, -1));
  }, [sync.root, sync.selectedPath]);

  const handlePreviewPatch = useCallback(
    (patch: Parameters<typeof sync.applyPatch>[0]) => {
      const nextDocument = sync.applyPatch(patch);
      if (nextDocument) onChange(nextDocument);
    },
    [onChange, sync],
  );

  useEffect(() => {
    if (readOnly) return;

    const shortcutHandlers: AuthoringShortcutHandlers = {
      onDelete: onDeleteSelected,
      onRedo: handleRedo,
      onUndo: handleUndo,
    };

    const onKeyDown = (event: KeyboardEvent) => {
      handleAuthoringShortcutKeyDown(event, shortcutHandlers, {
        canDelete: Boolean(onDeleteSelected),
        canRedo: sync.canRedo,
        canUndo: sync.canUndo,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRedo, handleUndo, onDeleteSelected, readOnly, sync.canRedo, sync.canUndo]);

  const resolvedHeaderActions =
    typeof headerActions === 'function' ? headerActions(historyActions) : headerActions;

  const toggleViewModeRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    toggleViewModeRef.current = () => {
      setMode(resolvedMode === 'split' ? 'code' : 'split');
    };
  });

  const handleEditorMount = useCallback<OnMount>(
    (editor, monaco) => {
      sync.handleEditorMount(editor, monaco);

      editor.addCommand(
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyV),
        () => toggleViewModeRef.current?.(),
      );
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () =>
        toggleViewModeRef.current?.(),
      );

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
    <JsonCodeEditorPane
      documentParseError={sync.parseError}
      file={editorFile}
      readOnly={readOnly}
      showProblemsPanel={showProblemsPanel}
      theme={theme}
      value={value}
      onChange={handleDocumentChange}
      onEditorMount={handleEditorMount}
      onSave={onSave}
    />
  );

  const previewPane =
    sync.parseError !== null ? (
      <EmptyState compact icon="codicon-error">
        Fix JSON errors to preview the widget.
      </EmptyState>
    ) : interactivePreview ? (
      <JsonWidgetPreviewCanvas
        canvasHeight={canvasHeight}
        canvasWidth={canvasWidth}
        emptyStateQuickTemplates={emptyStateQuickTemplates}
        json={value}
        parseError={sync.parseError}
        previewToolbarExtras={previewToolbarExtras}
        readOnly={readOnly}
        selectedPathKeys={sync.selection.pathKeys}
        onAuthoringDrop={readOnly ? undefined : onAuthoringDrop}
        onEmptyInsertTemplate={readOnly ? undefined : onEmptyInsertTemplate}
        onPatch={readOnly ? undefined : handlePreviewPatch}
        onSelectPath={sync.selectPath}
        resolveAssetSrc={resolveAssetSrc}
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
    const inspectorPanel =
      showInspectorPanel && sync.root ? (
        <WidgetInspectorPanel
          imageSrcAssets={imageSrcAssets}
          inspectorMode={inspectorMode}
          parentWidget={parentWidget}
          path={sync.selectedPath}
          readOnly={readOnly}
          selectedCount={sync.selection.pathKeys.size}
          widget={sync.selectedWidget}
          widgetRegistry={widgetRegistry}
          onPatch={(next) => {
            const nextDocument = sync.replaceSelectedWidget(next);
            if (nextDocument) onChange(nextDocument);
          }}
        />
      ) : null;

    const panels: Record<string, AuthoringPanelDefinition> = {};

    for (const tab of leftPanelTabs ?? []) {
      panels[tab.id] = { id: tab.id, label: tab.label, content: tab.content };
    }

    if (inspectorPanel) {
      panels.properties = { id: 'properties', label: 'Properties', content: inspectorPanel };
    }

    if (showTreePanel && sync.root) {
      panels.tree = {
        id: 'tree',
        label: 'Layers',
        content: (
          <WidgetTreePanel
            root={sync.root}
            readOnly={readOnly}
            selection={sync.selection}
            onPatch={(patch) => {
              const nextDocument = sync.applyPatch(patch);
              if (nextDocument) onChange(nextDocument);
            }}
            onSelect={(nextPath, options) => {
              sync.selectPath(nextPath, options);
            }}
          />
        ),
      };
    }

    const rightSidebarContent = renderRightSidebar?.() ?? null;
    if (rightSidebarContent) {
      panels.chat = { id: 'chat', label: 'Chat', content: rightSidebarContent };
    }

    const availablePanelIds = Object.keys(panels);
    if (availablePanelIds.length === 0) {
      return centerPane;
    }

    const resolvedPlacement = resolveAuthoringSidebarPlacement(
      sidebarPlacement,
      availablePanelIds,
      DEFAULT_AUTHORING_SIDEBAR_PLACEMENT,
    );

    return (
      <AuthoringSidebarLayout
        center={centerPane}
        panels={panels}
        placement={resolvedPlacement}
        showMoveControls={showSidebarMoveControls}
        onPlacementChange={onSidebarPlacementChange}
      />
    );
  })();

  return (
    <Panel className="ui-json-widget-editor" data-theme={theme} data-mode={resolvedMode}>
      <PanelHeader
        className="ui-json-widget-editor__header"
        actions={
          <Toolbar className="ui-json-widget-editor__toolbar">
            <div className="ui-json-widget-editor__toolbar-group">
              <ButtonGroup ariaLabel="History">
                <Button
                  compact
                  data-testid="undo-widget"
                  disabled={!sync.canUndo || readOnly}
                  title="Undo (Ctrl+Z)"
                  onClick={handleUndo}
                >
                  Undo
                </Button>
                <Button
                  compact
                  data-testid="redo-widget"
                  disabled={!sync.canRedo || readOnly}
                  title="Redo (Ctrl+Y)"
                  onClick={handleRedo}
                >
                  Redo
                </Button>
              </ButtonGroup>
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
            </div>
            {resolvedHeaderActions ? (
              <div className="ui-json-widget-editor__toolbar-group ui-json-widget-editor__toolbar-group--authoring">
                {resolvedHeaderActions}
              </div>
            ) : null}
            <span className="ui-json-widget-editor__toolbar-spacer" aria-hidden />
            <WorkbenchArtifactModeControls
              mode={resolvedMode}
              previewLabel={previewModeLabel}
              onModeChange={setMode}
            />
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
