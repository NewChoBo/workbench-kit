import { useMemo } from 'react';
import type { WidgetJsonSchema } from '@workbench-kit/contracts';

import { JsonCodeEditorPane } from '../jdw/JsonCodeEditorPane.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceFile } from '../workbench/workspace/types.js';
import { WIDGET_TREE_DOCUMENT_MIME } from './widget-tree-document.js';

export interface WidgetSourceEditorProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly parseError?: string | null | undefined;
  readonly jsonSchema?: WidgetJsonSchema | null | undefined;
  readonly readOnly?: boolean | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
}

export function WidgetSourceEditor({
  path = 'widget.json',
  value,
  onChange,
  onSave,
  parseError = null,
  jsonSchema = null,
  readOnly = false,
  theme = 'dark',
}: WidgetSourceEditorProps) {
  const file = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: WIDGET_TREE_DOCUMENT_MIME,
      path,
    }),
    [path, value],
  );

  return (
    <div className="widget-tree-source" data-testid="widget-tree-source">
      <JsonCodeEditorPane
        documentParseError={parseError}
        file={file}
        jsonSchema={jsonSchema}
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
