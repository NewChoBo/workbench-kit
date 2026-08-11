import {
  isWorkbenchCommandExecutionPolicy,
  type ResolveWorkbenchCommandExecutionPolicyInput,
} from '@workbench-kit/react/workbench';
import type { WorkbenchStorageReader } from '@workbench-kit/workbench-core';

import { readPersistedLocalPreferences } from '../management/preference-settings-storage.js';

export const WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY = 'workbench.chat.aiCommandDefaultPolicy';

export function readWorkbenchAiChatCommandPolicyInput(
  storageKey?: string,
  storage?: WorkbenchStorageReader,
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
