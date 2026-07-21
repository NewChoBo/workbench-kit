import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScrollAreaInfiniteSentinel } from './ScrollAreaInfiniteSentinel';

describe('ScrollAreaInfiniteSentinel', () => {
  it('renders a hidden sentinel marker inside scroll areas', () => {
    const markup = renderToStaticMarkup(
      <ScrollAreaInfiniteSentinel data-testid="catalog-sentinel" />,
    );

    expect(markup).toContain('ui-scroll-area-infinite-sentinel');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-testid="catalog-sentinel"');
  });
});
