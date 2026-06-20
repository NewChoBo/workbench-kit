import { useCallback, useState } from 'react';
import { ChatPanel, type ChatMessage } from '@workbench-kit/react/workbench/chat';

import { type BuiltinChatViewMode, type BuiltinChatViewRenderData } from './chat-view-data.js';
import {
  useWorkbenchChatCommandSurface,
  type WorkbenchChatCommandRunResult,
} from './chat-command-surface.js';

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

function createAiChatResponse(message: string): ChatMessage {
  return {
    content: `Received: ${message}`,
    createdAt: new Date().toISOString(),
    id: createChatMessageId('ai-chat-assistant'),
    label: 'Assistant',
    source: 'assistant',
  };
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
        onKeyDown={chatCommands.onKeyDown}
        onSubmit={(message) => {
          if (chatCommands.runInputAsCommand(message)) {
            return;
          }

          setDraft('');
          setRuntimeStatus('running');
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              content: message,
              createdAt: new Date().toISOString(),
              id: createChatMessageId('ai-chat-user'),
              source: 'user',
            },
            createAiChatResponse(message),
          ]);
          setRuntimeStatus('idle');
        }}
        onValueChange={setDraft}
      />
    </div>
  );
}
