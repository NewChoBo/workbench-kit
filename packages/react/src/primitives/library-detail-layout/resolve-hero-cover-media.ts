/**
 * Pure media resolution for LibraryDetailLayout `hero-cover` mode.
 * Implements atmosphere-from-cover when no distinct wide hero URL succeeds.
 */

export interface ResolveLibraryDetailHeroCoverMediaInput {
  readonly heroImageUrl?: string | null;
  readonly coverImageUrl?: string | null;
  readonly heroFailed?: boolean;
  readonly coverFailed?: boolean;
}

export interface ResolvedLibraryDetailHeroCoverMedia {
  /** Trimmed cover URL when load has not failed. */
  readonly resolvedCover: string | null;
  /** Distinct wide hero URL (differs from cover) when load has not failed. */
  readonly resolvedHero: string | null;
  /**
   * Soft backdrop URL when there is no successful distinct hero but cover is
   * available. Must not be stretched as the sole full-bleed identity cover.
   */
  readonly atmosphereUrl: string | null;
  /** Band media to render: distinct hero, else atmosphere, else null (fallback). */
  readonly bandImageUrl: string | null;
  readonly bandKind: 'hero' | 'atmosphere' | 'fallback';
  readonly showPortraitCover: boolean;
}

function trimUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function resolveLibraryDetailHeroCoverMedia(
  input: ResolveLibraryDetailHeroCoverMediaInput,
): ResolvedLibraryDetailHeroCoverMedia {
  const coverSource = trimUrl(input.coverImageUrl);
  const heroSource = trimUrl(input.heroImageUrl);
  const heroFailed = input.heroFailed ?? false;
  const coverFailed = input.coverFailed ?? false;

  const resolvedCover = coverSource && !coverFailed ? coverSource : null;
  const distinctHero = heroSource && coverSource && heroSource === coverSource ? null : heroSource;
  const resolvedHero = distinctHero && !heroFailed ? distinctHero : null;
  const atmosphereUrl = !resolvedHero && resolvedCover ? resolvedCover : null;

  if (resolvedHero) {
    return {
      resolvedCover,
      resolvedHero,
      atmosphereUrl: null,
      bandImageUrl: resolvedHero,
      bandKind: 'hero',
      showPortraitCover: resolvedCover !== null,
    };
  }

  if (atmosphereUrl) {
    return {
      resolvedCover,
      resolvedHero: null,
      atmosphereUrl,
      bandImageUrl: atmosphereUrl,
      bandKind: 'atmosphere',
      showPortraitCover: true,
    };
  }

  return {
    resolvedCover,
    resolvedHero: null,
    atmosphereUrl: null,
    bandImageUrl: null,
    bandKind: 'fallback',
    showPortraitCover: false,
  };
}
