/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatJsonWidgetData } from '@workbench-kit/jdw';

import { getJdwPreviewInvalidations, JdwPreview } from './JdwPreview.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
}

describe('JdwPreview', () => {
  it('renders mock registry output for valid widget JSON', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
      },
    ]);

    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'demo:card',
          args: { title: 'Preview title' },
        })}
        registry={registry}
      />,
    );

    expect(markup).toContain('Preview title');
    expect(markup).toContain('data-testid="jdw-preview-output"');
  });

  it('surfaces parse errors without attempting registry render', () => {
    const markup = renderToStaticMarkup(<JdwPreview json="{" />);

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).toContain('role="alert"');
  });

  it('surfaces semantic validation errors before rendering', () => {
    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'grid',
          args: { children: [] },
        })}
      />,
    );

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).toContain('columns is required');
    expect(markup).not.toContain('data-testid="jdw-preview-output"');
  });

  it('does not call registry renderers after semantic validation fails', () => {
    const build = vi.fn(() => 'Should not render');
    const registry = createWidgetRegistry([
      {
        type: 'text',
        build,
      },
    ]);

    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'text',
          args: {},
        })}
        registry={registry}
      />,
    );

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).toContain('text is required');
    expect(build).not.toHaveBeenCalled();
  });

  it('validates and renders resolved dynamic values', () => {
    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'text',
          args: {
            text: '${title}',
            fontSize: '${fontSize}',
          },
        })}
        values={{
          title: 'Preview dynamic title',
          fontSize: 18,
        }}
      />,
    );

    expect(markup).toContain('data-testid="jdw-preview-output"');
    expect(markup).toContain('Preview dynamic title');
    expect(markup).toContain('font-size:18px');
  });

  it('renders unresolved exact dynamic scalar expressions without a validation error', () => {
    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'text',
          listen: ['fontSize'],
          args: {
            text: 'Pending dynamic value',
            fontSize: '${fontSize}',
          },
        })}
      />,
    );

    expect(markup).toContain('data-testid="jdw-preview-output"');
    expect(markup).toContain('Pending dynamic value');
    expect(markup).not.toContain('data-testid="jdw-preview-error"');
  });

  it('reports listen invalidations for changed preview value paths', () => {
    const json = formatJsonWidgetData({
      type: 'column',
      listen: ['spacing'],
      args: {
        gap: '${spacing}',
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}' },
          },
        ],
      },
    });

    expect(getJdwPreviewInvalidations(json, ['title'])).toMatchObject([
      {
        nodePath: 'root.args.children[0]',
        type: 'text',
        changedListen: ['title'],
      },
    ]);

    const markup = renderToStaticMarkup(<JdwPreview changedValuePaths={['title']} json={json} />);
    expect(markup).toContain('data-jdw-invalidations="1"');
  });

  it('infers listen invalidations when preview values change', async () => {
    const json = formatJsonWidgetData({
      type: 'column',
      listen: ['spacing'],
      args: {
        gap: '${spacing}',
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}' },
          },
        ],
      },
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <JdwPreview
          json={json}
          values={{
            spacing: 8,
            title: 'Old title',
          }}
        />,
      );
    });

    expect(
      container
        .querySelector('[data-testid="jdw-preview-output"]')
        ?.getAttribute('data-jdw-invalidations'),
    ).toBeNull();

    await act(async () => {
      root.render(
        <JdwPreview
          json={json}
          values={{
            spacing: 8,
            title: 'New title',
          }}
        />,
      );
    });

    expect(
      container
        .querySelector('[data-testid="jdw-preview-output"]')
        ?.getAttribute('data-jdw-invalidations'),
    ).toBe('1');
    expect(container.textContent).toContain('New title');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
