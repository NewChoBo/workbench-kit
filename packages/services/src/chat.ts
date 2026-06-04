import type {
  ChatEventServiceListener,
  ChatServiceSnapshot,
  ChatStreamEvent,
  ChatTransport,
  ChatTransportListener,
  WorkspacePatchEvent,
} from '@workbench-kit/contracts';

export interface WorkbenchChatServiceOptions {
  onPatch?: (patch: WorkspacePatchEvent) => void;
  transport: ChatTransport;
}

export class WorkbenchChatService {
  private readonly listeners = new Set<ChatEventServiceListener>();
  private readonly onPatch?: (patch: WorkspacePatchEvent) => void;
  private readonly transport: ChatTransport;
  private status: ChatServiceSnapshot['status'] = 'idle';
  private unsubscribeTransport?: () => void;
  private disposed = false;

  constructor({ onPatch, transport }: WorkbenchChatServiceOptions) {
    this.onPatch = onPatch;
    this.transport = transport;
    this.unsubscribeTransport = this.transport.subscribe((event) => this.emit(event));
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unsubscribeTransport?.();
    this.unsubscribeTransport = undefined;
    this.listeners.clear();
  }

  subscribe(listener: ChatTransportListener) {
    if (this.disposed) {
      return () => undefined;
    }

    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sendMessage(message: string, context?: Record<string, unknown>) {
    if (this.disposed) {
      return undefined;
    }

    const request = message.trim();
    if (!request) return undefined;
    this.status = 'running';

    try {
      return await this.transport.sendMessage(request, {
        context,
      });
    } catch (error) {
      if (!this.disposed) {
        this.status = 'error';
      }
      throw error;
    }
  }

  cancel() {
    if (this.disposed) {
      return;
    }

    this.transport.cancel();
    this.status = 'cancelled';
  }

  getSnapshot(): ChatServiceSnapshot {
    return { status: this.status };
  }

  private emit(event: ChatStreamEvent) {
    if (this.disposed) {
      return;
    }

    if (event.type === 'status') {
      this.status = event.status;
    }

    if (event.type === 'workspace-patch') {
      try {
        this.onPatch?.(event.patch);
      } catch {
        this.status = 'error';
      }
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        this.status = 'error';
      }
    });
  }
}
