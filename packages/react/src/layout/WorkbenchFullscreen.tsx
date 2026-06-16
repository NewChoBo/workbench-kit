import { forwardRef } from 'react';
import type { ComponentPropsWithRef } from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

export type WorkbenchFullscreenLauncherRootProps = ComponentPropsWithRef<'div'>;

export const WorkbenchFullscreenLauncherRoot = forwardRef<
  HTMLDivElement,
  WorkbenchFullscreenLauncherRootProps
>(function WorkbenchFullscreenLauncherRoot({ className, ...props }, ref) {
  return <div ref={ref} className={cx('ui-workbench-fullscreen-root', className)} {...props} />;
});

export type WorkbenchFullscreenBackdropProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenBackdrop({
  className,
  ...props
}: WorkbenchFullscreenBackdropProps) {
  return <div className={cx('ui-workbench-fullscreen-backdrop', className)} {...props} />;
}

export interface WorkbenchFullscreenBackdropImageProps extends ComponentPropsWithRef<'img'> {
  src: string;
}

export function WorkbenchFullscreenBackdropImage({
  alt = '',
  className,
  ...props
}: WorkbenchFullscreenBackdropImageProps) {
  return (
    <img
      alt={alt}
      className={cx('ui-workbench-fullscreen-backdrop__image', className)}
      {...props}
    />
  );
}

export type WorkbenchFullscreenBackdropScrimProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenBackdropScrim({
  className,
  ...props
}: WorkbenchFullscreenBackdropScrimProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('ui-workbench-fullscreen-backdrop__scrim', className)}
      {...props}
    />
  );
}

export type WorkbenchFullscreenContentProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenContent({
  className,
  ...props
}: WorkbenchFullscreenContentProps) {
  return <div className={cx('ui-workbench-fullscreen-content', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderProps = ComponentPropsWithRef<'header'>;

export function WorkbenchFullscreenHeader({ className, ...props }: WorkbenchFullscreenHeaderProps) {
  return <header className={cx('ui-workbench-fullscreen-header', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderBrandProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderBrand({
  className,
  ...props
}: WorkbenchFullscreenHeaderBrandProps) {
  return <div className={cx('ui-workbench-fullscreen-header__brand', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderTitle({
  className,
  ...props
}: WorkbenchFullscreenHeaderTitleProps) {
  return <div className={cx('ui-workbench-fullscreen-header__title', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderSubtitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderSubtitle({
  className,
  ...props
}: WorkbenchFullscreenHeaderSubtitleProps) {
  return <div className={cx('ui-workbench-fullscreen-header__subtitle', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderActionsProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderActions({
  className,
  ...props
}: WorkbenchFullscreenHeaderActionsProps) {
  return <div className={cx('ui-workbench-fullscreen-header__actions', className)} {...props} />;
}

export interface WorkbenchFullscreenButtonProps extends ComponentPropsWithRef<'button'> {
  icon?: string | undefined;
  prominent?: boolean | undefined;
}

export function WorkbenchFullscreenButton({
  children,
  className,
  icon,
  prominent = false,
  type = 'button',
  ...props
}: WorkbenchFullscreenButtonProps) {
  const iconClassName = cxCodicon(icon);

  return (
    <button
      className={cx('ui-workbench-fullscreen-button', className)}
      data-prominent={prominent ? 'true' : 'false'}
      type={type}
      {...props}
    >
      {iconClassName ? <span className={iconClassName} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

export type WorkbenchFullscreenHeroProps = ComponentPropsWithRef<'section'>;

export function WorkbenchFullscreenHero({ className, ...props }: WorkbenchFullscreenHeroProps) {
  return <section className={cx('ui-workbench-fullscreen-hero', className)} {...props} />;
}

export type WorkbenchFullscreenHeroMetaProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroMeta({
  className,
  ...props
}: WorkbenchFullscreenHeroMetaProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__meta', className)} {...props} />;
}

export type WorkbenchFullscreenHeroTitleProps = ComponentPropsWithRef<'h1'>;

export function WorkbenchFullscreenHeroTitle({
  className,
  ...props
}: WorkbenchFullscreenHeroTitleProps) {
  return <h1 className={cx('ui-workbench-fullscreen-hero__title', className)} {...props} />;
}

export type WorkbenchFullscreenPillRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenPillRow({
  className,
  ...props
}: WorkbenchFullscreenPillRowProps) {
  return <div className={cx('ui-workbench-fullscreen-pill-row', className)} {...props} />;
}

export type WorkbenchFullscreenPillProps = ComponentPropsWithRef<'span'>;

export function WorkbenchFullscreenPill({ className, ...props }: WorkbenchFullscreenPillProps) {
  return <span className={cx('ui-workbench-fullscreen-pill', className)} {...props} />;
}

export type WorkbenchFullscreenHeroActionRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroActionRow({
  className,
  ...props
}: WorkbenchFullscreenHeroActionRowProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__action-row', className)} {...props} />;
}

export type WorkbenchFullscreenHeroStatusProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroStatus({
  className,
  ...props
}: WorkbenchFullscreenHeroStatusProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__status', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenEmpty({ className, ...props }: WorkbenchFullscreenEmptyProps) {
  return <div className={cx('ui-workbench-fullscreen-empty', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyTitleProps = ComponentPropsWithRef<'h1'>;

export function WorkbenchFullscreenEmptyTitle({
  className,
  ...props
}: WorkbenchFullscreenEmptyTitleProps) {
  return <h1 className={cx('ui-workbench-fullscreen-empty__title', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyTextProps = ComponentPropsWithRef<'p'>;

export function WorkbenchFullscreenEmptyText({
  className,
  ...props
}: WorkbenchFullscreenEmptyTextProps) {
  return <p className={cx('ui-workbench-fullscreen-empty__text', className)} {...props} />;
}

export type WorkbenchFullscreenCarouselProps = ComponentPropsWithRef<'section'>;

export function WorkbenchFullscreenCarousel({
  className,
  ...props
}: WorkbenchFullscreenCarouselProps) {
  return <section className={cx('ui-workbench-fullscreen-carousel', className)} {...props} />;
}

export type WorkbenchFullscreenCarouselViewportProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenCarouselViewport({
  className,
  ...props
}: WorkbenchFullscreenCarouselViewportProps) {
  return (
    <div
      className={cx(
        'ui-workbench-fullscreen-carousel__viewport',
        'ui-workbench-scrollbar',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkbenchFullscreenNavButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  icon: string;
  label: string;
}

export function WorkbenchFullscreenNavButton({
  className,
  icon,
  label,
  type = 'button',
  ...props
}: WorkbenchFullscreenNavButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx('ui-workbench-fullscreen-nav-button', className)}
      title={label}
      type={type}
      {...props}
    >
      <span className={cxCodicon(icon)} aria-hidden />
    </button>
  );
}

export interface WorkbenchFullscreenOptionProps extends ComponentPropsWithRef<'div'> {
  selected?: boolean | undefined;
}

export function WorkbenchFullscreenOption({
  className,
  selected = false,
  ...props
}: WorkbenchFullscreenOptionProps) {
  return (
    <div
      aria-selected={selected}
      className={cx('ui-workbench-fullscreen-option', className)}
      data-selected={selected ? 'true' : 'false'}
      role="option"
      tabIndex={0}
      {...props}
    />
  );
}

export type WorkbenchFullscreenArtworkTone = 'accent' | 'success';

export interface WorkbenchFullscreenOptionArtworkProps extends ComponentPropsWithRef<'div'> {
  tone?: WorkbenchFullscreenArtworkTone | undefined;
}

export function WorkbenchFullscreenOptionArtwork({
  className,
  tone = 'success',
  ...props
}: WorkbenchFullscreenOptionArtworkProps) {
  return (
    <div
      className={cx('ui-workbench-fullscreen-option__artwork', className)}
      data-tone={tone}
      {...props}
    />
  );
}

export type WorkbenchFullscreenOptionImageProps = ComponentPropsWithRef<'img'>;

export function WorkbenchFullscreenOptionImage({
  alt = '',
  className,
  ...props
}: WorkbenchFullscreenOptionImageProps) {
  return (
    <img alt={alt} className={cx('ui-workbench-fullscreen-option__image', className)} {...props} />
  );
}

export interface WorkbenchFullscreenOptionPlaceholderProps extends ComponentPropsWithRef<'span'> {
  icon?: string | undefined;
}

export function WorkbenchFullscreenOptionPlaceholder({
  className,
  icon = 'device-desktop',
  ...props
}: WorkbenchFullscreenOptionPlaceholderProps) {
  return (
    <span
      aria-hidden="true"
      className={cxCodicon(icon, 'ui-workbench-fullscreen-option__placeholder', className)}
      {...props}
    />
  );
}

export type WorkbenchFullscreenOptionBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionBody({
  className,
  ...props
}: WorkbenchFullscreenOptionBodyProps) {
  return <div className={cx('ui-workbench-fullscreen-option__body', className)} {...props} />;
}

export type WorkbenchFullscreenOptionTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionTitle({
  className,
  ...props
}: WorkbenchFullscreenOptionTitleProps) {
  return <div className={cx('ui-workbench-fullscreen-option__title', className)} {...props} />;
}

export type WorkbenchFullscreenOptionMetaProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionMeta({
  className,
  ...props
}: WorkbenchFullscreenOptionMetaProps) {
  return <div className={cx('ui-workbench-fullscreen-option__meta', className)} {...props} />;
}
