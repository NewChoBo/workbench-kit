import { useMemo } from 'react';
import type { WidgetJsonSchema } from '@workbench-kit/contracts';

import { JsonCodeEditorPane } from '../jdw/JsonCodeEditorPane.js';
import { JDW_WIDGET_DOCUMENT_MIME } from '../jdw/document.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceFile } from '../workbench/workspace/types.js';

export interface WidgetSourceEditorProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly parseError?: string | null | undefined;
  readonly jsonSchema?: WidgetJsonSchema | null | undefined;
  readonly readOnly?: boolean | undefined;
  readonly showProblemsPanel?: boolean | undefined;
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
  showProblemsPanel = false,
  theme = 'dark',
}: WidgetSourceEditorProps) {
  const file = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
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
        showProblemsPanel={showProblemsPanel}
        theme={theme}
        value={value}
        onChange={onChange}
        onSave={onSave}
      />
    </div>
  );
}
