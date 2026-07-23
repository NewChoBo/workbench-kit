const HEX_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_RE = /^rgba?\(\s*[\d.%]+\s*(?:,\s*[\d.%]+\s*){2,3}(?:,\s*[\d.%]+\s*)?\)$/i;
const HSL_COLOR_RE =
  /^hsla?\(\s*-?[\d.]+(?:deg|grad|rad|turn)?\s*(?:,\s*[\d.%]+\s*){2,3}(?:,\s*[\d.%]+\s*)?\)$/i;
const LENGTH_RE = /^-?[\d.]+(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex)?$/i;
const NAMED_COLOR_RE = /^(?:transparent|currentcolor|inherit|initial|unset)$/i;

const UNSAFE_TOKEN_VALUE_RE =
  /url\s*\(|expression\s*\(|attr\s*\(|-moz-binding|@import|javascript:|vbscript:|data:|<\/|\\0/i;

/**
 * Allowlist theme `tokenOverride` CSS values before `element.style.setProperty`.
 * Returns null when the value must not be applied.
 */
export function sanitizeThemeTokenValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }

  if (UNSAFE_TOKEN_VALUE_RE.test(trimmed)) {
    return null;
  }

  if (
    HEX_COLOR_RE.test(trimmed) ||
    RGB_COLOR_RE.test(trimmed) ||
    HSL_COLOR_RE.test(trimmed) ||
    LENGTH_RE.test(trimmed) ||
    NAMED_COLOR_RE.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
}
