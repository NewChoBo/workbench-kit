import { useMemo } from 'react';

import { JsonCodeEditorPane } from '../jdw/JsonCodeEditorPane.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceFile } from '../workbench/workspace/types.js';
import { resolveWidgetAssetMimeType } from './widget-asset-document.js';

export interface WidgetAssetSourceEditorProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly parseError?: string | null | undefined;
  readonly readOnly?: boolean | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
}

export function WidgetAssetSourceEditor({
  path = 'assets/new-asset/manifest.json',
  value,
  onChange,
  onSave,
  parseError = null,
  readOnly = false,
  theme = 'dark',
}: WidgetAssetSourceEditorProps) {
  const file = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: resolveWidgetAssetMimeType(path),
      path,
    }),
    [path, value],
  );

  return (
    <div className="widget-asset-source" data-testid="widget-asset-source">
      <JsonCodeEditorPane
        documentParseError={parseError}
        file={file}
        readOnly={readOnly}
        showProblemsPanel={false}
        theme={theme}
        value={value}
        onChange={onChange}
        onSave={onSave}
      />
    </div>
  );
}
