# AI Chat command execution policy

Workbench Kit lets hosts decide how AI-proposed commands are executed before they reach `executeCommand`.

## Policy values

| Policy | Behavior |
| --- | --- |
| `auto-allow` | Execute immediately when the proposal is rendered |
| `approval-required` | Show a proposal card with **Allow** / **Deny** |
| `auto-deny` | Block execution and show a blocked status |

## Resolution order

1. `WorkbenchCommandDescriptor.executionPolicy`
2. Host `policyByCommandId` map (`ResolveWorkbenchCommandExecutionPolicyInput`)
3. Safe defaults:
   - Mutating commands (`danger`, non-`none` `sideEffect`, or `metadata.requiresApproval`) → `approval-required`
   - Other commands → `auto-allow` (or host `defaultPolicy`)

Resolver: `resolveWorkbenchCommandExecutionPolicy` in `@workbench-kit/react`.

## Message shape

Assistant chat messages may include `commandProposals`:

```ts
interface ChatCommandProposal {
  id: string;
  commandId: string;
  label?: string;
  description?: string;
  args?: readonly unknown[];
  policy: WorkbenchCommandExecutionPolicy;
  status: 'pending' | 'running' | 'allowed' | 'denied' | 'blocked' | 'executed' | 'failed';
}
```

UI: `ChatCommandProposalCard` (rendered from `ChatMessageItem`).

## Host configuration (shell-react)

- Preference key: `workbench.chat.aiCommandDefaultPolicy` (non-mutating default)
- Helpers: `readWorkbenchAiChatCommandPolicyInput`, `mergeWorkbenchAiChatCommandPolicyInput`
- Runtime hook: `useWorkbenchChatCommandProposals`

Builtin AI Chat mock (`BuiltinAiChatView`) emits sample proposals for non-empty prompts and applies policies through the hook.

## Slash commands

User-typed `/command.id` in chat composers is unchanged. This track is for AI-proposed commands only.

## Follow-ups

- Wire real LLM tool-call payloads into `commandProposals`
- Surface policy defaults in Settings UI
- Batch approval for multiple proposals in one assistant turn
