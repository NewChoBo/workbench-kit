import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CatalogFilterOverlay } from './CatalogFilterOverlay';

describe('CatalogFilterOverlay', () => {
  it('keeps Clear mounted when disabled so the header height stays stable', () => {
    const markup = renderToStaticMarkup(
      <CatalogFilterOverlay
        clearDisabled
        clearLabel="Clear filters"
        onClear={() => undefined}
        title="Catalog filters"
        titleId="catalog-filters-title"
      >
        <div>sections</div>
      </CatalogFilterOverlay>,
    );

    expect(markup).toContain('data-ui-catalog-filter-overlay="true"');
    expect(markup).toContain('aria-label="Clear filters"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Catalog filters');
    expect(markup).toContain('sections');
  });

  it('enables Clear when filters are active', () => {
    const markup = renderToStaticMarkup(
      <CatalogFilterOverlay
        clearLabel="Clear filters"
        onClear={() => undefined}
        title="Catalog filters"
        titleId="catalog-filters-title"
      >
        <div>sections</div>
      </CatalogFilterOverlay>,
    );

    expect(markup).toContain('aria-label="Clear filters"');
    expect(markup).not.toMatch(/disabled=""/);
  });
});
