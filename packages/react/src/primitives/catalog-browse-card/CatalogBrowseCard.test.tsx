/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CatalogBrowseCard } from './CatalogBrowseCard';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('CatalogBrowseCard', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('renders as a single button when trailing is omitted', () => {
    const markup = renderToStaticMarkup(<CatalogBrowseCard label="Clock" meta="Widget" />);

    expect(markup).toContain('ui-catalog-browse-card');
    expect(markup).not.toContain('ui-catalog-browse-card--with-trailing');
    expect(markup).not.toContain('ui-catalog-browse-card__trailing');
    expect(markup).toContain('Clock');
  });

  it('keeps primary activation on the main control when trailing is set', () => {
    const onClick = vi.fn();
    const onTrailingClick = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <CatalogBrowseCard
          label="Clock"
          meta="Widget"
          trailing={
            <button type="button" onClick={onTrailingClick}>
              Assign
            </button>
          }
          onClick={onClick}
        />,
      );
    });

    const card = container.querySelector('.ui-catalog-browse-card--with-trailing');
    const main = container.querySelector('.ui-catalog-browse-card__main');
    const trailingButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Assign',
    );

    expect(card).not.toBeNull();
    expect(main).not.toBeNull();
    expect(trailingButton).toBeDefined();

    act(() => {
      main?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onTrailingClick).not.toHaveBeenCalled();

    act(() => {
      trailingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onTrailingClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });
});
