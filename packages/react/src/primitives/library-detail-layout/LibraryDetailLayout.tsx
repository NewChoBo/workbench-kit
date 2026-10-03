import './library-detail-layout.css';
import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { WorkbenchMediaSlot } from '../workbench-media-slot';
import { RecordMediaHero } from '../record-media-hero';
import { ScrollArea } from '../scroll-area';
import { resolveLibraryDetailHeroCoverMedia } from './resolve-hero-cover-media.js';

export type LibraryDetailLayoutMode = 'background' | 'banner' | 'compact' | 'hero-cover';

export interface LibraryDetailLayoutProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'title'
> {
  readonly actions?: ReactNode;
  /** Optional attribution / footer below the identity row (`hero-cover` mode). */
  readonly attribution?: ReactNode;
  readonly backgroundImageUrl?: string | null;
  readonly children?: ReactNode;
  readonly coverAlt?: string;
  readonly coverImageUrl?: string | null;
  readonly description?: ReactNode;
  /**
   * Wide hero band URL for `hero-cover` mode. When omitted or identical to
   * `coverImageUrl`, the cover is used as soft atmosphere behind the portrait.
   */
  readonly heroImageUrl?: string | null;
  readonly logoImageUrl?: string | null;
  readonly mode?: LibraryDetailLayoutMode;
  /** Scroll the whole detail in constrained panes; defaults to the existing body-only scroll. */
  readonly scrollMode?: 'body' | 'all';
  readonly summary?: ReactNode;
  readonly title: ReactNode;
  readonly toolbar?: ReactNode;
}

export function LibraryDetailLayout({
  actions,
  attribution,
  backgroundImageUrl = null,
  children,
  className,
  coverAlt,
  coverImageUrl = null,
  description,
  heroImageUrl = null,
  logoImageUrl = null,
  mode = 'banner',
  scrollMode = 'body',
  summary,
  title,
  toolbar,
  ...props
}: LibraryDetailLayoutProps): ReactNode {
  const resolvedMode =
    mode === 'background'
      ? 'background'
      : mode === 'compact'
        ? 'compact'
        : mode === 'hero-cover'
          ? 'hero-cover'
          : 'banner';

  const hero =
    resolvedMode === 'hero-cover' ? (
      <LibraryDetailHeroCover
        mediaIdentityKey={
          scrollMode === 'all'
            ? JSON.stringify([heroImageUrl ?? backgroundImageUrl, coverImageUrl])
            : undefined
        }
        actions={actions}
        attribution={scrollMode === 'all' ? undefined : attribution}
        coverAlt={coverAlt}
        coverImageUrl={coverImageUrl}
        description={description}
        heroImageUrl={heroImageUrl ?? backgroundImageUrl}
        summary={summary}
        title={title}
      />
    ) : resolvedMode === 'background' ? (
      <div className="ui-library-detail-layout__band" data-ui-library-detail-band="true">
        <RecordMediaHero
          alt={coverAlt}
          className="ui-library-detail-layout__band-media"
          fallbackIcon="library"
          imageUrl={backgroundImageUrl}
          layout="background"
        />
        <div aria-hidden className="ui-library-detail-layout__band-overlay" />
        <div className="ui-library-detail-layout__band-content">
          <LibraryDetailIdentity logoImageUrl={logoImageUrl} summary={summary} title={title} />
          {actions ? <div className="ui-library-detail-layout__actions">{actions}</div> : null}
          {description ? (
            <div className="ui-library-detail-layout__description">{description}</div>
          ) : null}
        </div>
      </div>
    ) : (
      <div className="ui-library-detail-layout__hero" data-ui-library-detail-hero="true">
        <RecordMediaHero
          alt={coverAlt}
          className="ui-library-detail-layout__cover"
          fallbackIcon="library"
          imageUrl={coverImageUrl}
          layout="compact"
          logoUrl={logoImageUrl}
        />
        <div className="ui-library-detail-layout__hero-content">
          <div className="ui-library-detail-layout__title">{title}</div>
          {summary ? <div className="ui-library-detail-layout__summary">{summary}</div> : null}
          {actions ? <div className="ui-library-detail-layout__actions">{actions}</div> : null}
          {description ? (
            <div className="ui-library-detail-layout__description">{description}</div>
          ) : null}
        </div>
      </div>
    );

  return (
    <div
      className={cx(
        'ui-library-detail-layout',
        `ui-library-detail-layout--${resolvedMode}`,
        scrollMode === 'all' && 'ui-library-detail-layout--scroll-all',
        className,
      )}
      data-ui-library-detail-layout={resolvedMode}
      data-ui-library-detail-scroll={scrollMode}
      {...props}
    >
      {toolbar}
      {scrollMode === 'all' ? (
        <ScrollArea className="ui-library-detail-layout__scroll" orientation="vertical">
          {hero}
          {children ? (
            <div className="ui-library-detail-layout__body" data-ui-library-detail-body="true">
              {children}
            </div>
          ) : null}
          {attribution ? (
            <footer className="ui-library-detail-layout__footer">{attribution}</footer>
          ) : null}
        </ScrollArea>
      ) : (
        <>
          {hero}
          {children ? (
            <ScrollArea
              className="ui-library-detail-layout__body"
              data-ui-library-detail-body="true"
              orientation="vertical"
            >
              {children}
            </ScrollArea>
          ) : null}
        </>
      )}
    </div>
  );
}

