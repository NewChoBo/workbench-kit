/** Maximum ordered transforms applied on a single edge. */
export const MAX_TRANSFORM_CHAIN = 3;

/** Built-in pass-through transform id (kept here to avoid import cycles). */
export const IDENTITY_TRANSFORM_ID = 'identity';

/** Legacy id aliases → canonical ids (empty until hosts need migration). */
export const TRANSFORM_ID_ALIASES: Readonly<Record<string, string>> = {};

/** Map a legacy or canonical transform id to its canonical form. */
export function canonicalizeTransformId(id: string): string {
  const trimmed = id.trim();
  return TRANSFORM_ID_ALIASES[trimmed] ?? trimmed;
}
