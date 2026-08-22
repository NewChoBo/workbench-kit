import {
  convertMappedInputs,
  isAbortError,
  type ConvertMappedInputsInput,
  type ConvertToShapeResult,
} from '@workbench-kit/field-remap';

import type { FieldRemapPreviewState } from './preview.js';

export type FieldRemapPreviewCommand =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'no-sample' }
  | {
      readonly kind: 'evaluate';
      readonly input: Omit<ConvertMappedInputsInput, 'signal'>;
    };

type FieldRemapPreviewEvaluator = (
  input: ConvertMappedInputsInput,
) => Promise<ConvertToShapeResult>;

export interface FieldRemapPreviewController {
  readonly getSnapshot: () => FieldRemapPreviewState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly update: (command: FieldRemapPreviewCommand) => void;
  readonly dispose: () => void;
}

/** Package-private execution owner. Public Flow surfaces consume only its snapshot. */
export function createFieldRemapPreviewController(
  evaluate: FieldRemapPreviewEvaluator = convertMappedInputs,
): FieldRemapPreviewController {
  let snapshot: FieldRemapPreviewState = {
    status: 'unavailable',
    reason: 'no-sample',
  };
  let generation = 0;
  let disposed = false;
  let abortController: AbortController | undefined;
  const listeners = new Set<() => void>();

  const publish = (next: FieldRemapPreviewState): void => {
    if (disposed) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) {
        return () => {};
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (command) => {
      if (disposed) {
        return;
      }

      abortController?.abort();
      generation += 1;
      const currentGeneration = generation;
      abortController = undefined;

      if (command.kind !== 'evaluate') {
        publish({ status: 'unavailable', reason: command.kind });
        return;
      }

      const controller = new AbortController();
      abortController = controller;
      publish({ status: 'loading' });

      void evaluate({ ...command.input, signal: controller.signal })
        .then((result) => {
          if (disposed || controller.signal.aborted || currentGeneration !== generation) {
            return;
          }
          publish({ status: 'ready', result });
        })
        .catch((error: unknown) => {
          if (
            disposed ||
            controller.signal.aborted ||
            currentGeneration !== generation ||
            isAbortError(error)
          ) {
            return;
          }
          publish({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        });
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      generation += 1;
      abortController?.abort();
      abortController = undefined;
      listeners.clear();
    },
  };
}
