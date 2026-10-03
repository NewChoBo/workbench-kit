/**
 * Framework-neutral text size estimates for JDW layout.
 *
 * Mirrors the Flutter split where json_dynamic_widget does not own TextPainter:
 * hosts (or registry `measure` hooks) supply metrics; the wire format stays free
 * of font data. See docs/workbench/json-dynamic-widget-reference.md §3.3.
 */

export interface EstimateWrappedTextSizeInput {
  readonly text: string;
  readonly fontSize: number;
  /** Available width from layout constraints (TextPainter maxWidth analogue). */
  readonly maxWidth: number;
  readonly averageCharWidthFactor?: number | undefined;
  readonly lineHeightFactor?: number | undefined;
  readonly maxLines?: number | undefined;
  /** Opt-in code-point/pre-wrap estimate with fixed metrics matching the builtin renderer. */
  readonly textMetricsMode?: 'unicode-pre-line-v1';
  readonly fontWeight?: 400 | 700;
}

export interface EstimatedTextSize {
  readonly width: number;
  readonly height: number;
  readonly lineCount: number;
}

function clampPositive(value: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Deterministic estimate, not font shaping: one average width per Unicode code
 * point, explicit line breaks, whitespace wrap opportunities and long-token
 * soft wrapping. Trailing whitespace may hang at the line edge as in pre-wrap.
 * Fixed metrics deliberately match the opt-in builtin text rendering style.
 */
function estimateUnicodePreLineTextSize(input: EstimateWrappedTextSizeInput): EstimatedTextSize {
  const fontSize = clampPositive(input.fontSize, 14);
  const charWidth = fontSize * (input.fontWeight === 700 ? 0.6 : 0.56);
  const lineHeight = fontSize * 1.35;
  const maxWidth = Math.max(0, input.maxWidth);
  const maxLines =
    typeof input.maxLines === 'number' && Number.isFinite(input.maxLines) && input.maxLines > 0
      ? Math.max(1, Math.floor(input.maxLines))
      : Number.POSITIVE_INFINITY;
  const paragraphs = input.text.replace(/\r\n?/g, '\n').split('\n');
  const lineWidths: number[] = [];
  const capacity = Math.max(1, Math.floor(maxWidth / charWidth));
  const pushLine = (length: number) => {
    if (lineWidths.length < maxLines) lineWidths.push(Math.min(maxWidth, length * charWidth));
  };

  for (const paragraph of paragraphs) {
    if (lineWidths.length >= maxLines) break;
    if (maxWidth <= 0) {
      pushLine(0);
      continue;
    }
    let currentLength = 0;
    for (const token of paragraph.split(/(\s+)/u)) {
      if (lineWidths.length >= maxLines) break;
      const length = Array.from(token).length;
      if (length === 0) continue;
      if (/^\s+$/u.test(token)) {
        currentLength += length;
        continue;
      }
      if (currentLength > 0 && currentLength + length > capacity) {
        pushLine(currentLength);
        currentLength = 0;
      }
      let remaining = length;
      while (remaining > capacity && lineWidths.length < maxLines) {
        pushLine(capacity);
        remaining -= capacity;
      }
      currentLength += remaining;
    }
    // Every explicit line exists, including empty and trailing lines.
    pushLine(currentLength);
  }

  return {
    width: lineWidths.reduce((widest, width) => Math.max(widest, width), 0),
    height: lineWidths.length * lineHeight,
    lineCount: lineWidths.length,
  };
}

/**
 * Approximates wrapped text size without DOM/canvas.
 * Word-wraps on whitespace; unbroken tokens soft-wrap by character width.
 */
export function estimateWrappedTextSize(input: EstimateWrappedTextSizeInput): EstimatedTextSize {
  if (input.textMetricsMode === 'unicode-pre-line-v1') {
    return estimateUnicodePreLineTextSize(input);
  }
  const fontSize = clampPositive(input.fontSize, 14);
  const maxWidth = Math.max(0, input.maxWidth);
  const charWidth = fontSize * clampPositive(input.averageCharWidthFactor ?? 0.56, 0.56);
  const lineHeight = fontSize * clampPositive(input.lineHeightFactor ?? 1.35, 1.35);
  const maxLines =
    typeof input.maxLines === 'number' && Number.isFinite(input.maxLines) && input.maxLines > 0
      ? Math.floor(input.maxLines)
      : Number.POSITIVE_INFINITY;

  const text = input.text;
  if (text.length === 0) {
    return { width: 0, height: lineHeight, lineCount: 1 };
  }

  if (maxWidth <= 0) {
    return { width: 0, height: lineHeight, lineCount: 1 };
  }

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (lines.length >= maxLines) return;
    lines.push(line);
  };

  const appendToken = (token: string) => {
    if (token.length === 0 || lines.length >= maxLines) return;

    const tokenWidth = token.length * charWidth;
    if (tokenWidth <= maxWidth) {
      const candidate = current.length === 0 ? token : `${current}${token}`;
      if (candidate.length * charWidth <= maxWidth) {
        current = candidate;
        return;
      }
      if (current.length > 0) {
        pushLine(current);
        current = token.trimStart().length === 0 ? '' : token;
      } else {
        current = token;
      }
      return;
    }

    // Soft-wrap long tokens by character.
    if (current.length > 0) {
      pushLine(current);
      current = '';
    }

    let remaining = token;
    while (remaining.length > 0 && lines.length < maxLines) {
      const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
      if (remaining.length <= charsPerLine) {
        current = remaining;
        break;
      }
      pushLine(remaining.slice(0, charsPerLine));
      remaining = remaining.slice(charsPerLine);
    }
  };

  for (const token of words) {
    appendToken(token);
  }
  if (current.length > 0 && lines.length < maxLines) {
    pushLine(current);
  }
  if (lines.length === 0) {
    lines.push('');
  }

  const lineCount = lines.length;
  const widest = lines.reduce((max, line) => Math.max(max, line.length * charWidth), 0);

  return {
    width: Math.min(maxWidth, widest),
    height: lineCount * lineHeight,
    lineCount,
  };
}
