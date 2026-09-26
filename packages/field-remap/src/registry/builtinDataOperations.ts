import type { DataOperationDefinition } from '@workbench-kit/contracts';
import { trimText, uppercaseText, lowercaseText } from '../domain/operations/textOperations.js';

/** Strict entry points reuse the legacy algorithms without changing legacy coercion. */
export function createBuiltinTextDataOperations(): readonly DataOperationDefinition[] {
  const operations: readonly [string, (value: string) => string][] = [
    ['string:trim', trimText],
    ['string:upper', uppercaseText],
    ['string:lower', lowercaseText],
  ];
  return Object.freeze(
    operations.map(([id, apply]) => {
      return Object.freeze({
        ref: Object.freeze({ id, version: 1 }),
        acceptsInput: (value: unknown) => typeof value === 'string',
        acceptsOutput: (value: unknown) => typeof value === 'string',
        execute: (value: unknown) => apply(value as string),
      });
    }),
  );
}
