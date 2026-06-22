import type {
  ResolveWorkbenchCommandExecutionPolicyInput,
  WorkbenchCommandExecutionPolicy,
} from '@workbench-kit/react/workbench';

import { readPersistedLocalPreferences } from './preference-settings-storage.js';

export const WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY =
  'workbench.chat.aiCommandDefaultPolicy';

function isWorkbenchCommandExecutionPolicy(
  value: unknown,
): value is WorkbenchCommandExecutionPolicy {
  return value === 'auto-allow' || value === 'approval-required' || value === 'auto-deny';
}

export function readWorkbenchAiChatCommandPolicyInput(
  storageKey?: string,
  storage?: Pick<Storage, 'getItem'>,
): ResolveWorkbenchCommandExecutionPolicyInput {
  const preferences = readPersistedLocalPreferences(storageKey, storage);
  const configuredDefault = preferences[WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY];

  return {
    defaultPolicy: isWorkbenchCommandExecutionPolicy(configuredDefault)
      ? configuredDefault
      : undefined,
    mutatingDefaultPolicy: 'approval-required',
  };
}

export function createWorkbenchAiChatCommandPolicyById(
  entries: Readonly<Record<string, WorkbenchCommandExecutionPolicy>>,
): ResolveWorkbenchCommandExecutionPolicyInput {
  return {
    policyByCommandId: entries,
  };
}

export function mergeWorkbenchAiChatCommandPolicyInput(
  ...inputs: readonly ResolveWorkbenchCommandExecutionPolicyInput[]
): ResolveWorkbenchCommandExecutionPolicyInput {
  return inputs.reduce<ResolveWorkbenchCommandExecutionPolicyInput>(
    (merged, input) => ({
      defaultPolicy: input.defaultPolicy ?? merged.defaultPolicy,
      mutatingDefaultPolicy: input.mutatingDefaultPolicy ?? merged.mutatingDefaultPolicy,
      policyByCommandId: {
        ...merged.policyByCommandId,
        ...input.policyByCommandId,
      },
    }),
    {},
  );
}
