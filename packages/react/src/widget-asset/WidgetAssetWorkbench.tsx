import { useState, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel';
import { Button } from '../primitives/Button';
import { Toolbar } from '../primitives/Toolbar';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import { fileNameOfPath } from '../workbench/workspace/path';
import { WidgetAssetEditor } from './WidgetAssetEditor.js';
import { WidgetAssetModeControls } from './WidgetAssetModeControls.js';
import {
  DEFAULT_WIDGET_ASSET_VIEW_MODE,
  type WidgetAssetViewMode,
} from './widget-asset-mode.js';

export interface WidgetAssetWorkbenchProps {
  readonly path?: string | undefined;
  readonly title?: ReactNode | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly onDiscard?: (() => void) | undefined;
  readonly dirty?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
  readonly defaultViewMode?: WidgetAssetViewMode | undefined;
  readonly viewMode?: WidgetAssetViewMode | undefined;
  readonly onViewModeChange?: ((mode: WidgetAssetViewMode) => void) | undefined;
}

export function WidgetAssetWorkbench({
  path,
  title,
  value,
  onChange,
  onSave,
  onDiscard,
  dirty = false,
  readOnly = false,
  registry,
  theme = 'dark',
  defaultViewMode = DEFAULT_WIDGET_ASSET_VIEW_MODE,
  viewMode,
  onViewModeChange,
}: WidgetAssetWorkbenchProps) {
  const [uncontrolledViewMode, setUncontrolledViewMode] =
    useState<WidgetAssetViewMode>(defaultViewMode);
  const resolvedViewMode = viewMode ?? uncontrolledViewMode;

  const setViewMode = (nextMode: WidgetAssetViewMode) => {
    if (viewMode === undefined) {
      setUncontrolledViewMode(nextMode);
    }
    onViewModeChange?.(nextMode);
  };

  const resolvedTitle = title ?? (path ? fileNameOfPath(path) : 'Widget asset');

  return (
    <Panel
      className="widget-asset-workbench"
      data-mode={resolvedViewMode}
      data-testid="widget-asset-workbench"
    >
      <PanelHeader
        actions={
          <Toolbar>
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
            <WidgetAssetModeControls mode={resolvedViewMode} onModeChange={setViewMode} />
          </Toolbar>
        }
      >
        <span className="widget-asset-workbench__title">
          {resolvedTitle}
          {path ? (
            <span className="widget-asset-workbench__path" title={path}>
              {path}
            </span>
          ) : null}
          {dirty ? (
            <span className="widget-asset-workbench__dirty-indicator" title="Unsaved changes">
              ●
            </span>
          ) : null}
        </span>
      </PanelHeader>
      <PanelBody className="widget-asset-workbench__body">
        <WidgetAssetEditor
          path={path}
          readOnly={readOnly}
          registry={registry}
          theme={theme}
          value={value}
          viewMode={resolvedViewMode}
          onChange={onChange}
          onSave={onSave}
        />
      </PanelBody>
    </Panel>
  );
}
