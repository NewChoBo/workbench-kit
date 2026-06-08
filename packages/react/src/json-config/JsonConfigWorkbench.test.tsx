import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatWidgetJson } from '@workbench-kit/json-widget';

import { JsonConfigWorkbench, resolveJsonConfigPreviewKind } from './JsonConfigWorkbench.js';
import { type WorkbenchStructuredDataSchemaDocument } from '../workbench/settings/StructuredDataForm';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
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
  it('prefers schema preview when schema is provided in auto mode', () => {
    expect(resolveJsonConfigPreviewKind('auto', settingsSchema, settingsJson)).toBe('schema');
  });

  it('detects widget preview in auto mode when JSON has a type field', () => {
    const json = formatWidgetJson({ type: 'demo:card', title: 'Tile' });
    expect(resolveJsonConfigPreviewKind('auto', null, json)).toBe('widget');
  });

  it('returns none when preview is disabled', () => {
    expect(resolveJsonConfigPreviewKind('none', settingsSchema, settingsJson)).toBe('none');
  });
});

describe('JsonConfigWorkbench', () => {
  it('renders split mode with schema form preview', () => {
    const markup = renderToStaticMarkup(
      <JsonConfigWorkbench
        defaultMode="split"
        previewKind="schema"
        schema={settingsSchema}
        value={settingsJson}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('ui-json-config-workbench');
    expect(markup).toContain('data-mode="split"');
    expect(markup).toContain('General');
    expect(markup).toContain('value="Content Hub"');
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
        value={formatWidgetJson({ type: 'demo:card', title: 'Tile preview' })}
        widgetRegistry={registry}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Tile preview');
    expect(markup).toContain('data-testid="json-widget-preview-output"');
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
