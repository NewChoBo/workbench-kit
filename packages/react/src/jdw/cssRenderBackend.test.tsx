import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createWidgetRegistry, parseJsonWidgetData, type GenericWidget } from '@workbench-kit/jdw';

import { JDW_FIXTURE_ROW_FLEX } from './fixtures/jdw-fixtures.js';
import { renderJdwWithLayout } from './cssRenderBackend.js';

describe('cssRenderBackend', () => {
  it('positions row flex children using layout rects', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    expect(parsed.value).not.toBeNull();

    const markup = renderToStaticMarkup(
      <>
        {renderJdwWithLayout(parsed.value!, {
          layoutConstraints: { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 120 },
        })}
      </>,
    );

    expect(markup).toContain('data-css-render-root="true"');
    expect(markup).toContain('Left');
    expect(markup).toContain('Right (flex 2)');
  });

  it('renders static leaf widgets through the builtin registry', () => {
    const parsed = parseJsonWidgetData(
      JSON.stringify({
        type: 'column',
        args: {
          children: [
            { type: 'icon', args: { name: 'rocket', color: '#fff', size: 16 } },
            { type: 'button', args: { label: 'Launch', variant: 'secondary' } },
          ],
        },
      }),
    );
    expect(parsed.value).not.toBeNull();

    const markup = renderToStaticMarkup(<>{renderJdwWithLayout(parsed.value!)}</>);

    expect(markup).toContain('data-widget-type="icon"');
    expect(markup).toContain('codicon-rocket');
    expect(markup).toContain('data-widget-type="button"');
    expect(markup).toContain('Launch');
  });

  it('marks selected layout nodes with stable widget paths', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    expect(parsed.value).not.toBeNull();

    const markup = renderToStaticMarkup(
      <>
        {renderJdwWithLayout(parsed.value!, {
          selectedPath: [{ kind: 'children', index: 1 }],
        })}
      </>,
    );

    expect(markup).toContain('data-widget-path="$.children[1]"');
    expect(markup).toContain('data-widget-selected="true"');
  });

  it('uses allowlisted registry host tags for layout wrappers', () => {
    const parsed = parseJsonWidgetData(
      JSON.stringify({
        type: 'column',
        args: {
          children: [{ type: 'text', args: { text: 'Semantic child' } }],
        },
      }),
    );
    expect(parsed.value).not.toBeNull();

    const registry = createWidgetRegistry<(widget: GenericWidget) => unknown>([
      {
        type: 'column',
        hostTag: 'section',
        build: () => null,
      },
      {
        type: 'text',
        hostTag: 'span',
        build: (widget) => widget.text,
      },
    ]);

    const markup = renderToStaticMarkup(<>{renderJdwWithLayout(parsed.value!, { registry })}</>);

    expect(markup).toContain('<section data-layout-node="true"');
    expect(markup).toContain('<span data-layout-node="true"');
  });

  it('falls back to div for non-allowlisted registry host tags', () => {
    const parsed = parseJsonWidgetData(
      JSON.stringify({ type: 'text', args: { text: 'Unsafe host tag' } }),
    );
    expect(parsed.value).not.toBeNull();

    const registry = createWidgetRegistry<(widget: GenericWidget) => unknown>([
      {
        type: 'text',
        hostTag: 'script' as never,
        build: (widget) => widget.text,
      },
    ]);

    const markup = renderToStaticMarkup(<>{renderJdwWithLayout(parsed.value!, { registry })}</>);

    expect(markup).not.toContain('<script');
    expect(markup).toContain('<div data-layout-node="true"');
    expect(markup).toContain('Unsafe host tag');
  });

  it('passes registry measure hooks into layout', () => {
    const parsed = parseJsonWidgetData(
      JSON.stringify({
        type: 'row',
        args: {
          mainAxisAlignment: 'center',
          children: [
            { type: 'text', args: { text: 'A' } },
            { type: 'text', args: { text: 'B' } },
          ],
        },
      }),
    );
    expect(parsed.value).not.toBeNull();

    const registry = createWidgetRegistry<(widget: GenericWidget) => unknown>([
      {
        type: 'text',
        build: (widget) => widget.text,
        measure: () => ({ width: 20, height: 10 }),
      },
    ]);

    const markup = renderToStaticMarkup(
      <>
        {renderJdwWithLayout(parsed.value!, {
          registry,
          layoutConstraints: { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 40 },
        })}
      </>,
    );

    expect(markup).toContain('left:30px');
    expect(markup).toContain('width:20px');
  });
  it('keeps clipping on every layout node when root overflow is omitted or hidden', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    for (const options of [{}, { rootOverflow: undefined }, { rootOverflow: 'hidden' as const }]) {
      const markup = renderToStaticMarkup(<>{renderJdwWithLayout(parsed.value!, options)}</>);
      expect(markup.match(/overflow:hidden/g)).toHaveLength(3);
      expect(markup).not.toContain('overflow:auto');
      expect(markup).not.toContain('data-layout-scroll-root');
      expect(markup).not.toContain('tabindex');
    }
  });

  it('opts only the root into one marked keyboard reachable scroll region', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    const markup = renderToStaticMarkup(
      <>{renderJdwWithLayout(parsed.value!, { rootOverflow: 'auto' })}</>,
    );
    expect(markup.match(/overflow:auto/g)).toHaveLength(1);
    expect(markup.match(/overflow:hidden/g)).toHaveLength(2);
    expect(markup.match(/data-layout-scroll-root="true"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Widget viewport"');
    expect(markup).toContain('role="region" tabindex="0"');
  });

  it('preserves selection keyboard semantics when an interactive root opts into scrolling', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    const markup = renderToStaticMarkup(
      <>
        {renderJdwWithLayout(parsed.value!, {
          rootOverflow: 'auto',
          selectedPath: [],
          onSelectPath: () => undefined,
        })}
      </>,
    );
    expect(markup).toContain('role="button" tabindex="0"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain('role="region"');
  });

  it('preserves an interactive semantic host role when root scrolling is enabled', () => {
    const parsed = parseJsonWidgetData(JDW_FIXTURE_ROW_FLEX);
    const registry = createWidgetRegistry([{ type: 'row', hostTag: 'section', build: () => null }]);
    const markup = renderToStaticMarkup(
      <>
        {renderJdwWithLayout(parsed.value!, {
          registry,
          rootOverflow: 'auto',
          selectedPath: [],
          onSelectPath: () => undefined,
        })}
      </>,
    );
    expect(markup).toContain('<section aria-selected="true"');
    expect(markup).not.toContain('role="region"');
    expect(markup).not.toContain('aria-label="Widget viewport"');
  });
});
