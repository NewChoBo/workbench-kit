import { isFiniteNumber } from './type-guards.js';

/** Package-internal clamp helper (not a public export). */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Package-internal positive-integer reader (not a public export). */
export function readPositiveInteger(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 1) return null;
  return Math.floor(value);
}
