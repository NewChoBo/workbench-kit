import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WidgetJsonSchema } from '@workbench-kit/contracts';
import type { IDisposable, OnMount, WorkbenchMonaco, editor } from '@workbench-kit/monaco';

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

export interface JsonEditorProblem {
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

function pluralizeProblemLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

export function summarizeJsonEditorProblems(problems: readonly JsonEditorProblem[]): {
  readonly icon: string;
  readonly label: string;
  readonly status: 'completed' | 'failed' | 'warning';
} {
  const errorCount = problems.filter(
    (problem) => toWorkbenchProblemSeverity(problem.severity) === 'error',
  ).length;
  const warningCount = problems.filter(
    (problem) => toWorkbenchProblemSeverity(problem.severity) === 'warning',
  ).length;

  if (errorCount > 0) {
    return {
      icon: 'error',
      label:
        warningCount > 0
          ? `${pluralizeProblemLabel(errorCount, 'Error')}, ${pluralizeProblemLabel(
              warningCount,
              'Warning',
            )}`
          : pluralizeProblemLabel(errorCount, 'Error'),
      status: 'failed',
    };
  }

  if (warningCount > 0) {
    return {
      icon: 'warning',
      label: pluralizeProblemLabel(warningCount, 'Warning'),
      status: 'warning',
    };
  }

  if (problems.length > 0) {
    return {
      icon: 'info',
      label: pluralizeProblemLabel(problems.length, 'Info'),
      status: 'completed',
    };
  }

  return {
    icon: 'check',
    label: 'No Problems',
    status: 'completed',
  };
}

export interface JsonCodeEditorPaneProps {
  activeSourceRange?: JsonEditorRange | null | undefined;
  documentParseError?: string | null | undefined;
  file: WorkspaceFile;
  jsonSchema?: WidgetJsonSchema | null | undefined;
  revealPosition?: JsonEditorPosition | null | undefined;
  onCursorPositionChange?: ((position: JsonEditorPosition) => void) | undefined;
  onChange: (value: string) => void;
  onEditorMount?: OnMount | undefined;
  problems?: readonly JsonEditorProblem[] | undefined;
  onSave?: (() => void) | undefined;
  readOnly?: boolean | undefined;
  showProblemsPanel?: boolean | undefined;
  theme?: WorkspaceEditorTheme | undefined;
  value: string;
}

export interface JsonEditorPosition {
  readonly column: number;
  readonly lineNumber: number;
}

export interface JsonEditorRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

const MONACO_DECORATION_STICKINESS_NEVER_GROWS = 1;

export function createJsonEditorActiveSourceRangeDecorations(
  activeSourceRange: JsonEditorRange | null | undefined,
): editor.IModelDeltaDecoration[] {
  if (!activeSourceRange) return [];

  return [
    {
      range: activeSourceRange,
      options: {
        className: 'ui-json-code-editor-pane__active-source-range',
        stickiness: MONACO_DECORATION_STICKINESS_NEVER_GROWS,
      },
    },
  ];
}

export function JsonCodeEditorPane({
  activeSourceRange = null,
  documentParseError = null,
  file,
  jsonSchema = null,
  revealPosition = null,
  onCursorPositionChange,
  onChange,
  onEditorMount,
  problems: externalProblems = [],
  onSave,
  readOnly = false,
  showProblemsPanel = true,
  theme = 'dark',
  value,
}: JsonCodeEditorPaneProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const activeSourceRangeDecorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const markerListenerRef = useRef<IDisposable | null>(null);
  const cursorListenerRef = useRef<IDisposable | null>(null);
  const cursorChangeRef = useRef<typeof onCursorPositionChange>(onCursorPositionChange);
  const [monacoProblems, setMonacoProblems] = useState<JsonEditorProblem[]>([]);
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    cursorChangeRef.current = onCursorPositionChange;
  }, [onCursorPositionChange]);

  const problems = useMemo(() => {
    if (!documentParseError) return [...externalProblems, ...monacoProblems];
    return [
      {
        endColumn: 1,
        endLineNumber: 1,
        message: documentParseError,
        severity: 8,
        startColumn: 1,
        startLineNumber: 1,
      },
      ...externalProblems,
      ...monacoProblems,
    ];
  }, [documentParseError, externalProblems, monacoProblems]);
  const problemSummary = useMemo(() => summarizeJsonEditorProblems(problems), [problems]);

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
      cursorListenerRef.current?.dispose();
      cursorListenerRef.current = null;
      activeSourceRangeDecorationsRef.current?.clear();
      activeSourceRangeDecorationsRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!revealPosition) return;

    const editor = editorRef.current;
    if (!editor) return;

    editor.setPosition(revealPosition);
    editor.revealPositionInCenter(revealPosition);
  }, [revealPosition?.column, revealPosition?.lineNumber]);

  const syncActiveSourceRangeDecorations = (monacoEditor: editor.IStandaloneCodeEditor) => {
    const decorations = createJsonEditorActiveSourceRangeDecorations(activeSourceRange);
    if (decorations.length === 0) {
      activeSourceRangeDecorationsRef.current?.clear();
      return;
    }

    if (!activeSourceRangeDecorationsRef.current) {
      activeSourceRangeDecorationsRef.current =
        monacoEditor.createDecorationsCollection(decorations);
      return;
    }

    activeSourceRangeDecorationsRef.current.set(decorations);
  };

  useEffect(() => {
    const monacoEditor = editorRef.current;
    if (!monacoEditor) return;

    syncActiveSourceRangeDecorations(monacoEditor);
  }, [
    activeSourceRange?.endColumn,
    activeSourceRange?.endLineNumber,
    activeSourceRange?.startColumn,
    activeSourceRange?.startLineNumber,
  ]);

  const configureJsonSchema = (monaco: WorkbenchMonaco, path: string) => {
    if (!jsonSchema) return;

    const jsonDefaults = (
      monaco.languages.json as unknown as {
        jsonDefaults?: { setDiagnosticsOptions: (options: unknown) => void };
      }
    ).jsonDefaults;
    if (!jsonDefaults) return;

    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: false,
      schemas: [
        {
          uri: 'https://workbench-kit.dev/schemas/widget-document.v1.jdw.schema.json',
          fileMatch: [path],
          schema: jsonSchema,
        },
      ],
    });
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    syncActiveSourceRangeDecorations(editor);
    configureJsonSchema(monaco, file.path);
    onEditorMount?.(editor, monaco);

    cursorListenerRef.current?.dispose();
    cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
      cursorChangeRef.current?.({
        column: event.position.column,
        lineNumber: event.position.lineNumber,
      });
    });

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
        markers.map((marker: editor.IMarker) => ({
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
              icon={problemSummary.icon}
              status={problemSummary.status}
              title="Toggle problems"
              onClick={() => setShowProblems((current) => !current)}
            >
              {problemSummary.label}
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
      : 'JSON valid';

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
