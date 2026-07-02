import type { ReactNode } from 'react';
import { Toolbar } from './Toolbar';

type ExternalLinkButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  dataAttributes?: Record<string, boolean | number | string | undefined>;
  href: string;
  rel?: string;
  target?: '_blank' | '_self';
  title?: string;
};

export function ExternalLinkButton({
  ariaLabel,
  children,
  className,
  compact = false,
  dataAttributes,
  href,
  rel,
  target = '_blank',
  title,
}: ExternalLinkButtonProps) {
  const classNames = ['ui-button', compact ? 'ui-button--compact' : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      aria-label={ariaLabel}
      className={classNames}
      data-variant="default"
      href={href}
      rel={rel ?? (target === '_blank' ? 'noreferrer' : undefined)}
      target={target}
      title={title}
      {...(dataAttributes ?? {})}
    >
      <i aria-hidden className="codicon codicon-link-external" />
      {children}
    </a>
  );
}

export function ExternalLinkRow({
  children,
  dataAttributes,
}: {
  children: ReactNode;
  dataAttributes?: Record<string, string>;
}) {
  return <Toolbar {...(dataAttributes ?? {})}>{children}</Toolbar>;
}
