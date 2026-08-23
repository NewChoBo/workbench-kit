/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import {
  createWidgetRegistry,
  formatJsonWidgetData,
  type JsonWidgetListenSchedulerBatch,
} from '@workbench-kit/jdw';

import { getJdwPreviewInvalidations, JdwPreview } from './JdwPreview.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('expands document refs before validate and draw when loadDocument is provided', () => {
    const part = formatJsonWidgetData({
      type: 'text',
      args: { text: 'Imported Header' },
    });
    const composed = formatJsonWidgetData({
      type: 'column',
      args: {
        children: [
          {
            type: 'ref',
            args: { path: '../parts/header/header.jdw.json' },
          },
        ],
      },
    });

    const withoutLoader = renderToStaticMarkup(
      <JdwPreview documentPath="jdw/composed/home.refs.jdw.json" json={composed} />,
    );
    expect(withoutLoader).toContain('data-testid="jdw-preview-error"');
    expect(withoutLoader).toMatch(/Unknown widget type|ref/i);

    const withLoader = renderToStaticMarkup(
      <JdwPreview
        documentPath="jdw/composed/home.refs.jdw.json"
        json={composed}
        loadDocument={(path) => (path === 'jdw/parts/header/header.jdw.json' ? part : null)}
      />,
    );
    expect(withLoader).toContain('data-testid="jdw-preview-output"');
    expect(withLoader).toContain('Imported Header');
  });

  it('surfaces circular document ref errors in preview', () => {
    const cyclic = formatJsonWidgetData({
      type: 'ref',
      args: { path: './self.jdw.json' },
    });

    const markup = renderToStaticMarkup(
      <JdwPreview
        documentPath="jdw/parts/self.jdw.json"
        json={cyclic}
        loadDocument={() => cyclic}
      />,
    );

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).toContain('Circular document ref');
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

  it('publishes explicit preview changes as one scheduled batch', async () => {
    const json = formatJsonWidgetData({
      type: 'column',
      listen: ['theme'],
      args: {
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}' },
          },
        ],
      },
    });
    const batches: JsonWidgetListenSchedulerBatch[] = [];
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <JdwPreview
          changedValuePaths={['title', 'theme.color', 'title']}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
          values={{ title: 'Scheduled title' }}
        />,
      );
    });

    expect(frames).toHaveLength(1);
    await act(async () => {
      frames[0]?.(0);
    });

    expect(batches).toHaveLength(1);
    expect(batches[0]?.changedPaths).toEqual(['title', 'theme.color']);
    expect(batches[0]?.invalidations).toHaveLength(2);
    expect(container.textContent).toContain('Scheduled title');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('publishes a changed explicit path set without requiring a new version', async () => {
    const json = formatJsonWidgetData({
      type: 'column',
      listen: ['theme'],
      args: {
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}' },
          },
        ],
      },
    });
    const batches: JsonWidgetListenSchedulerBatch[] = [];
    const scheduled: Array<() => void> = [];
    const schedule = (flush: () => void) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <JdwPreview
          changedValuePaths={['title']}
          changedValuePathsVersion={1}
          invalidationSchedule={schedule}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
        />,
      );
    });
    await act(async () => {
      scheduled[0]?.();
    });

    await act(async () => {
      root.render(
        <JdwPreview
          changedValuePaths={['theme.color']}
          changedValuePathsVersion={1}
          invalidationSchedule={schedule}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
        />,
      );
    });

    expect(scheduled).toHaveLength(2);
    await act(async () => {
      scheduled[1]?.();
    });

    expect(batches.map((batch) => batch.changedPaths)).toEqual([['title'], ['theme.color']]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('publishes repeated inferred paths as independent value-change batches', async () => {
    const json = formatJsonWidgetData({
      type: 'text',
      listen: ['title'],
      args: { text: '${title}' },
    });
    const batches: JsonWidgetListenSchedulerBatch[] = [];
    const scheduled: Array<() => void> = [];
    const schedule = (flush: () => void) => {
      scheduled.push(flush);
      return () => undefined;
    };
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <JdwPreview
          invalidationSchedule={schedule}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
          values={{ title: 'First title' }}
        />,
      );
    });
    expect(scheduled).toHaveLength(0);

    await act(async () => {
      root.render(
        <JdwPreview
          invalidationSchedule={schedule}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
          values={{ title: 'Second title' }}
        />,
      );
    });
    await act(async () => {
      scheduled[0]?.();
    });

    await act(async () => {
      root.render(
        <JdwPreview
          invalidationSchedule={schedule}
          json={json}
          onInvalidationBatch={(batch) => batches.push(batch)}
          values={{ title: 'Third title' }}
        />,
      );
    });
    await act(async () => {
      scheduled[1]?.();
    });

    expect(batches.map((batch) => batch.changedPaths)).toEqual([['title'], ['title']]);
    expect(container.textContent).toContain('Third title');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
