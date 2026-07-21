import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScrollArea } from './ScrollArea';

describe('ScrollArea', () => {
  it('renders a shared scrollbar surface with orientation and gutter classes', () => {
    const markup = renderToStaticMarkup(
      <ScrollArea aria-label="Scrollable content" orientation="vertical">
        Content
      </ScrollArea>,
    );

    expect(markup).toContain('ui-scroll-area');
    expect(markup).toContain('ui-workbench-scrollbar');
    expect(markup).toContain('ui-scroll-area--vertical');
    expect(markup).toContain('ui-scroll-area--stable-gutter');
  });

  it('can render as another element and hide scrollbars', () => {
    const markup = renderToStaticMarkup(
      <ScrollArea as="section" scrollbars="hidden" orientation="horizontal">
        Content
      </ScrollArea>,
    );

    expect(markup.startsWith('<section')).toBe(true);
    expect(markup).toContain('ui-scroll-area--horizontal');
    expect(markup).toContain('ui-workbench-scrollbar--hidden');
  });

  it('renders overlay mode as a host with a gutter-free viewport', () => {
    const markup = renderToStaticMarkup(
      <ScrollArea gutter="auto" orientation="vertical" scrollbars="overlay">
        Content
      </ScrollArea>,
    );

    expect(markup).toContain('ui-scroll-area--overlay-host');
    expect(markup).toContain('ui-scroll-area__viewport');
    expect(markup).toContain('ui-workbench-scrollbar--overlay');
    expect(markup).not.toContain('ui-scroll-area--stable-gutter');
    expect(markup).not.toContain('ui-workbench-scrollbar--hidden');
  });

  it('keeps overlay native scrollbar geometry at zero (no hover width toggle)', () => {
    const scrollbarsCss = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../scrollbars.css'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const overlayCss = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), './scroll-area-overlay.css'),
      'utf8',
    ).replace(/\r\n/g, '\n');

    expect(scrollbarsCss).toContain('.ui-workbench-scrollbar--overlay');
    expect(scrollbarsCss).toContain('scrollbar-width: none');
    expect(scrollbarsCss).toContain('.ui-workbench-scrollbar--overlay::-webkit-scrollbar');
    expect(scrollbarsCss).not.toMatch(
      /\.ui-workbench-scrollbar--overlay:hover::-webkit-scrollbar\s*\{[^}]*width:\s*var\(--scrollbar-size\)/,
    );
    expect(scrollbarsCss).not.toMatch(
      /\.ui-workbench-scrollbar--overlay:hover[^{]*\{[^}]*scrollbar-width:\s*thin/,
    );
    expect(overlayCss).toContain('position: absolute');
    expect(overlayCss).toContain('.ui-scroll-area__overlay-rail');
    expect(overlayCss).toContain('pointer-events: none');
  });
});
