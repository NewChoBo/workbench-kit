/** Clamp a finite number into the inclusive `[min, max]` range. */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
