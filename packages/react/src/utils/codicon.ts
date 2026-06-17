import { cx } from './cx';

export function getCodiconClassName(icon: string | undefined): string | undefined {
  const token = icon?.trim();
  if (!token) return undefined;

  return token.startsWith('codicon-') ? token : `codicon-${token}`;
}

export function cxCodicon(
  icon: string | undefined,
  ...classNames: Array<false | null | string | undefined>
) {
  const iconClassName = getCodiconClassName(icon);

  return iconClassName ? cx('codicon', iconClassName, ...classNames) : cx(...classNames);
}
