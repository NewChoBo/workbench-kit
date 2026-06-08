import type { ChatMessage, ChatMessageSource, WorkspacePatchEvent, WorkspacePatchSource } from '@workbench-kit/contracts';

export type RuntimeChatMessageSource = ChatMessageSource;
export type RuntimeStatus = 'cancelled' | 'error' | 'idle' | 'running';
export type RuntimeWorkspacePatchSource = WorkspacePatchSource;
export type RuntimeWorkspacePatch = WorkspacePatchEvent;
export type RuntimeChatMessage = ChatMessage;

export type WorkbenchRuntimeEvent =
  | {
      message: RuntimeChatMessage;
      type: 'message';
    }
  | {
      delta: string;
      message: RuntimeChatMessage;
      type: 'message-delta';
    }
  | {
      patch: RuntimeWorkspacePatch;
      type: 'workspace-patch';
    }
  | {
      previousStatus: RuntimeStatus;
      status: RuntimeStatus;
      type: 'status';
    };

export type WorkbenchRuntimeListener = (event: WorkbenchRuntimeEvent) => void;
