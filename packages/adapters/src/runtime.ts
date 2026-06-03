import type { ChatStreamEvent, ChatTransport } from '@newchobo-ui/contracts';
import type { WorkbenchRuntimeEvent, MockWorkbenchRuntime } from '@newchobo-ui/runtime';

export interface RuntimeChatTransportOptions {
  runtime: MockWorkbenchRuntime;
}

export function createChatTransportFromRuntime({
  runtime,
}: RuntimeChatTransportOptions): ChatTransport {
  return {
    cancel: () => runtime.cancel(),
    sendMessage: async (message, options) => {
      void options;
      const next = runtime.sendMessage(message);
      if (!next) return undefined;

      return {
        content: next.content,
        createdAt: next.createdAt,
        id: next.id,
        label: next.label,
        source: next.source,
      };
    },
    subscribe: (listener: (event: ChatStreamEvent) => void) =>
      runtime.subscribe((event: WorkbenchRuntimeEvent) => {
        if (event.type === 'message') {
          listener({
            message: {
              content: event.message.content,
              createdAt: event.message.createdAt,
              id: event.message.id,
              label: event.message.label,
              source: event.message.source,
            },
            type: 'message',
          });
          return;
        }

        if (event.type === 'message-delta') {
          listener({
            delta: event.delta,
            message: {
              content: event.message.content,
              createdAt: event.message.createdAt,
              id: event.message.id,
              label: event.message.label,
              source: event.message.source,
            },
            type: 'message-delta',
          });
          return;
        }

        if (event.type === 'status') {
          listener({
            previousStatus: event.previousStatus,
            status: event.status,
            type: 'status',
          });
          return;
        }

        if (event.patch.type === 'delete-file') {
          listener({
            patch: { path: event.patch.path, type: 'delete-file' },
            type: 'workspace-patch',
          });
          return;
        }

        listener({
          patch: {
            content: event.patch.content,
            mimeType: event.patch.mimeType,
            path: event.patch.path,
            source: event.patch.source,
            type: 'write-file',
            updatedAt: event.patch.updatedAt,
          },
          type: 'workspace-patch',
        });
      }),
  };
}

export function emitRuntimeWorkspacePatch({
  runtime,
  patch,
}: {
  runtime: Pick<MockWorkbenchRuntime, 'emitWorkspacePatch'>;
  patch: Parameters<MockWorkbenchRuntime['emitWorkspacePatch']>[0];
}) {
  runtime.emitWorkspacePatch(patch);
}
