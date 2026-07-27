/** Return a finite number, or `undefined` when the value is not usable as one. */
export function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
