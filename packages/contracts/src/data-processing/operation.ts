/** Definition version, independent of the npm package version. */
export interface DataOperationRef {
  readonly id: string;
  readonly version: number;
}

export type DataOperationFailureCode =
  | 'invalid-request'
  | 'unknown-operation'
  | 'invalid-input'
  | 'invalid-output'
  | 'validation-failed'
  | 'execution-failed'
  | 'cancelled'
  | 'budget-exceeded';

export interface DataOperationDiagnostic {
  readonly code: DataOperationFailureCode;
  readonly operation: DataOperationRef;
  readonly location: readonly string[];
}

export type DataOperationResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly diagnostic: DataOperationDiagnostic; readonly cause: unknown };

export interface DataOperationContext {
  readonly signal: AbortSignal | undefined;
  readonly location: readonly string[];
  /** Nested calls share this run's budget and cancellation. Failures reject. */
  invoke(ref: DataOperationRef, input: unknown, locationSegment: string): Promise<unknown>;
}

export interface DataOperationDefinition {
  readonly ref: DataOperationRef;
  readonly acceptsInput: (value: unknown) => boolean;
  readonly acceptsOutput: (value: unknown) => boolean;
  readonly execute: (
    input: unknown,
    context: DataOperationContext,
  ) => unknown | PromiseLike<unknown>;
}

export interface DataOperationRunOptions {
  readonly maxInvocations: number;
  readonly signal?: AbortSignal;
  readonly location?: readonly string[];
}

export interface DataOperationRunner {
  run(
    ref: DataOperationRef,
    input: unknown,
    options: DataOperationRunOptions,
  ): Promise<DataOperationResult>;
}
