import './template-gallery.css';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type TemplateGalleryProps = ComponentPropsWithRef<'section'>;

export function TemplateGallery({ className, ...props }: TemplateGalleryProps) {
  return <section className={cx('ui-template-gallery', className)} {...props} />;
}

export type TemplateGalleryHeaderProps = ComponentPropsWithRef<'div'>;

export function TemplateGalleryHeader({ className, ...props }: TemplateGalleryHeaderProps) {
  return <div className={cx('ui-template-gallery__header', className)} {...props} />;
}

export type TemplateGalleryGridProps = ComponentPropsWithRef<'div'>;

export function TemplateGalleryGrid({ className, ...props }: TemplateGalleryGridProps) {
  return <div className={cx('ui-template-gallery__grid', className)} {...props} />;
}

export type TemplateGalleryFooterProps = ComponentPropsWithRef<'div'>;

export function TemplateGalleryFooter({ className, ...props }: TemplateGalleryFooterProps) {
  return <div className={cx('ui-template-gallery__footer', className)} {...props} />;
}

export interface TemplateGalleryCardProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'title'
> {
  description?: ReactNode;
  eyebrow?: ReactNode;
  heading: ReactNode;
  preview?: ReactNode;
  skeleton?: boolean | undefined;
}

export function TemplateGalleryCard({
  className,
  description,
  eyebrow,
  heading,
  preview,
  skeleton = false,
  type = 'button',
  ...props
}: TemplateGalleryCardProps) {
  return (
    <button
      className={cx(
        'ui-template-gallery-card',
        skeleton && 'ui-template-gallery-card--skeleton',
        className,
      )}
      type={type}
      {...props}
    >
      {preview ? <div className="ui-template-gallery-card__preview">{preview}</div> : null}
      <div className="ui-template-gallery-card__body">
        {eyebrow ? <div className="ui-template-gallery-card__eyebrow">{eyebrow}</div> : null}
        <div className="ui-template-gallery-card__title">{heading}</div>
        {description ? (
          <div className="ui-template-gallery-card__description">{description}</div>
        ) : null}
      </div>
    </button>
  );
}

export interface SourceManagerNavItemProps extends ComponentPropsWithRef<'button'> {
  active?: boolean | undefined;
}

export function SourceManagerNavItem({
  active = false,
  className,
  type = 'button',
  ...props
}: SourceManagerNavItemProps) {
  return (
    <button
      className={cx('ui-source-manager-nav-item', className)}
      data-active={active ? 'true' : undefined}
      type={type}
      {...props}
    />
  );
}
