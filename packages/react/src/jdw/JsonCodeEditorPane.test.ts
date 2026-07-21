import { describe, expect, it, vi } from 'vitest';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

import {
  createJsonEditorActiveSourceRangeDecorations,
  summarizeJsonEditorProblems,
  type JsonEditorProblem,
} from './JsonCodeEditorPane.js';

function problem(severity: number): JsonEditorProblem {
  return {
    endColumn: 1,
    endLineNumber: 1,
    message: 'Problem',
    severity,
    startColumn: 1,
    startLineNumber: 1,
  };
}

describe('summarizeJsonEditorProblems', () => {
  it('summarizes warning-only problems without marking the status as failed', () => {
    expect(summarizeJsonEditorProblems([problem(4)])).toEqual({
      icon: 'warning',
      label: '1 Warning',
      status: 'warning',
    });
  });

  it('keeps errors dominant when errors and warnings are mixed', () => {
    expect(summarizeJsonEditorProblems([problem(8), problem(4), problem(4)])).toEqual({
      icon: 'error',
      label: '1 Error, 2 Warnings',
      status: 'failed',
    });
  });

  it('reports a clean state when no problems exist', () => {
    expect(summarizeJsonEditorProblems([])).toEqual({
      icon: 'check',
      label: 'No Problems',
      status: 'completed',
    });
  });
});

describe('createJsonEditorActiveSourceRangeDecorations', () => {
  it('builds a Monaco decoration for the active JSON source range', () => {
    const range = {
      startLineNumber: 11,
      startColumn: 5,
      endLineNumber: 19,
      endColumn: 6,
    };

    expect(createJsonEditorActiveSourceRangeDecorations(range)).toEqual([
      {
        range,
        options: {
          className: 'ui-json-code-editor-pane__active-source-range',
          stickiness: 1,
        },
      },
    ]);
  });

  it('returns no decorations when no source range is active', () => {
    expect(createJsonEditorActiveSourceRangeDecorations(null)).toEqual([]);
  });
});
