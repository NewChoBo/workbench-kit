import { isValidElement, type ReactNode } from 'react';
import type { WorkbenchIconDescriptor, WorkbenchIconInput } from './types';

export function isWorkbenchIconDescriptor(value: unknown): value is WorkbenchIconDescriptor {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const kind = (value as WorkbenchIconDescriptor).kind;
  if (kind === 'codicon') {
    return typeof (value as WorkbenchIconDescriptor & { name?: unknown }).name === 'string';
  }

  if (kind === 'node') {
    return 'node' in (value as object);
  }

  return false;
}

export function normalizeWorkbenchIconDescriptor(
  input: WorkbenchIconInput,
): WorkbenchIconDescriptor | ReactNode {
  if (typeof input === 'string') {
    return { kind: 'codicon', name: input };
  }

  if (isWorkbenchIconDescriptor(input)) {
    return input;
  }

  if (
    isValidElement(input) ||
    input === null ||
    input === undefined ||
    typeof input === 'boolean'
  ) {
    return input;
  }

  return input as ReactNode;
}

export function workbenchIconDescriptorToCodiconName(
  descriptor: WorkbenchIconDescriptor,
): string | undefined {
  return descriptor.kind === 'codicon' ? descriptor.name : undefined;
}