function LibraryDetailHeroCover({
  actions,
  attribution,
  coverAlt,
  coverImageUrl,
  description,
  heroImageUrl,
  mediaIdentityKey,
  summary,
  title,
}: {
  actions?: ReactNode;
  attribution?: ReactNode;
  coverAlt?: string;
  coverImageUrl: string | null;
  description?: ReactNode;
  heroImageUrl: string | null;
  mediaIdentityKey?: string | undefined;
  summary?: ReactNode;
  title: ReactNode;
}): ReactNode {
  const [heroFailed, setHeroFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setHeroFailed(false);
  }, [heroImageUrl, mediaIdentityKey]);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverImageUrl, mediaIdentityKey]);

  const media = resolveLibraryDetailHeroCoverMedia({
    heroImageUrl,
    coverImageUrl,
    heroFailed,
    coverFailed,
  });

  return (
    <div
      className="ui-library-detail-layout__hero-cover"
      data-ui-library-detail-hero-cover="true"
      data-has-cover={media.showPortraitCover ? 'true' : 'false'}
    >
      <div className="ui-library-detail-layout__band" data-ui-library-detail-band="true">
        <RecordMediaHero
          key={mediaIdentityKey}
          alt={coverAlt}
          className={cx(
            'ui-library-detail-layout__band-media',
            media.bandKind === 'atmosphere' && 'ui-library-detail-layout__band-media--atmosphere',
          )}
          data-atmosphere={media.bandKind === 'atmosphere' ? 'true' : undefined}
          fallbackIcon="library"
          imageUrl={media.bandImageUrl}
          layout="background"
          onImageError={() => {
            if (media.bandKind === 'hero') {
              setHeroFailed(true);
            } else if (media.bandKind === 'atmosphere') {
              setCoverFailed(true);
            }
          }}
        />
        <div aria-hidden className="ui-library-detail-layout__band-overlay" />
      </div>
      <div className="ui-library-detail-layout__hero-cover-body">
        {media.showPortraitCover ? (
          <RecordMediaHero
            key={mediaIdentityKey}
            alt={coverAlt}
            className="ui-library-detail-layout__portrait-cover"
            fallbackIcon="library"
            imageUrl={media.resolvedCover}
            layout="compact"
            onImageError={() => setCoverFailed(true)}
          />
        ) : null}
        <div className="ui-library-detail-layout__hero-content">
          <div className="ui-library-detail-layout__title">{title}</div>
          {summary ? <div className="ui-library-detail-layout__summary">{summary}</div> : null}
          {actions ? <div className="ui-library-detail-layout__actions">{actions}</div> : null}
          {description ? (
            <div className="ui-library-detail-layout__description">{description}</div>
          ) : null}
          {attribution ? (
            <div className="ui-library-detail-layout__attribution">{attribution}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LibraryDetailIdentity({
  logoImageUrl,
  summary,
  title,
}: {
  logoImageUrl: string | null | undefined;
  summary: ReactNode | undefined;
  title: ReactNode;
}): ReactNode {
  return (
    <div className="ui-library-detail-layout__identity">
      <WorkbenchMediaSlot
        as="div"
        className="ui-library-detail-layout__logo-slot"
        fallbackClassName="ui-library-detail-layout__logo-fallback"
        fallbackIcon="library"
        fill
        imageClassName="ui-library-detail-layout__logo"
        imageUrl={logoImageUrl}
        loading="eager"
      />
      <div className="ui-library-detail-layout__identity-text">
        <div className="ui-library-detail-layout__title">{title}</div>
        {summary ? <div className="ui-library-detail-layout__summary">{summary}</div> : null}
      </div>
    </div>
  );
}
