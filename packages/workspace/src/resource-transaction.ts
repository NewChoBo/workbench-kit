import { workspaceResourceMutationToAction } from './resource-mutation.js';
import type { WorkspaceResourceMutation } from './resource-mutation.js';
import { virtualWorkspaceReducer, type VirtualWorkspaceState } from './virtualWorkspace.js';

export interface WorkspaceResourceTransaction {
  readonly id: string;
  readonly label?: string | undefined;
  readonly mutations: readonly WorkspaceResourceMutation[];
}

let transactionCounter = 0;

export function createWorkspaceResourceTransaction(input: {
  mutations: readonly WorkspaceResourceMutation[];
  id?: string | undefined;
  label?: string | undefined;
}): WorkspaceResourceTransaction {
  transactionCounter += 1;

  return {
    id: input.id ?? `workspace-tx-${transactionCounter}`,
    label: input.label,
    mutations: input.mutations,
  };
}

export function applyWorkspaceResourceMutation(
  state: VirtualWorkspaceState,
  mutation: WorkspaceResourceMutation,
): VirtualWorkspaceState {
  return virtualWorkspaceReducer(state, workspaceResourceMutationToAction(mutation));
}

export function applyWorkspaceResourceTransaction(
  state: VirtualWorkspaceState,
  transaction: WorkspaceResourceTransaction,
): VirtualWorkspaceState {
  return transaction.mutations.reduce(
    (current, mutation) => applyWorkspaceResourceMutation(current, mutation),
    state,
  );
}
