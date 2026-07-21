import type { SourceField, TargetSlot } from '../types.js';

/** Flatten nested source fields depth-first. */
export function flattenSourceFields(fields: readonly SourceField[]): SourceField[] {
  const out: SourceField[] = [];
  for (const field of fields) {
    out.push(field);
    if (field.children?.length) {
      out.push(...flattenSourceFields(field.children));
    }
  }
  return out;
}

/** Flatten nested target slots depth-first. */
export function flattenTargetSlots(slots: readonly TargetSlot[]): TargetSlot[] {
  const out: TargetSlot[] = [];
  for (const slot of slots) {
    out.push(slot);
    if (slot.children?.length) {
      out.push(...flattenTargetSlots(slot.children));
    }
  }
  return out;
}

export function findTargetSlot(
  slots: readonly TargetSlot[],
  slotId: string,
): TargetSlot | undefined {
  return flattenTargetSlots(slots).find((slot) => slot.id === slotId);
}
