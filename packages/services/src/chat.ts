import type {
  ChatEventServiceListener,
  ChatServiceSnapshot,
  ChatStreamEvent,
  ChatTransport,
  ChatTransportListener,
  WorkspacePatchEvent,
} from '@newchobo-ui/contracts';

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

  constructor({ onPatch, transport }: WorkbenchChatServiceOptions) {
    this.onPatch = onPatch;
    this.transport = transport;
    this.unsubscribeTransport = this.transport.subscribe((event) => this.emit(event));
  }

  dispose() {
    this.unsubscribeTransport?.();
    this.listeners.clear();
  }

  subscribe(listener: ChatTransportListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sendMessage(message: string, context?: Record<string, unknown>) {
    const request = message.trim();
    if (!request) return undefined;

    return this.transport.sendMessage(request, {
      context,
    });
  }

  cancel() {
    this.transport.cancel();
    this.status = 'cancelled';
  }

  getSnapshot(): ChatServiceSnapshot {
    return { status: this.status };
  }

  private emit(event: ChatStreamEvent) {
    if (event.type === 'status') {
      this.status = event.status;
    }

    if (event.type === 'workspace-patch') {
      this.onPatch?.(event.patch);
    }

    this.listeners.forEach((listener) => listener(event));
  }
}
