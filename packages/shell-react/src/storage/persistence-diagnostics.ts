import { useEffect, useRef, type MutableRefObject } from 'react';
import type {
  WorkbenchPersistenceDiagnostic,
  WorkbenchPersistenceDiagnosticHandler,
  WorkbenchPersistenceWriteResult,
} from '@workbench-kit/workbench-core';

export type WorkbenchPersistenceDiagnosticHandlerRef = MutableRefObject<
  WorkbenchPersistenceDiagnosticHandler | undefined
>;

export function usePersistenceDiagnosticHandlerRef(
  onDiagnostic: WorkbenchPersistenceDiagnosticHandler | undefined,
): WorkbenchPersistenceDiagnosticHandlerRef {
  const handlerRef = useRef(onDiagnostic);

  useEffect(() => {
    handlerRef.current = onDiagnostic;
  }, [onDiagnostic]);

  return handlerRef;
}

export function useReportPersistenceReadDiagnostic(
  diagnostic: WorkbenchPersistenceDiagnostic | undefined,
  generation: readonly unknown[],
  handlerRef: WorkbenchPersistenceDiagnosticHandlerRef,
): void {
  const lastGenerationRef = useRef<readonly unknown[] | undefined>(undefined);

  useEffect(() => {
    if (isSameGeneration(lastGenerationRef.current, generation)) {
      return;
    }

    lastGenerationRef.current = [...generation];
    if (diagnostic) {
      reportPersistenceDiagnostic(diagnostic, handlerRef);
    }
  }, [diagnostic, generation, handlerRef]);
}

export function reportPersistenceWriteResult(
  result: WorkbenchPersistenceWriteResult,
  handlerRef: WorkbenchPersistenceDiagnosticHandlerRef,
): void {
  if (!result.committed) {
    reportPersistenceDiagnostic(result.diagnostic, handlerRef);
  }
}

export function reportPersistenceDiagnostic(
  diagnostic: WorkbenchPersistenceDiagnostic,
  handlerRef: WorkbenchPersistenceDiagnosticHandlerRef,
): void {
  try {
    handlerRef.current?.(diagnostic);
  } catch {
    // Diagnostics are observational and must not change runtime state.
  }
}

function isSameGeneration(
  left: readonly unknown[] | undefined,
  right: readonly unknown[],
): boolean {
  return (
    left !== undefined &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}
