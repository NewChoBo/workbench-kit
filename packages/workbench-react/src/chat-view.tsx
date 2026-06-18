import { useEffect, useMemo, useState } from 'react';
import {
  createChatTransportFromRuntime,
  createIntegratedShellChatRuntimeResponse,
  integratedShellInitialChattingMessages,
} from '@workbench-kit/adapters';
import type { ChatStreamEvent } from '@workbench-kit/contracts';
import { ChatPanel, type ChatMessage } from '@workbench-kit/react/workbench/chat';
import { createMockWorkbenchRuntime, type RuntimeStatus } from '@workbench-kit/runtime';
import { WorkbenchChatService } from '@workbench-kit/services';

import './chat-view.css';

export const BUILTIN_CHAT_VIEW_RENDER_KIND = 'workbench-kit.builtin.chat.view' as const;

export type BuiltinChatViewMode = 'aiChat' | 'chatting';

export interface BuiltinChatViewRenderData {
  readonly kind: typeof BUILTIN_CHAT_VIEW_RENDER_KIND;
  readonly mode: BuiltinChatViewMode;
}

export function isBuiltinChatViewRenderData(value: unknown): value is BuiltinChatViewRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<BuiltinChatViewRenderData>;
  return (
    candidate.kind === BUILTIN_CHAT_VIEW_RENDER_KIND &&
    (candidate.mode === 'chatting' || candidate.mode === 'aiChat')
  );
}

export function BuiltinChatView({ mode }: { mode: BuiltinChatViewMode }) {
  if (mode === 'aiChat') {
    return <BuiltinAiChatView />;
  }

  return <BuiltinChattingView />;
}

function runtimeMessagesToChatMessages(
  messages: ReturnType<ReturnType<typeof createMockWorkbenchRuntime>['getMessages']>,
): ChatMessage[] {
  return messages.map((message) => ({
    content: message.content,
    id: message.id,
    label: message.label,
    source: message.source,
  }));
}

function updateMessages(currentMessages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = currentMessages.findIndex((entry) => entry.id === message.id);
  if (index < 0) return [...currentMessages, message];

  const nextMessages = [...currentMessages];
  nextMessages[index] = message;
  return nextMessages;
}

function BuiltinChattingView() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    integratedShellInitialChattingMessages.map((message) => ({
      content: message.content,
      id: message.id,
      label: message.label,
      source: message.source,
    })),
  );

  return (
    <div className="workbench-chat-view">
      <ChatPanel
        assistantLabel="Peer"
        emptyLabel="Start a conversation with your team."
        messages={messages}
        placeholder="Message your team"
        title="Chatting"
        value={draft}
        onSubmit={(message) => {
          setDraft('');
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              content: message,
              id: `chatting-user-${Date.now()}`,
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
  const runtime = useMemo(
    () =>
      createMockWorkbenchRuntime({
        idPrefix: 'workbench-chat-view',
        response: (message) => createIntegratedShellChatRuntimeResponse(message),
      }),
    [],
  );
  const chatRuntimeTransport = useMemo(
    () => createChatTransportFromRuntime({ runtime }),
    [runtime],
  );
  const chatService = useMemo(
    () =>
      new WorkbenchChatService({
        transport: chatRuntimeTransport,
      }),
    [chatRuntimeTransport],
  );
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    runtimeMessagesToChatMessages(runtime.getMessages()),
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(() => runtime.getStatus());

  useEffect(() => {
    const unsubscribe = chatService.subscribe((event: ChatStreamEvent) => {
      if (event.type === 'message' || event.type === 'message-delta') {
        setMessages((currentMessages) => updateMessages(currentMessages, event.message));
      }

      if (event.type === 'status') {
        setRuntimeStatus(event.status);
      }
    });

    return () => {
      unsubscribe();
      chatService.dispose();
      runtime.dispose();
    };
  }, [chatService, runtime]);

  return (
    <div className="workbench-chat-view">
      <ChatPanel
        assistantLabel="Assistant"
        disabled={runtimeStatus === 'error'}
        emptyLabel="Ask about this workspace."
        isRunning={runtimeStatus === 'running'}
        messages={messages}
        placeholder="Ask about this workspace"
        showTools
        title="AI Chat"
        value={draft}
        onCancel={() => chatService.cancel()}
        onSubmit={(message) => {
          setDraft('');
          void chatService.sendMessage(message);
        }}
        onValueChange={setDraft}
      />
    </div>
  );
}
