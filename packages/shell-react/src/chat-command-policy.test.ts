import { describe, expect, it } from 'vitest';

import {
  WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY,
  mergeWorkbenchAiChatCommandPolicyInput,
  readWorkbenchAiChatCommandPolicyInput,
} from './chat-command-policy.js';

describe('chat-command-policy', () => {
  it('reads host default policy from local preferences', () => {
    const storage = {
      getItem: (key: string) =>
        key === 'workbench-kit/.workbench/settings.local'
          ? JSON.stringify({
              [WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY]: 'auto-deny',
            })
          : null,
      setItem: () => undefined,
    };

    expect(readWorkbenchAiChatCommandPolicyInput(undefined, storage)).toEqual({
      defaultPolicy: 'auto-deny',
      mutatingDefaultPolicy: 'approval-required',
    });
  });

  it('ignores invalid preference values', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          [WORKBENCH_AI_CHAT_COMMAND_DEFAULT_POLICY_KEY]: 'invalid',
        }),
      setItem: () => undefined,
    };

    expect(readWorkbenchAiChatCommandPolicyInput(undefined, storage)).toEqual({
      defaultPolicy: undefined,
      mutatingDefaultPolicy: 'approval-required',
    });
  });

  it('merges policy inputs with later overrides winning', () => {
    expect(
      mergeWorkbenchAiChatCommandPolicyInput(
        {
          defaultPolicy: 'auto-allow',
          policyByCommandId: { 'demo.read': 'auto-deny' },
        },
        {
          defaultPolicy: 'approval-required',
          policyByCommandId: { 'demo.write': 'auto-allow' },
        },
      ),
    ).toEqual({
      defaultPolicy: 'approval-required',
      policyByCommandId: {
        'demo.read': 'auto-deny',
        'demo.write': 'auto-allow',
      },
    });
  });
});
