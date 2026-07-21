import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { WidgetAssetCatalogContract, WidgetRegistryContract } from '@workbench-kit/contracts';

import { Panel, PanelBody, PanelHeader } from '../layout/panel';
import { Button } from '../primitives/button';
import { Toolbar } from '../primitives/toolbar';
import { JsonConfigValidationBanner } from '../jdw/JsonCodeEditorPane.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import { fileNameOfPath } from '../workbench/workspace/path';
import { WorkspacePathLabel } from '../workbench/workspace/WorkspacePathLabel';
import { WidgetTreeLab } from './WidgetTreeLab.js';
import { resolveWidgetTreeModeShortcut, WidgetTreeModeControls } from './WidgetTreeModeControls.js';
import { DEFAULT_WIDGET_TREE_VIEW_MODE, type WidgetTreeViewMode } from './widget-tree-mode.js';
import { createWidgetTreeEditorState } from './widget-tree-editor-state.js';

export interface WidgetTreeWorkbenchProps {
  readonly path?: string | undefined;
  readonly title?: ReactNode | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly baselineValue?: string | undefined;
  readonly onApply?: (() => void) | undefined;
  readonly onSave?: (() => void) | undefined;
  readonly onDiscard?: (() => void) | undefined;
  readonly dirty?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly assetCatalog?: WidgetAssetCatalogContract | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
  readonly defaultViewMode?: WidgetTreeViewMode | undefined;
  readonly viewMode?: WidgetTreeViewMode | undefined;
  readonly onViewModeChange?: ((mode: WidgetTreeViewMode) => void) | undefined;
}

export function WidgetTreeWorkbench({
  path,
  title,
  value,
  onChange,
  baselineValue,
  onApply,
  onSave,
  onDiscard,
  dirty,
  readOnly = false,
  registry,
  assetCatalog,
  theme = 'dark',
  defaultViewMode = DEFAULT_WIDGET_TREE_VIEW_MODE,
  viewMode,
  onViewModeChange,
}: WidgetTreeWorkbenchProps) {
  const [uncontrolledViewMode, setUncontrolledViewMode] =
    useState<WidgetTreeViewMode>(defaultViewMode);
  const resolvedViewMode = viewMode ?? uncontrolledViewMode;

  const setViewMode = (nextMode: WidgetTreeViewMode) => {
    if (viewMode === undefined) {
      setUncontrolledViewMode(nextMode);
    }
    onViewModeChange?.(nextMode);
  };

  const resolvedTitle = title ?? (path ? fileNameOfPath(path) : 'Widget document');
  const registeredTypes = useMemo(
    () => registry?.definitions().map((definition) => definition.type),
    [registry],
  );
  const editorState = useMemo(
    () =>
      createWidgetTreeEditorState({
        baselineValue: baselineValue ?? value,
        currentValue: value,
        registeredTypes,
      }),
    [baselineValue, registeredTypes, value],
  );
  const resolvedDirty = dirty ?? (baselineValue !== undefined && editorState.textDirty);
  const canApply = Boolean(resolvedDirty && editorState.validationOk);
  const saveEnabled = Boolean(onSave && canApply && !readOnly);
  const resolvedOnSave = saveEnabled ? onSave : undefined;
  const showApply = Boolean(canApply && onApply && !readOnly);

  const handleWorkbenchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextMode = resolveWidgetTreeModeShortcut(event);
    if (nextMode === null) {
      return;
    }

    event.preventDefault();
    setViewMode(nextMode);
  };

  return (
    <Panel
      className="widget-tree-workbench"
      data-mode={resolvedViewMode}
      data-testid="widget-tree-workbench"
      onKeyDown={handleWorkbenchKeyDown}
    >
      <PanelHeader
        actions={
          <Toolbar>
            {showApply ? (
              <Button data-testid="widget-tree-workbench-apply" variant="primary" onClick={onApply}>
                Apply
              </Button>
            ) : null}
            {resolvedDirty && !readOnly ? (
              <>
                {onDiscard ? <Button onClick={onDiscard}>Discard</Button> : null}
                {onSave ? (
                  <Button disabled={!saveEnabled} variant="primary" onClick={resolvedOnSave}>
                    Save
                  </Button>
                ) : null}
              </>
            ) : null}
            <WidgetTreeModeControls mode={resolvedViewMode} onModeChange={setViewMode} />
          </Toolbar>
        }
      >
        <span className="widget-tree-workbench__title">
          {resolvedTitle}
          {path ? <WorkspacePathLabel className="widget-tree-workbench__path" path={path} /> : null}
          {resolvedDirty ? (
            <span className="widget-tree-workbench__dirty-indicator" title="Unsaved changes">
              ●
            </span>
          ) : null}
        </span>
      </PanelHeader>
      <PanelBody className="widget-tree-workbench__body">
        {!editorState.validationOk || canApply ? (
          <JsonConfigValidationBanner
            canApply={canApply}
            firstError={editorState.firstError}
            validationOk={editorState.validationOk}
          />
        ) : null}
        <WidgetTreeLab
          assetCatalog={assetCatalog}
          path={path}
          readOnly={readOnly}
          registry={registry}
          theme={theme}
          value={value}
          viewMode={resolvedViewMode}
          onChange={onChange}
          onSave={resolvedOnSave}
        />
      </PanelBody>
    </Panel>
  );
}
