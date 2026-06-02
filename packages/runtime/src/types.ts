export type RuntimeChatMessageSource = 'assistant' | 'user';
export type RuntimeStatus = 'cancelled' | 'error' | 'idle' | 'running';
export type RuntimeWorkspacePatchSource = 'assistant' | 'user';

export interface RuntimeChatMessage {
  content: string;
  createdAt?: string;
  id: string;
  label?: string;
  source: RuntimeChatMessageSource;
}

export type RuntimeWorkspacePatch =
  | {
      content: string;
      mimeType?: string;
      path: string;
      source?: RuntimeWorkspacePatchSource;
      type: 'write-file';
      updatedAt?: string;
    }
  | {
      path: string;
      type: 'delete-file';
    };

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
