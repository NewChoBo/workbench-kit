/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_EDITOR_GROUP_ID } from '@workbench-kit/workbench-core';

import { WorkbenchProvider, useWorkbench } from './index.js';
import { useEditorService } from './use-editor.js';

function EditorServiceProbe() {
  const { editorService } = useWorkbench();
  return <span>{editorService.getState().groups[0]?.id ?? 'missing'}</span>;
}

function EditorHookProbe() {
  const editorService = useEditorService();
  return <span>{editorService.getState().activeGroupId ?? 'missing'}</span>;
}

describe('editor service wiring', () => {
  it('exposes editor service from workbench context', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: [],
          recommendations: [],
        }}
      >
        <EditorServiceProbe />
      </WorkbenchProvider>,
    );

    expect(markup).toContain(DEFAULT_EDITOR_GROUP_ID);
  });

  it('exposes editor service through useEditorService', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: [],
          recommendations: [],
        }}
      >
        <EditorHookProbe />
      </WorkbenchProvider>,
    );

    expect(markup).toContain(DEFAULT_EDITOR_GROUP_ID);
  });
});
