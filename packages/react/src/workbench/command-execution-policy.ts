import type { WorkbenchCommandDescriptor, WorkbenchCommandExecutionPolicy } from './command-model';

export interface ResolveWorkbenchCommandExecutionPolicyInput {
  /** Fallback for non-mutating commands without an explicit policy. */
  defaultPolicy?: WorkbenchCommandExecutionPolicy | undefined;
  /** Fallback for mutating commands without an explicit policy. */
  mutatingDefaultPolicy?: WorkbenchCommandExecutionPolicy | undefined;
  /** Host overrides keyed by command id. */
  policyByCommandId?: Readonly<Record<string, WorkbenchCommandExecutionPolicy>> | undefined;
}

const policyLabels: Record<WorkbenchCommandExecutionPolicy, string> = {
  'auto-allow': 'Auto allow',
  'approval-required': 'Approval required',
  'auto-deny': 'Auto deny',
};

export function isWorkbenchCommandExecutionPolicy(
  value: unknown,
): value is WorkbenchCommandExecutionPolicy {
  return value === 'auto-allow' || value === 'approval-required' || value === 'auto-deny';
}

export function getWorkbenchCommandExecutionPolicyLabel(policy: WorkbenchCommandExecutionPolicy) {
  return policyLabels[policy];
}

function isMutatingWorkbenchCommand(descriptor: WorkbenchCommandDescriptor) {
  if (descriptor.danger) {
    return true;
  }

  if (descriptor.sideEffect && descriptor.sideEffect !== 'none') {
    return true;
  }

  if (descriptor.metadata?.requiresApproval === true) {
    return true;
  }

  return false;
}

export function resolveWorkbenchCommandExecutionPolicy(
  descriptor: WorkbenchCommandDescriptor,
  input: ResolveWorkbenchCommandExecutionPolicyInput = {},
): WorkbenchCommandExecutionPolicy {
  if (descriptor.executionPolicy) {
    return descriptor.executionPolicy;
  }

  const hostPolicy = input.policyByCommandId?.[descriptor.id];
  if (hostPolicy) {
    return hostPolicy;
  }

  const mutatingDefault = input.mutatingDefaultPolicy ?? 'approval-required';
  const nonMutatingDefault = input.defaultPolicy ?? 'auto-allow';

  return isMutatingWorkbenchCommand(descriptor) ? mutatingDefault : nonMutatingDefault;
}
