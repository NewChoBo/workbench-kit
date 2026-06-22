import { useCallback, useMemo, useState } from 'react';
import { ChatPanel, type ChatMessage } from '@workbench-kit/react/workbench/chat';

import {
  createMockAiChatCommandProposals,
  createMockAiChatResponseContent,
} from './chat-ai-mock-proposals.js';
import {
  readWorkbenchAiChatCommandPolicyInput,
  mergeWorkbenchAiChatCommandPolicyInput,
} from './chat-command-policy.js';
import {
  useWorkbenchChatCommandSurface,
  type WorkbenchChatCommandRunResult,
} from './chat-command-surface.js';
import { type BuiltinChatViewMode, type BuiltinChatViewRenderData } from './chat-view-data.js';
import { useWorkbenchChatCommandProposals } from './use-workbench-chat-command-proposals.js';
import { useWorkbenchCommandDescriptors } from './use-workbench-command-descriptors.js';

export type { BuiltinChatViewMode, BuiltinChatViewRenderData };
export { BUILTIN_CHAT_VIEW_RENDER_KIND, isBuiltinChatViewRenderData } from './chat-view-data.js';

type BuiltinChatRuntimeStatus = 'idle' | 'running' | 'error';

const initialChattingMessages: readonly ChatMessage[] = [
  {
    content: 'Share updates here while working in the workspace.',
    id: 'workbench-chatting-intro',
    label: 'Alex',
    source: 'assistant',
  },
];

const initialAiChatMessages: readonly ChatMessage[] = [
  {
    content: 'Ask about the workspace or run a command with `/command.id`.',
    id: 'workbench-ai-chat-intro',
    label: 'Assistant',
    source: 'assistant',
  },
];

export function BuiltinChatView({ mode }: { mode: BuiltinChatViewMode }) {
  if (mode === 'aiChat') {
    return <BuiltinAiChatView />;
  }

  return <BuiltinChattingView />;
}

function createChatCommandFeedbackMessage(result: WorkbenchChatCommandRunResult): ChatMessage {
  const title = result.label ?? result.commandId;
  const status =
    result.status === 'success' ? `Ran command \`${title}\`.` : `Command failed: \`${title}\`.`;

  return {
    content: result.message ? `${status}\n\n${result.message}` : status,
    createdAt: new Date().toISOString(),
    id: `chat-command-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: 'Workbench',
    source: 'assistant',
  };
}

function createChatMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function BuiltinChattingView() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...initialChattingMessages]);
  const appendCommandResult = useCallback((result: WorkbenchChatCommandRunResult) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createChatCommandFeedbackMessage(result),
    ]);
  }, []);
  const chatCommands = useWorkbenchChatCommandSurface({
    onCommandResult: appendCommandResult,
    onValueChange: setDraft,
    value: draft,
  });

  return (
    <div className="workbench-chat-view">
      <ChatPanel
        assistantLabel="Alex"
        commandLabel="Show commands"
        commandSuggestPopover={chatCommands.commandSuggestPopover}
        composerRef={chatCommands.composerRef}
        emptyLabel="Start a conversation with your team."
        messageLayout="peer"
        messages={messages}
        placeholder="Message your team"
        title="Chat"
        userLabel="Jay"
        value={draft}
        onCommandClick={chatCommands.onCommandClick}
        onKeyDown={chatCommands.onKeyDown}
        onSubmit={(message) => {
          if (chatCommands.runInputAsCommand(message)) {
            return;
          }

          setDraft('');
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              content: message,
              createdAt: new Date().toISOString(),
              id: createChatMessageId('chatting-user'),
              source: 'user',
            },
          ]);
        }}
        onValueChange={setDraft}
      />
    </div>
  );
}

function BuiltinAiChatView() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...initialAiChatMessages]);
  const [runtimeStatus, setRuntimeStatus] = useState<BuiltinChatRuntimeStatus>('idle');
  const commands = useWorkbenchCommandDescriptors();
  const policyInput = useMemo(
    () =>
      mergeWorkbenchAiChatCommandPolicyInput(readWorkbenchAiChatCommandPolicyInput(), {
        policyByCommandId: {
          'workbench.togglePrimarySidebar': 'approval-required',
        },
      }),
    [],
  );
  const appendCommandResult = useCallback((result: WorkbenchChatCommandRunResult) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createChatCommandFeedbackMessage(result),
    ]);
  }, []);
  const chatCommands = useWorkbenchChatCommandSurface({
    onCommandResult: appendCommandResult,
    onValueChange: setDraft,
    value: draft,
  });
  const { createProposalHandlers, enrichMessageProposals, processAutoPolicies } =
    useWorkbenchChatCommandProposals({
      commands,
      onCommandResult: appendCommandResult,
      policyInput,
    });
  const proposalHandlers = useMemo(
    () => createProposalHandlers(setMessages),
    [createProposalHandlers],
  );

  return (
    <div className="workbench-chat-view">
      <ChatPanel
        assistantLabel="Assistant"
        commandLabel="Show commands"
        commandSuggestPopover={chatCommands.commandSuggestPopover}
        composerRef={chatCommands.composerRef}
        disabled={runtimeStatus === 'error'}
        emptyLabel="Ask about this workspace."
        isRunning={runtimeStatus === 'running'}
        messageLayout="assistant"
        messages={messages}
        placeholder="Ask about this workspace"
        showTools
        title="AI Chat"
        value={draft}
        onCancel={() => setRuntimeStatus('idle')}
        onCommandClick={chatCommands.onCommandClick}
        onCommandProposalAllow={proposalHandlers.onProposalAllow}
        onCommandProposalDeny={proposalHandlers.onProposalDeny}
        onKeyDown={chatCommands.onKeyDown}
        onSubmit={(message) => {
          if (chatCommands.runInputAsCommand(message)) {
            return;
          }

          setDraft('');
          setRuntimeStatus('running');

          const assistantMessageId = createChatMessageId('ai-chat-assistant');
          const rawProposals = createMockAiChatCommandProposals(message);
          const commandProposalsForMessage = enrichMessageProposals(rawProposals);
          const assistantMessage: ChatMessage = {
            commandProposals: commandProposalsForMessage.length
              ? commandProposalsForMessage
              : undefined,
            content: createMockAiChatResponseContent(message),
            createdAt: new Date().toISOString(),
            id: assistantMessageId,
            label: 'Assistant',
            source: 'assistant',
          };

          setMessages((currentMessages) => [
            ...currentMessages,
            {
              content: message,
              createdAt: new Date().toISOString(),
              id: createChatMessageId('ai-chat-user'),
              source: 'user',
            },
            assistantMessage,
          ]);
          processAutoPolicies(setMessages, assistantMessageId, commandProposalsForMessage);
          setRuntimeStatus('idle');
        }}
        onValueChange={setDraft}
      />
    </div>
  );
}
