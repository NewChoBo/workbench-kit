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
});
