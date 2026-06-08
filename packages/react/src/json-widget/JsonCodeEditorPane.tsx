import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

import { IconButton } from '../primitives/IconButton';
import { ListEmptyState } from '../primitives/List';
import {
  WorkbenchEditorBody,
  WorkbenchEditorBottomPanel,
  WorkbenchEditorBottomPanelBody,
  WorkbenchEditorBottomPanelHeader,
  WorkbenchEditorBottomPanelTitle,
  WorkbenchEditorFrame,
  WorkbenchEditorViewport,
  WorkbenchProblemItem,
  WorkbenchProblemList,
  type WorkbenchProblemSeverity,
} from '../layout/WorkbenchLayoutBase';
import {
  StatusBar as WorkbenchStatusBar,
  StatusBarItem as WorkbenchStatusBarItem,
  StatusBarSection as WorkbenchStatusBarSection,
} from '../workbench/StatusBar';
import { WorkspaceEditor, type WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor';
import type { WorkspaceFile } from '../workbench/workspace/types';

interface JsonEditorProblem {
  endColumn: number;
  endLineNumber: number;
  message: string;
  severity: number;
  startColumn: number;
  startLineNumber: number;
}

function toWorkbenchProblemSeverity(severity: number): WorkbenchProblemSeverity {
  if (severity === 8) return 'error';
  if (severity === 4) return 'warning';
  return 'info';
}

export interface JsonCodeEditorPaneProps {
  documentParseError?: string | null | undefined;
  file: WorkspaceFile;
  onChange: (value: string) => void;
  onEditorMount?: OnMount | undefined;
  onSave?: (() => void) | undefined;
  readOnly?: boolean | undefined;
  showProblemsPanel?: boolean | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  value: string;
}

export function JsonCodeEditorPane({
  documentParseError = null,
  file,
  onChange,
  onEditorMount,
  onSave,
  readOnly = false,
  showProblemsPanel = true,
  theme = 'dark',
  value,
}: JsonCodeEditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const markerListenerRef = useRef<Monaco.IDisposable | null>(null);
  const [monacoProblems, setMonacoProblems] = useState<JsonEditorProblem[]>([]);
  const [showProblems, setShowProblems] = useState(false);

  const problems = useMemo(() => {
    if (!documentParseError) return monacoProblems;
    return [
      {
        endColumn: 1,
        endLineNumber: 1,
        message: documentParseError,
        severity: 8,
        startColumn: 1,
        startLineNumber: 1,
      },
      ...monacoProblems,
    ];
  }, [documentParseError, monacoProblems]);

  const previousProblemCountRef = useRef(0);
  useEffect(() => {
    if (problems.length > previousProblemCountRef.current) {
      setShowProblems(true);
    }
    previousProblemCountRef.current = problems.length;
  }, [problems.length]);

  useEffect(
    () => () => {
      markerListenerRef.current?.dispose();
      markerListenerRef.current = null;
    },
    [],
  );

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    onEditorMount?.(editor, monaco);

    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });
    }

    if (!showProblemsPanel) return;

    markerListenerRef.current?.dispose();
    markerListenerRef.current = null;

    const model = editor.getModel();
    if (!model) return;

    const updateProblems = () => {
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      setMonacoProblems(
        markers.map((marker: Monaco.editor.IMarker) => ({
          message: marker.message,
          severity: marker.severity,
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
        })),
      );
    };

    updateProblems();
    markerListenerRef.current = monaco.editor.onDidChangeMarkers(updateProblems);
  };

  const jumpToProblem = (problem: JsonEditorProblem) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setPosition({ lineNumber: problem.startLineNumber, column: problem.startColumn });
    editor.revealPositionInCenter({
      lineNumber: problem.startLineNumber,
      column: problem.startColumn,
    });
    editor.focus();
  };

  return (
    <WorkbenchEditorFrame className="ui-json-code-editor-pane">
      <WorkbenchEditorBody>
        <WorkbenchEditorViewport className="ui-json-code-editor-pane__viewport">
          <WorkspaceEditor
            compact
            file={file}
            readOnly={readOnly}
            showHeader={false}
            theme={theme}
            value={value}
            onChange={onChange}
            onEditorMount={handleMount}
          />
        </WorkbenchEditorViewport>
      </WorkbenchEditorBody>

      {showProblemsPanel && showProblems ? (
        <WorkbenchEditorBottomPanel aria-label="Problems" height={120}>
          <WorkbenchEditorBottomPanelHeader>
            <WorkbenchEditorBottomPanelTitle>Problems</WorkbenchEditorBottomPanelTitle>
            <IconButton
              compact
              icon="codicon-close"
              label="Close problems"
              onClick={() => setShowProblems(false)}
            />
          </WorkbenchEditorBottomPanelHeader>
          <WorkbenchEditorBottomPanelBody>
            <WorkbenchProblemList aria-label="JSON problems" role="list">
              {problems.length === 0 ? (
                <ListEmptyState>No problems have been detected.</ListEmptyState>
              ) : (
                problems.map((problem, index) => (
                  <WorkbenchProblemItem
                    key={`${problem.startLineNumber}:${problem.startColumn}:${index}`}
                    location={`Line ${problem.startLineNumber}, Col ${problem.startColumn}:`}
                    message={problem.message}
                    severity={toWorkbenchProblemSeverity(problem.severity)}
                    onClick={() => jumpToProblem(problem)}
                  />
                ))
              )}
            </WorkbenchProblemList>
          </WorkbenchEditorBottomPanelBody>
        </WorkbenchEditorBottomPanel>
      ) : null}

      {showProblemsPanel ? (
        <WorkbenchStatusBar compact>
          <WorkbenchStatusBarSection>
            <WorkbenchStatusBarItem
              active={showProblems}
              icon={problems.length > 0 ? 'error' : 'check'}
              status={problems.length > 0 ? 'failed' : 'completed'}
              title="Toggle problems"
              onClick={() => setShowProblems((current) => !current)}
            >
              {problems.length > 0 ? `${problems.length} Problems` : 'No Problems'}
            </WorkbenchStatusBarItem>
          </WorkbenchStatusBarSection>
        </WorkbenchStatusBar>
      ) : null}
    </WorkbenchEditorFrame>
  );
}

export interface JsonConfigValidationBannerProps {
  canApply: boolean;
  firstError?: ReactNode | undefined;
  validationOk: boolean;
}

export function JsonConfigValidationBanner({
  canApply,
  firstError,
  validationOk,
}: JsonConfigValidationBannerProps) {
  const tone = !validationOk ? 'warning' : canApply ? 'default' : 'default';
  const icon = !validationOk ? 'codicon-error' : canApply ? 'codicon-check' : 'codicon-info';
  const message = !validationOk
    ? (firstError ?? 'Invalid JSON')
    : canApply
      ? 'Valid — unsaved changes'
      : 'No changes';

  return (
    <div
      className="ui-json-config-validation-banner"
      data-can-apply={canApply ? 'true' : 'false'}
      data-testid="json-config-validation-banner"
      data-validation={validationOk ? 'valid' : 'invalid'}
      data-tone={tone}
      role="status"
    >
      <i className={`codicon ${icon}`} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
