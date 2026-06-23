import { useMemo, useState, type ReactNode } from 'react';
import type { WidgetAssetCatalogContract, WidgetRegistryContract } from '@workbench-kit/contracts';
import { validateJsonWidgetData } from '@workbench-kit/jdw';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { Button } from '../primitives/Button';
import { Toolbar } from '../primitives/Toolbar';
import { JsonConfigValidationBanner } from '../jdw/JsonCodeEditorPane.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import { fileNameOfPath } from '../workbench/workspace/path';
import { WorkspacePathLabel } from '../workbench/workspace/WorkspacePathLabel';
import { WidgetTreeLab } from './WidgetTreeLab.js';
import { WidgetTreeModeControls } from './WidgetTreeModeControls.js';
import { DEFAULT_WIDGET_TREE_VIEW_MODE, type WidgetTreeViewMode } from './widget-tree-mode.js';

export interface WidgetTreeWorkbenchProps {
  readonly path?: string | undefined;
  readonly title?: ReactNode | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly baselineValue?: string | undefined;
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
  const validation = useMemo(
    () =>
      validateJsonWidgetData(value, {
        registeredTypes,
        strictKnownTypes: true,
      }),
    [registeredTypes, value],
  );
  const firstValidationError = validation.issues[0]
    ? `${validation.issues[0].path}: ${validation.issues[0].message}`
    : undefined;
  const resolvedDirty = dirty ?? (baselineValue !== undefined && value !== baselineValue);
  const saveEnabled = Boolean(onSave && resolvedDirty && validation.valid && !readOnly);
  const resolvedOnSave = saveEnabled ? onSave : undefined;

  return (
    <Panel
      className="widget-tree-workbench"
      data-mode={resolvedViewMode}
      data-testid="widget-tree-workbench"
    >
      <PanelHeader
        actions={
          <Toolbar>
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
        {!validation.valid || (resolvedDirty && validation.valid) ? (
          <JsonConfigValidationBanner
            canApply={Boolean(resolvedDirty && validation.valid)}
            firstError={firstValidationError}
            validationOk={validation.valid}
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
