export function cx(...classNames: Array<false | null | string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
