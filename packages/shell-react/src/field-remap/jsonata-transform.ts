import jsonata from 'jsonata';
import type { ValueTransformDefinition } from '@workbench-kit/field-remap';

/** Host-registered JSONata expression transform (Stedi-style advanced mapping). */
export const JSONATA_TRANSFORM_ID = 'expr:jsonata' as const;

/** Default wall-clock budget for a single expression evaluation. */
export const DEFAULT_JSONATA_TIMEOUT_MS = 2_000;

/** Default maximum expression source length (characters). */
export const DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH = 4_096;

export interface CreateJsonataValueTransformOptions {
  /** Wall-clock timeout for `evaluate` (default {@link DEFAULT_JSONATA_TIMEOUT_MS}). */
  readonly timeoutMs?: number;
  /**
   * Reject expressions longer than this many characters
   * (default {@link DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH}).
   */
  readonly maxExpressionLength?: number;
}

export function createJsonataValueTransform(
  options: CreateJsonataValueTransformOptions = {},
): ValueTransformDefinition {
  const timeoutMs = options.timeoutMs ?? DEFAULT_JSONATA_TIMEOUT_MS;
  const maxExpressionLength = options.maxExpressionLength ?? DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH;

  return {
    id: JSONATA_TRANSFORM_ID,
    label: 'JSONata expression',
    description:
      'Evaluate a JSONata expression against the source value (host-registered; bounded).',
    category: 'expression',
    inputTypes: ['string', 'number', 'boolean', 'object', 'array', 'unknown'],
    outputType: 'unknown',
    optionFields: [
      {
        key: 'expression',
        label: 'Expression',
        kind: 'string',
      },
    ],
    apply: async (value, context) => {
      const expression =
        typeof context.options?.expression === 'string' ? context.options.expression.trim() : '';
      if (!expression) {
        return value;
      }

      if (expression.length > maxExpressionLength) {
        throw new Error(
          `JSONata expression exceeds max length (${expression.length} > ${maxExpressionLength}).`,
        );
      }

      const compiled = jsonata(expression);
      // jsonata@2.x evaluate returns a Promise (1.x was synchronous).
      return await raceJsonataEvaluation(compiled.evaluate(value), {
        timeoutMs,
        signal: context.signal,
      });
    },
  };
}

/** Default bounded transform (2s timeout, 4k expression cap). */
export const jsonataValueTransform: ValueTransformDefinition = createJsonataValueTransform();

export class JsonataTransformTimeoutError extends Error {
  override readonly name = 'JsonataTransformTimeoutError';

  constructor(timeoutMs: number) {
    super(`JSONata evaluation timed out after ${timeoutMs}ms.`);
  }
}

/** Race a JSONata evaluation against timeout / AbortSignal (exported for unit tests). */
export async function raceJsonataEvaluation<T>(
  evaluation: PromiseLike<T>,
  bounds: { readonly timeoutMs: number; readonly signal?: AbortSignal },
): Promise<T> {
  const { timeoutMs, signal } = bounds;
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return evaluation;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new JsonataTransformTimeoutError(timeoutMs));
    }, timeoutMs);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }),
      );
    };

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    Promise.resolve(evaluation).then(
      (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}
