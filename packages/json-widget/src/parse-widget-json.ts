import type { WidgetTypeShape } from '@workbench-kit/contracts';

export interface ParsedWidgetJson<W extends WidgetTypeShape = WidgetTypeShape> {
  readonly value: W | null;
  readonly parseError: string | null;
}

export function parseWidgetJson<W extends WidgetTypeShape = WidgetTypeShape>(
  value: string,
): ParsedWidgetJson<W> {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return {
      value: null,
      parseError: 'JSON is empty.',
    };
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!isObjectWidgetValue(parsed)) {
      return {
        value: null,
        parseError: 'Root must be a JSON object.',
      };
    }

    return {
      value: parsed as W,
      parseError: null,
    };
  } catch (error) {
    return {
      value: null,
      parseError: formatParseError(error),
    };
  }
}

export function formatWidgetJson<W extends WidgetTypeShape>(value: W): string {
  return JSON.stringify(value, null, 2);
}

function isObjectWidgetValue(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

function formatParseError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
