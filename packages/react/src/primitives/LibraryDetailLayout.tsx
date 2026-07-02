import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../utils/cx';
import { useWorkbenchMediaImage } from '../utils/useWorkbenchMediaImage';
import { RecordMediaHero } from './RecordMediaHero';
import { ScrollArea } from './ScrollArea';

export type LibraryDetailLayoutMode = 'background' | 'banner' | 'compact';

export interface LibraryDetailLayoutProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'title'
> {
  readonly actions?: ReactNode;
  readonly backgroundImageUrl?: string | null | undefined;
  readonly children?: ReactNode;
  readonly coverAlt?: string | undefined;
  readonly coverImageUrl?: string | null | undefined;
  readonly description?: ReactNode;
  readonly logoImageUrl?: string | null | undefined;
  readonly mode?: LibraryDetailLayoutMode | undefined;
  readonly summary?: ReactNode;
  readonly title: ReactNode;
  readonly toolbar?: ReactNode;
}

export function LibraryDetailLayout({
  actions,
  backgroundImageUrl = null,
  children,
  className,
  coverAlt,
  coverImageUrl = null,
  description,
  logoImageUrl = null,
  mode = 'banner',
  summary,
  title,
  toolbar,
  ...props
}: LibraryDetailLayoutProps): ReactNode {
  const backgroundMedia = useWorkbenchMediaImage(backgroundImageUrl);
  const resolvedMode =
    mode === 'background' && backgroundMedia.shouldShowImage
      ? 'background'
      : mode === 'compact'
        ? 'compact'
        : 'banner';

  return (
    <div
      className={cx(
        'ui-library-detail-layout',
        `ui-library-detail-layout--${resolvedMode}`,
        className,
      )}
      data-ui-library-detail-layout={resolvedMode}
      {...props}
    >
      {toolbar}
      {resolvedMode === 'background' ? (
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
      )}
      {children ? (
        <ScrollArea
          className="ui-library-detail-layout__body"
          data-ui-library-detail-body="true"
          orientation="vertical"
        >
          {children}
        </ScrollArea>
      ) : null}
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
  const logoMedia = useWorkbenchMediaImage(logoImageUrl);

  return (
    <div className="ui-library-detail-layout__identity">
      {logoMedia.shouldShowImage ? (
        <img
          alt=""
          className="ui-library-detail-layout__logo"
          onError={logoMedia.onImageError}
          src={logoMedia.imageSrc}
        />
      ) : null}
      <div className="ui-library-detail-layout__identity-text">
        <div className="ui-library-detail-layout__title">{title}</div>
        {summary ? <div className="ui-library-detail-layout__summary">{summary}</div> : null}
      </div>
    </div>
  );
}
