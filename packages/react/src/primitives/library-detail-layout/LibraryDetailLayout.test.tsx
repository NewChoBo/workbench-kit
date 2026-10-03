/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { LibraryDetailLayout } from './LibraryDetailLayout';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

describe('LibraryDetailLayout compatibility and complete scroll', () => {
  it('keeps body-only scroll and the banner default', () => {
    const markup = renderToStaticMarkup(
      <LibraryDetailLayout title="Record">
        <p>Facts</p>
      </LibraryDetailLayout>,
    );
    expect(markup).toContain('data-ui-library-detail-layout="banner"');
    expect(markup).toContain('data-ui-library-detail-scroll="body"');
    expect(markup).not.toContain('ui-library-detail-layout--scroll-all');
    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(
      container
        .querySelector('[data-ui-library-detail-body]')
        ?.classList.contains('ui-scroll-area'),
    ).toBe(true);
  });

  it('uses one scroll for media, identity, actions, facts and attribution but leaves the toolbar outside', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      <LibraryDetailLayout
        mode="hero-cover"
        scrollMode="all"
        title={<h1>Record</h1>}
        toolbar={<button>Back</button>}
        actions={<button>Launch</button>}
        description={<p>Description</p>}
        attribution={<span>Metadata attribution</span>}
      >
        <p>Facts</p>
      </LibraryDetailLayout>,
    );
    const scroll = container.querySelector('.ui-library-detail-layout__scroll')!;
    expect(container.querySelectorAll('.ui-scroll-area')).toHaveLength(1);
    expect(scroll.textContent).toContain('RecordLaunchDescriptionFactsMetadata attribution');
    expect(scroll.textContent).not.toContain('Back');
    expect(scroll.querySelector('footer')?.textContent).toBe('Metadata attribution');
    expect(scroll.querySelector('h1')?.textContent).toBe('Record');
  });

  it('falls back from hero to cover atmosphere, resets with a new media identity and ignores an old image error', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };
    const render = (cover: string) =>
      act(() =>
        root.render(
          <LibraryDetailLayout
            mode="hero-cover"
            scrollMode="all"
            heroImageUrl="https://example.com/hero.png"
            coverImageUrl={cover}
            title="Record"
          />,
        ),
      );
    render('https://example.com/cover-a.png');
    const oldHero = container.querySelector<HTMLImageElement>(
      '.ui-library-detail-layout__band img',
    )!;
    act(() => oldHero.dispatchEvent(new Event('error')));
    expect(
      container.querySelector('.ui-library-detail-layout__band img')?.getAttribute('src'),
    ).toBe('https://example.com/cover-a.png');
    render('https://example.com/cover-a.png');
    expect(
      container.querySelector('.ui-library-detail-layout__band img')?.getAttribute('src'),
    ).toBe('https://example.com/cover-a.png');
    render('https://example.com/cover-b.png');
    expect(
      container.querySelector('.ui-library-detail-layout__band img')?.getAttribute('src'),
    ).toBe('https://example.com/hero.png');
    act(() => oldHero.dispatchEvent(new Event('error')));
    expect(
      container.querySelector('.ui-library-detail-layout__band img')?.getAttribute('src'),
    ).toBe('https://example.com/hero.png');
    const hero = container.querySelector<HTMLImageElement>('.ui-library-detail-layout__band img')!;
    act(() => hero.dispatchEvent(new Event('error')));
    const portrait = container.querySelector<HTMLImageElement>(
      '.ui-library-detail-layout__portrait-cover img',
    )!;
    act(() => portrait.dispatchEvent(new Event('error')));
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(
      container
        .querySelector('[data-ui-library-detail-hero-cover]')
        ?.getAttribute('data-has-cover'),
    ).toBe('false');
    expect(container.textContent).toContain('Record');
  });
});
