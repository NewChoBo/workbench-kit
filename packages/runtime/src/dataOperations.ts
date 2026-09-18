import type {
  DataOperationDefinition,
  DataOperationDiagnostic,
  DataOperationFailureCode,
  DataOperationRef,
  DataOperationRunner,
} from '@workbench-kit/contracts';

function canonical(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function validRef(ref: DataOperationRef): boolean {
  return !!ref && canonical(ref.id) && Number.isSafeInteger(ref.version) && ref.version > 0;
}

function key(ref: DataOperationRef): string {
  return JSON.stringify([ref.id, ref.version]);
}

class InvocationFailure extends Error {
  constructor(
    readonly diagnostic: DataOperationDiagnostic,
    readonly originalCause: unknown,
  ) {
    super(diagnostic.code);
  }
}

function failure(
  code: DataOperationFailureCode,
  ref: DataOperationRef,
  location: readonly string[],
  cause?: unknown,
): InvocationFailure {
  return new InvocationFailure(
    Object.freeze({
      code,
      operation: Object.freeze({ ...ref }),
      location: Object.freeze([...location]),
    }),
    cause,
  );
}

/** Shared invocation boundary, not a workflow scheduler or a payload sandbox. */
export function createDataOperationRunner(
  definitions: readonly DataOperationDefinition[],
): DataOperationRunner {
  const registry = new Map<string, DataOperationDefinition>();
  for (const definition of definitions) {
    if (
      !validRef(definition.ref) ||
      typeof definition.acceptsInput !== 'function' ||
      typeof definition.acceptsOutput !== 'function' ||
      typeof definition.execute !== 'function'
    ) {
      throw new Error('Invalid data operation definition');
    }
    const id = key(definition.ref);
    if (registry.has(id)) throw new Error('Duplicate data operation reference');
    registry.set(id, Object.freeze({ ...definition, ref: Object.freeze({ ...definition.ref }) }));
  }

  return {
    async run(ref, input, options) {
      let remaining = options?.maxInvocations;
      let budgetFailure: InvocationFailure | undefined;
      const signal = options?.signal;
      const initialLocation = options?.location ?? [];
      if (
        !Number.isSafeInteger(remaining) ||
        remaining <= 0 ||
        !Array.isArray(initialLocation) ||
        ![...initialLocation].every(canonical)
      ) {
        return {
          ok: false,
          diagnostic: failure('invalid-request', ref, []).diagnostic,
          cause: undefined,
        };
      }

      async function invoke(
        request: DataOperationRef,
        value: unknown,
        path: readonly string[],
      ): Promise<unknown> {
        const address = Object.freeze([...path]);
        const operation = Object.freeze({ ...request });
        const check = () => {
          if (signal?.aborted) throw failure('cancelled', operation, address, signal.reason);
          if (budgetFailure) throw budgetFailure;
        };
        check();
        if (!validRef(operation)) throw failure('invalid-request', operation, address);
        const definition = registry.get(key(operation));
        if (!definition) throw failure('unknown-operation', operation, address);
        let accepted: boolean;
        try {
          accepted = definition.acceptsInput(value);
        } catch (cause) {
          throw failure('validation-failed', operation, address, cause);
        }
        check();
        if (accepted !== true) throw failure('invalid-input', operation, address);
        if (remaining === 0) {
          budgetFailure = failure('budget-exceeded', operation, address);
          throw budgetFailure;
        }
        remaining -= 1;
        let output: unknown;
        let active = true;
        try {
          output = await definition.execute(
            value,
            Object.freeze({
              signal,
              location: address,
              invoke(child: DataOperationRef, childInput: unknown, segment: string) {
                if (!active || !canonical(segment))
                  return Promise.reject(failure('invalid-request', child, address));
                return invoke(child, childInput, [...address, segment]);
              },
            }),
          );
        } catch (cause) {
          if (cause instanceof InvocationFailure) throw cause;
          check();
          throw failure('execution-failed', operation, address, cause);
        } finally {
          active = false;
        }
        check();
        try {
          accepted = definition.acceptsOutput(output);
        } catch (cause) {
          throw failure('validation-failed', operation, address, cause);
        }
        check();
        if (accepted !== true) throw failure('invalid-output', operation, address);
        return output;
      }

      try {
        return { ok: true, value: await invoke(ref, input, initialLocation) };
      } catch (cause) {
        const error =
          cause instanceof InvocationFailure
            ? cause
            : failure('execution-failed', ref, initialLocation, cause);
        return { ok: false, diagnostic: error.diagnostic, cause: error.originalCause };
      }
    },
  };
}
