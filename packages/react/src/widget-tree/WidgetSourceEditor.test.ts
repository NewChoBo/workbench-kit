import { describe, expect, it, vi } from 'vitest';
import {
  createWidgetDocument,
  formatWidgetDocumentJson,
  widgetPathKey,
  type GenericWidget,
} from '@workbench-kit/jdw';

import {
  resolveWidgetSourceActiveRange,
  resolveWidgetPathForEditorPosition,
} from './WidgetSourceEditor.js';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

const sourceRoot: GenericWidget = {
  type: 'column',
  children: [
    { type: 'text', text: 'Title' },
    {
      type: 'row',
      children: [{ type: 'text', text: 'Left' }],
    },
  ],
};

describe('WidgetSourceEditor helpers', () => {
  it('resolves a selected widget path to a source editor range', () => {
    const source = formatWidgetDocumentJson(sourceRoot);
    const range = resolveWidgetSourceActiveRange(source, [
      { kind: 'children', index: 1 },
      { kind: 'children', index: 0 },
    ]);

    expect(range).toEqual({
      startLineNumber: 15,
      startColumn: 13,
      endLineNumber: 20,
      endColumn: 14,
    });
  });

  it('resolves editor cursor position back to a valid widget path', () => {
    const source = formatWidgetDocumentJson(sourceRoot);
    const document = createWidgetDocument(source);
    const range = resolveWidgetSourceActiveRange(source, [
      { kind: 'children', index: 1 },
      { kind: 'children', index: 0 },
    ]);

    const path = resolveWidgetPathForEditorPosition(
      source,
      document.root,
      range!.startLineNumber,
      range!.startColumn,
    );

    expect(widgetPathKey(path!)).toBe('$.children[1].children[0]');
  });

  it('ignores cursor paths that do not resolve to a current widget', () => {
    const source = formatWidgetDocumentJson({ type: 'text', text: 'Leaf' });
    const document = createWidgetDocument(source);

    expect(resolveWidgetPathForEditorPosition(source, document.root, 100, 1)).toBeNull();
    expect(resolveWidgetPathForEditorPosition(source, null, 1, 1)).toBeNull();
  });
});
