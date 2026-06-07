import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';

import type { WidgetTypeShape } from '@workbench-kit/contracts';

import {
  createWidgetRegistry,
  formatWidgetJson,
  parseWidgetJson,
  type WidgetDefinition,
} from './index.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
  body?: string;
}

const SAMPLE_WIDGET: DemoWidget = {
  type: 'demo:card',
  title: 'Hello from JSON widget',
  body: 'Edit the JSON on the left to see parse and render output update.',
};

const INVALID_SAMPLES = [
  { label: 'Syntax error', value: '{' },
  { label: 'Empty input', value: '   ' },
  { label: 'Non-object root', value: '[]' },
] as const;

function mockBuildCard(widget: DemoWidget): string {
  const body = widget.body?.trim();
  return body ? `${widget.title} — ${body}` : widget.title;
}

const demoRegistry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
  {
    type: 'demo:card',
    build: mockBuildCard,
    displayName: 'Demo Card',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['title'],
    },
  } satisfies WidgetDefinition<DemoWidget, (widget: DemoWidget) => string>,
]);

const panelStyle = {
  display: 'grid',
  gap: 12,
  padding: 16,
  borderRadius: 8,
  border: '1px solid var(--color-border, #2a2a2a)',
  background: 'var(--color-bg, #111)',
  color: 'var(--color-text, #f5f5f5)',
} as const;

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  opacity: 0.72,
};

function JsonWidgetPlayground({
  initialJson,
  showInvalidSamples = false,
}: {
  initialJson: string;
  showInvalidSamples?: boolean;
}) {
  const [rawJson, setRawJson] = useState(initialJson);
  const parsed = useMemo(() => parseWidgetJson<DemoWidget>(rawJson), [rawJson]);

  const renderOutput = useMemo(() => {
    if (parsed.parseError || parsed.value === null) {
      return null;
    }
    if (parsed.value.type !== 'demo:card') {
      return `Unknown widget type "${parsed.value.type}". Register it in WidgetRegistry to render.`;
    }
    const build = demoRegistry.get('demo:card');
    return build?.(parsed.value) ?? 'No build handler registered for demo:card.';
  }, [parsed]);

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        minWidth: 720,
        maxWidth: 960,
        padding: 24,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <header style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>JSON Widget Playground</h2>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Parse and format widget documents, then render through a mock registry build handler.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={panelStyle}>
          <div style={labelStyle}>Input JSON</div>
          <textarea
            aria-label="Widget JSON"
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            spellCheck={false}
            style={{
              minHeight: 220,
              width: '100%',
              resize: 'vertical',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 13,
              lineHeight: 1.5,
              padding: 12,
              borderRadius: 6,
              border: '1px solid var(--color-border, #333)',
              background: 'var(--color-surface, #1a1a1a)',
              color: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (parsed.value) {
                  setRawJson(formatWidgetJson(parsed.value));
                }
              }}
              disabled={parsed.value === null}
            >
              Format JSON
            </button>
            <button type="button" onClick={() => setRawJson(formatWidgetJson(SAMPLE_WIDGET))}>
              Reset sample
            </button>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={labelStyle}>Parse result</div>
          {parsed.parseError ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 6,
                background: 'rgba(220, 38, 38, 0.12)',
                color: '#fecaca',
              }}
            >
              {parsed.parseError}
            </p>
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 6,
                background: 'var(--color-surface, #1a1a1a)',
                overflow: 'auto',
                fontSize: 13,
              }}
            >
              {JSON.stringify(parsed.value, null, 2)}
            </pre>
          )}

          <div style={labelStyle}>Mock render output</div>
          <output
            style={{
              display: 'block',
              minHeight: 48,
              padding: 12,
              borderRadius: 6,
              background: 'var(--color-surface, #1a1a1a)',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            }}
          >
            {renderOutput ?? 'Fix JSON errors to render.'}
          </output>
        </section>
      </div>

      {showInvalidSamples ? (
        <section style={panelStyle}>
          <div style={labelStyle}>Invalid JSON samples</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INVALID_SAMPLES.map((sample) => (
              <button key={sample.label} type="button" onClick={() => setRawJson(sample.value)}>
                {sample.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const meta = {
  title: 'JsonWidget/Playground',
  component: JsonWidgetPlayground,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof JsonWidgetPlayground>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ParseAndRender: Story = {
  args: {
    initialJson: formatWidgetJson(SAMPLE_WIDGET),
  },
};

export const InvalidJsonHandling: Story = {
  args: {
    initialJson: '{',
    showInvalidSamples: true,
  },
};
