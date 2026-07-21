import { useMemo } from 'react';
import type { WidgetJsonSchema } from '@workbench-kit/contracts';
import {
  findPathForLineAndColumn,
  findSourceRangeForPath,
  getWidgetAtPath,
  type GenericWidget,
  type WidgetPath,
} from '@workbench-kit/jdw';

import {
  JsonCodeEditorPane,
  type JsonEditorRange,
  type JsonEditorPosition,
  type JsonEditorProblem,
} from '../jdw/JsonCodeEditorPane.js';
import { JDW_WIDGET_DOCUMENT_MIME } from '../jdw/document.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceFile } from '../workbench/workspace/types.js';

export interface WidgetSourceEditorProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly parseError?: string | null | undefined;
  readonly problems?: readonly JsonEditorProblem[] | undefined;
  readonly jsonSchema?: WidgetJsonSchema | null | undefined;
  readonly readOnly?: boolean | undefined;
  readonly root?: GenericWidget | null | undefined;
  readonly selectedPath?: WidgetPath | null | undefined;
  readonly showProblemsPanel?: boolean | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
  readonly onSelectPath?: ((path: WidgetPath) => void) | undefined;
}

export function resolveWidgetSourceRevealPosition(
  source: string,
  path: WidgetPath | null | undefined,
): JsonEditorPosition | null {
  const position = resolveWidgetSourceActiveRange(source, path);
  if (!position) return null;

  return {
    column: position.startColumn,
    lineNumber: position.startLineNumber,
  };
}

export function resolveWidgetSourceActiveRange(
  source: string,
  path: WidgetPath | null | undefined,
): JsonEditorRange | null {
  if (!path) return null;
  return findSourceRangeForPath(source, path);
}

export function resolveWidgetPathForEditorPosition(
  source: string,
  root: GenericWidget | null | undefined,
  lineNumber: number,
  column: number,
): WidgetPath | null {
  if (!root) return null;

  const pathAtCursor = findPathForLineAndColumn(source, lineNumber, column);
  if (!pathAtCursor || !getWidgetAtPath(root, pathAtCursor)) return null;

  return pathAtCursor;
}

export function WidgetSourceEditor({
  path = 'widget.json',
  value,
  onChange,
  onSave,
  parseError = null,
  problems = [],
  jsonSchema = null,
  readOnly = false,
  selectedPath = null,
  showProblemsPanel = false,
  theme = 'dark',
  root = null,
  onSelectPath,
}: WidgetSourceEditorProps) {
  const file = useMemo<WorkspaceFile>(
    () => ({
      content: value,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path,
    }),
    [path, value],
  );
  const activeSourceRange = useMemo(
    () => resolveWidgetSourceActiveRange(value, selectedPath),
    [selectedPath, value],
  );
  const revealPosition = useMemo(
    () =>
      activeSourceRange
        ? {
            column: activeSourceRange.startColumn,
            lineNumber: activeSourceRange.startLineNumber,
          }
        : null,
    [activeSourceRange?.startColumn, activeSourceRange?.startLineNumber],
  );

  const handleCursorPositionChange = ({
    lineNumber,
    column,
  }: {
    lineNumber: number;
    column: number;
  }) => {
    if (!onSelectPath) return;

    const pathAtCursor = resolveWidgetPathForEditorPosition(value, root, lineNumber, column);
    if (!pathAtCursor) return;
    onSelectPath(pathAtCursor);
  };

  return (
    <div className="widget-tree-source" data-testid="widget-tree-source">
      <JsonCodeEditorPane
        activeSourceRange={activeSourceRange}
        documentParseError={parseError}
        file={file}
        jsonSchema={jsonSchema}
        problems={problems}
        readOnly={readOnly}
        revealPosition={revealPosition}
        showProblemsPanel={showProblemsPanel}
        theme={theme}
        value={value}
        onChange={onChange}
        onCursorPositionChange={handleCursorPositionChange}
        onSave={onSave}
      />
    </div>
  );
}
