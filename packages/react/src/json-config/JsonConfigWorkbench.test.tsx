import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatJsonWidgetData } from '@workbench-kit/jdw';

import { JsonConfigWorkbench, resolveJsonConfigPreviewKind } from './JsonConfigWorkbench.js';
import { type WorkbenchStructuredDataSchemaDocument } from '../workbench/settings/StructuredDataForm';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value?: string }) => (
    <pre data-testid="monaco-editor">{value ?? 'Mocked Monaco Editor'}</pre>
  ),
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

const settingsSchema: WorkbenchStructuredDataSchemaDocument = {
  activePattern: 'AppSettings',
  schema: {
    properties: {
      'general.appName': { title: 'App name', type: 'string' },
    },
    sections: [
      {
        fields: ['appName'],
        sectionKey: 'general',
        title: 'General',
        type: 'form',
      },
    ],
  },
};

const settingsJson = JSON.stringify({ general: { appName: 'Content Hub' } }, null, 2);

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
}

describe('resolveJsonConfigPreviewKind', () => {
  it('keeps schema documents out of the preview resolver after form separation', () => {
    expect(resolveJsonConfigPreviewKind('auto', settingsSchema, settingsJson)).toBe('none');
  });

  it('detects widget preview in auto mode when JSON is valid JDW', () => {
    const json = formatJsonWidgetData({
      type: 'demo:card',
      args: { title: 'Tile' },
    });
    expect(resolveJsonConfigPreviewKind('auto', null, json)).toBe('widget');
  });

  it('returns none when preview is disabled', () => {
    expect(resolveJsonConfigPreviewKind('none', settingsSchema, settingsJson)).toBe('none');
  });
});

describe('JsonConfigWorkbench', () => {
  it('renders form mode with schema-driven controls and a separate preview pane', () => {
    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        defaultMode="form"
        previewKind="schema"
        schema={settingsSchema}
        value={settingsJson}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('ui-json-config-workbench');
    expect(markup).toContain('data-mode="form"');
    expect(markup).toContain('General');
    expect(markup).toContain('value="Content Hub"');
    expect(markup).toContain('No preview available for this document.');
  });

  it('renders JSON source in code mode without showing an unchanged banner', () => {
    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        baselineValue={settingsJson}
        defaultMode="code"
        previewKind="schema"
        schema={settingsSchema}
        value={settingsJson}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-mode="code"');
    expect(markup).toContain('data-testid="monaco-editor"');
    expect(markup).toContain('&quot;appName&quot;');
    expect(markup).not.toContain('No changes');
    expect(markup).not.toContain('JSON valid');
  });

  it('renders widget preview when previewKind is widget', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
      },
    ]);

    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        defaultMode="preview"
        previewKind="widget"
        value={formatJsonWidgetData({
          type: 'demo:card',
          args: { title: 'Tile preview' },
        })}
        widgetRegistry={registry}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Tile preview');
    expect(markup).toContain('data-testid="jdw-preview-output"');
  });

  it('keeps preview mode focused on read-only output', () => {
    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        defaultMode="preview"
        previewKind="schema"
        schema={settingsSchema}
        value={settingsJson}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-mode="preview"');
    expect(markup).toContain('No preview available for this document.');
    expect(markup).not.toContain('value="Content Hub"');
  });

  it('shows dirty indicator when value differs from baseline', () => {
    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        baselineValue={settingsJson}
        defaultMode="preview"
        previewKind="schema"
        schema={settingsSchema}
        value={JSON.stringify({ general: { appName: 'Changed' } }, null, 2)}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('title="Unsaved changes"');
  });
});
