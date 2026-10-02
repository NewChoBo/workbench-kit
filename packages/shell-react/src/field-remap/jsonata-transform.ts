import jsonata from 'jsonata';
import type { ValueTransformDefinition } from '@workbench-kit/field-remap';

/** Host-registered JSONata expression transform (Stedi-style advanced mapping). */
export const JSONATA_TRANSFORM_ID = 'expr:jsonata' as const;

/** Default evaluation budget, enforced at JSONata checkpoints and by an outer timer. */
export const DEFAULT_JSONATA_TIMEOUT_MS = 2_000;

/** Default maximum expression source length (characters). */
export const DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH = 4_096;

// Larger delays overflow the signed 32-bit timer range in supported runtimes.
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export interface CreateJsonataValueTransformOptions {
  /**
   * Evaluation timeout (default {@link DEFAULT_JSONATA_TIMEOUT_MS}). Must be finite,
   * greater than zero, and at most 2,147,483,647ms; invalid values throw RangeError.
   * Native checkpoints bound JSONata work; the outer timer covers awaited work.
   * Neither interrupts an arbitrary synchronous host function or regex operation.
   */
  readonly timeoutMs?: number;
  /**
   * Reject expressions longer than this many characters
   * (default {@link DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH}).
   * Must be finite and greater than zero; invalid values throw RangeError.
   */
  readonly maxExpressionLength?: number;
}

export function createJsonataValueTransform(
  options: CreateJsonataValueTransformOptions = {},
): ValueTransformDefinition {
  const timeoutMs =
    options.timeoutMs === undefined ? DEFAULT_JSONATA_TIMEOUT_MS : options.timeoutMs;
  const maxExpressionLength =
    options.maxExpressionLength === undefined
      ? DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH
      : options.maxExpressionLength;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMER_DELAY_MS) {
    throw new RangeError(
      'JSONata timeoutMs must be finite, greater than 0, and at most 2147483647.',
    );
  }
  if (!Number.isFinite(maxExpressionLength) || maxExpressionLength <= 0) {
    throw new RangeError('JSONata maxExpressionLength must be finite and greater than 0.');
  }

  // JSONata 2.2.0 implements timeout but omits it from its declarations.
  const evaluationOptions: jsonata.JsonataOptions & { readonly timeout: number } = {
    timeout: timeoutMs,
  };

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

      if (context.signal?.aborted) {
        throw context.signal.reason instanceof Error
          ? context.signal.reason
          : Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
      }

      const compiled = jsonata(expression, evaluationOptions);
      // jsonata@2.x evaluate returns a Promise (1.x was synchronous).
      const evaluation = compiled.evaluate(value).catch((error: unknown) => {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'D1012'
        ) {
          throw new JsonataTransformTimeoutError(timeoutMs);
        }
        throw error;
      });
      return await raceJsonataEvaluation(evaluation, {
        timeoutMs,
        signal: context.signal,
      });
    },
  };
}

/** Default bounded transform (2s cooperative evaluation timeout, 4k expression cap). */
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
