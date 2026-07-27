import { describe, expect, it } from 'vitest';

import { resolveLibraryDetailHeroCoverMedia } from './resolve-hero-cover-media.js';

describe('resolveLibraryDetailHeroCoverMedia', () => {
  it('uses distinct hero in the band and keeps portrait cover', () => {
    expect(
      resolveLibraryDetailHeroCoverMedia({
        heroImageUrl: 'https://cdn.example/hero.jpg',
        coverImageUrl: 'https://cdn.example/cover.jpg',
      }),
    ).toEqual({
      resolvedCover: 'https://cdn.example/cover.jpg',
      resolvedHero: 'https://cdn.example/hero.jpg',
      atmosphereUrl: null,
      bandImageUrl: 'https://cdn.example/hero.jpg',
      bandKind: 'hero',
      showPortraitCover: true,
    });
  });

  it('applies atmosphere-from-cover when hero is absent or identical to cover', () => {
    expect(
      resolveLibraryDetailHeroCoverMedia({
        heroImageUrl: 'https://cdn.example/cover.jpg',
        coverImageUrl: 'https://cdn.example/cover.jpg',
      }),
    ).toMatchObject({
      bandKind: 'atmosphere',
      atmosphereUrl: 'https://cdn.example/cover.jpg',
      showPortraitCover: true,
    });

    expect(
      resolveLibraryDetailHeroCoverMedia({
        coverImageUrl: '  https://cdn.example/cover.jpg  ',
      }),
    ).toMatchObject({
      bandKind: 'atmosphere',
      resolvedCover: 'https://cdn.example/cover.jpg',
    });
  });

  it('falls back when media fails or URLs are blank', () => {
    expect(
      resolveLibraryDetailHeroCoverMedia({
        heroImageUrl: 'https://cdn.example/hero.jpg',
        coverImageUrl: 'https://cdn.example/cover.jpg',
        heroFailed: true,
      }),
    ).toMatchObject({
      bandKind: 'atmosphere',
      atmosphereUrl: 'https://cdn.example/cover.jpg',
    });

    expect(
      resolveLibraryDetailHeroCoverMedia({
        heroImageUrl: 'https://cdn.example/hero.jpg',
        coverImageUrl: 'https://cdn.example/cover.jpg',
        coverFailed: true,
      }),
    ).toMatchObject({
      bandKind: 'hero',
      showPortraitCover: false,
      resolvedCover: null,
    });

    expect(
      resolveLibraryDetailHeroCoverMedia({
        heroImageUrl: '   ',
        coverImageUrl: '',
      }),
    ).toMatchObject({
      bandKind: 'fallback',
      bandImageUrl: null,
      showPortraitCover: false,
    });
  });
});
