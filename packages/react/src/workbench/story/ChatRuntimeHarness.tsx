import { useEffect, useMemo, useState } from 'react';
import {
  createChatTransportFromRuntime,
  createWorkspaceFileRepository,
} from '@workbench-kit/adapters';
import {
  createMockWorkbenchRuntime,
  type MockWorkbenchRuntime,
  type MockRuntimeResponsePlan,
  type RuntimeStatus,
} from '@workbench-kit/runtime';
import type {
  ChatTransport,
  ChatStreamEvent,
  WorkspacePatchApplyResult,
  WorkspacePatchEvent,
} from '@workbench-kit/contracts';

import { createDemoRuntimeServices } from '../demo/demoRuntimeServices';
import { ChatPanel } from '../chat/ChatPanel';
import type { ChatMessage } from '../chat/types';
import { StoryEventLog, StorySidebarFrame } from './StorySidebarFrame';

export interface ChatRuntimeHarnessProps {
  response: MockRuntimeResponsePlan;
  title?: string;
  chatTransportFactory?: (runtime: MockWorkbenchRuntime) => ChatTransport;
}

function runtimeStatusLabel(status: RuntimeStatus) {
  if (status === 'running') return 'Runtime running';
  if (status === 'cancelled') return 'Runtime stopped';
  if (status === 'error') return 'Runtime error';
  return 'Runtime idle';
}

function workspacePatchLabel(patch: WorkspacePatchEvent) {
  if (patch.type === 'delete-file') return `Patch delete: ${patch.path}`;
  return `Patch write: ${patch.path}`;
}

function updateMessages(currentMessages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = currentMessages.findIndex((entry) => entry.id === message.id);
  if (index < 0) return [...currentMessages, message];

  const nextMessages = [...currentMessages];
  nextMessages[index] = message;
  return nextMessages;
}

export function ChatRuntimeHarness({
  response,
  title = 'Runtime Chat',
  chatTransportFactory,
}: ChatRuntimeHarnessProps) {
  const runtime = useMemo(
    () =>
      createMockWorkbenchRuntime({
        idPrefix: 'chat-story-message',
        response,
      }),
    [response],
  );
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    runtime.getMessages().map((message) => ({
      content: message.content,
      createdAt: message.createdAt,
      id: message.id,
      label: message.label,
      source: message.source,
    })),
  );
  const [status, setStatus] = useState<RuntimeStatus>(() => runtime.getStatus());
  const [workspacePatchLog, setWorkspacePatchLog] = useState<string[]>([]);
  const chatRuntimeTransport = useMemo(
    () =>
      chatTransportFactory
        ? chatTransportFactory(runtime)
        : createChatTransportFromRuntime({
            runtime,
          }),
    [runtime, chatTransportFactory],
  );
  const repository = useMemo(
    () =>
      createWorkspaceFileRepository({
        files: [],
        createFile: () => undefined,
        deleteFile: () => undefined,
        saveFile: () => undefined,
      }),
    [],
  );
  const extensionRuntime = useMemo(
    () =>
      createDemoRuntimeServices({
        commandContributions: [],
        chatTransport: chatRuntimeTransport,
        repository,
        onChatPatch: (_patch: WorkspacePatchEvent, result: WorkspacePatchApplyResult) => {
          if (result.type === 'patch:failed') {
            setWorkspacePatchLog((currentLog) => [
              ...currentLog,
              `Patch failed: ${result.message}`,
            ]);
            return;
          }

          setWorkspacePatchLog((currentLog) => [...currentLog, workspacePatchLabel(result.patch)]);
        },
      }),
    [chatRuntimeTransport, repository],
  );
  const chatService = extensionRuntime.services.chatService;

  useEffect(() => {
    const unsubscribe = chatService.subscribe((event: ChatStreamEvent) => {
      if (event.type === 'message' || event.type === 'message-delta') {
        setMessages((currentMessages) => updateMessages(currentMessages, event.message));
      }

      if (event.type === 'status') {
        setStatus(event.status);
      }
    });

    return () => {
      unsubscribe();
      extensionRuntime.dispose();
      runtime.dispose();
    };
  }, [chatService, runtime, extensionRuntime]);

  return (
    <StorySidebarFrame variant="chat">
      <ChatPanel
        assistantLabel="Assistant"
        emptyLabel="Start a runtime conversation."
        isRunning={status === 'running'}
        messages={messages}
        placeholder="Ask the mock runtime"
        showTools={false}
        title={title}
        value={draft}
        onCancel={() => chatService.cancel()}
        onSubmit={async (message) => {
          setDraft('');
          try {
            await chatService.sendMessage(message);
          } catch {
            // transport/service failures are expected in baseline failure-path scenarios
          } finally {
            setStatus(chatService.getSnapshot().status);
          }
        }}
        onValueChange={setDraft}
      />
      <StoryEventLog aria-label="Runtime event log">
        <div>{runtimeStatusLabel(status)}</div>
        {workspacePatchLog.map((entry) => (
          <div key={entry}>{entry}</div>
        ))}
      </StoryEventLog>
    </StorySidebarFrame>
  );
}
