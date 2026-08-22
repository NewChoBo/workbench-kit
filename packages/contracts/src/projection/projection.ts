export type WorkbenchProjectionKind =
  | 'FULL_GRAPH'
  | 'GUI_BUILDER'
  | 'FORM_OR_INSPECTOR'
  | 'CODE_OR_SCHEMA'
  | 'PREVIEW'
  | 'END_USER_PRESENTATION';

export type WorkbenchEditableProjectionKind =
  'FULL_GRAPH' | 'GUI_BUILDER' | 'FORM_OR_INSPECTOR' | 'CODE_OR_SCHEMA';

export type WorkbenchRuntimeProjectionKind = 'PREVIEW' | 'END_USER_PRESENTATION';

export type WorkbenchEditableProjectionAuthority = 'AUTHORITATIVE_EDITABLE' | 'ROUND_TRIP_EDITABLE';

export type WorkbenchReadOnlyProjectionAuthority = 'DERIVED_READ_ONLY' | 'RUNTIME_ONLY';

export type WorkbenchProjectionAuthority =
  WorkbenchEditableProjectionAuthority | WorkbenchReadOnlyProjectionAuthority;

export type WorkbenchProjectionRevision = string;

export interface WorkbenchProjectionDescriptorBase {
  readonly id: string;
  readonly documentKind: string;
  readonly projectionVersion: number;
  readonly kind: WorkbenchProjectionKind;
}

export interface WorkbenchEditableProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly kind: WorkbenchEditableProjectionKind;
  readonly authority: WorkbenchEditableProjectionAuthority;
}

export interface WorkbenchDerivedProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly authority: 'DERIVED_READ_ONLY';
}

export interface WorkbenchRuntimeProjectionDescriptor extends WorkbenchProjectionDescriptorBase {
  readonly kind: WorkbenchRuntimeProjectionKind;
  readonly authority: 'RUNTIME_ONLY';
}

export type WorkbenchReadOnlyProjectionDescriptor =
  WorkbenchDerivedProjectionDescriptor | WorkbenchRuntimeProjectionDescriptor;

export type WorkbenchProjectionDescriptor =
  WorkbenchEditableProjectionDescriptor | WorkbenchReadOnlyProjectionDescriptor;

export interface WorkbenchProjectionSnapshot<
  TValue,
  TDescriptor extends WorkbenchProjectionDescriptor = WorkbenchProjectionDescriptor,
> {
  readonly descriptor: TDescriptor;
  readonly canonicalRevision: WorkbenchProjectionRevision;
  readonly value: TValue;
}

export interface WorkbenchProjectionTransaction<TOperation> {
  readonly id: string;
  readonly projectionId: string;
  readonly baseRevision: WorkbenchProjectionRevision;
  readonly operations: readonly TOperation[];
}

export type WorkbenchProjectionRejectionCode =
  'invalid-operation' | 'unsupported-operation' | 'expired-transaction' | 'capacity-exceeded';

export type WorkbenchProjectionFailureCode = 'unavailable' | 'commit-failed';

export type WorkbenchProjectionTransactionResult<TConflict = never> =
  | {
      readonly status: 'applied';
      readonly transactionId: string;
      readonly canonicalRevision: WorkbenchProjectionRevision;
    }
  | {
      readonly status: 'conflict';
      readonly transactionId: string;
      readonly currentRevision: WorkbenchProjectionRevision;
      readonly conflicts: readonly TConflict[];
    }
  | {
      readonly status: 'rejected';
      readonly transactionId: string;
      readonly canonicalRevision: WorkbenchProjectionRevision;
      readonly code: WorkbenchProjectionRejectionCode;
    }
  | {
      readonly status: 'failed';
      readonly transactionId: string;
      readonly code: 'commit-failed';
      readonly canonicalRevision: WorkbenchProjectionRevision;
    }
  | {
      readonly status: 'failed';
      readonly transactionId: string;
      readonly code: 'unavailable';
      readonly lastKnownRevision?: WorkbenchProjectionRevision | undefined;
    };

export interface WorkbenchEditableProjectionPort<TValue, TOperation, TConflict = never> {
  readonly descriptor: WorkbenchEditableProjectionDescriptor;
  getSnapshot(): WorkbenchProjectionSnapshot<TValue, WorkbenchEditableProjectionDescriptor>;
  createTransaction(operations: readonly TOperation[]): WorkbenchProjectionTransaction<TOperation>;
  applyTransaction(
    transaction: WorkbenchProjectionTransaction<TOperation>,
  ): Promise<WorkbenchProjectionTransactionResult<TConflict>>;
}

export interface WorkbenchReadOnlyProjectionPort<TValue> {
  readonly descriptor: WorkbenchReadOnlyProjectionDescriptor;
  getSnapshot(): WorkbenchProjectionSnapshot<TValue, WorkbenchReadOnlyProjectionDescriptor>;
}

export type WorkbenchProjectionPort<TValue, TOperation = never, TConflict = never> =
  | WorkbenchEditableProjectionPort<TValue, TOperation, TConflict>
  | WorkbenchReadOnlyProjectionPort<TValue>;

const EDITABLE_KINDS = new Set<WorkbenchProjectionKind>([
  'FULL_GRAPH',
  'GUI_BUILDER',
  'FORM_OR_INSPECTOR',
  'CODE_OR_SCHEMA',
]);

const RUNTIME_KINDS = new Set<WorkbenchProjectionKind>(['PREVIEW', 'END_USER_PRESENTATION']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isWorkbenchProjectionDescriptor(
  value: unknown,
): value is WorkbenchProjectionDescriptor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const descriptor = value as Record<string, unknown>;
  if (
    !isNonEmptyString(descriptor.id) ||
    !isNonEmptyString(descriptor.documentKind) ||
    !Number.isInteger(descriptor.projectionVersion) ||
    (descriptor.projectionVersion as number) < 1 ||
    typeof descriptor.kind !== 'string' ||
    typeof descriptor.authority !== 'string'
  ) {
    return false;
  }

  const kind = descriptor.kind as WorkbenchProjectionKind;
  switch (descriptor.authority) {
    case 'AUTHORITATIVE_EDITABLE':
    case 'ROUND_TRIP_EDITABLE':
      return EDITABLE_KINDS.has(kind);
    case 'DERIVED_READ_ONLY':
      return EDITABLE_KINDS.has(kind) || RUNTIME_KINDS.has(kind);
    case 'RUNTIME_ONLY':
      return RUNTIME_KINDS.has(kind);
    default:
      return false;
  }
}
