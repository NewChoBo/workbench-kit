import './app-icon.css';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../utils/cx';

export type AppIconSize = 'sm' | 'md' | 'lg';

type AppIconBaseProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & {
  size?: AppIconSize;
};

type AppIconImageProps = {
  /** Accessible image text. Use an empty string when the surrounding surface already names the app. */
  alt: string;
  children?: never;
  src: string;
};

type AppIconCustomProps = {
  alt?: never;
  children: ReactNode;
  src?: never;
};

export type AppIconProps = AppIconBaseProps & (AppIconImageProps | AppIconCustomProps);

export function AppIcon({ alt, children, className, size = 'md', src, ...props }: AppIconProps) {
  return (
    <span className={cx('ui-app-icon', className)} data-size={size} {...props}>
      {src === undefined ? children : <img alt={alt} className="ui-app-icon__image" src={src} />}
    </span>
  );
}
