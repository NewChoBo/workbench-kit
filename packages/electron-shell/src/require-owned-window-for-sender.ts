/**
 * Narrow IPC sender surface. Hosts adapt Electron `WebContents` (or fakes) into this shape.
 * The helper never imports `electron`.
 */
export interface IpcSenderLike {
  readonly id?: number;
}

export class UntrustedIpcSenderError extends Error {
  readonly code = 'untrusted_ipc_sender' as const;

  constructor(message = 'IPC sender is not bound to an owned window.') {
    super(message);
    this.name = 'UntrustedIpcSenderError';
  }
}

/**
 * Resolve an IPC sender to a host-owned window handle, or throw.
 * Hosts own registry membership; kit owns the gate.
 */
export function requireOwnedWindowForSender<TWindow>(
  sender: IpcSenderLike | unknown,
  resolveOwnedWindow: (sender: IpcSenderLike | unknown) => TWindow | null,
): TWindow {
  const windowHandle = resolveOwnedWindow(sender);
  if (windowHandle === null) {
    throw new UntrustedIpcSenderError();
  }
  return windowHandle;
}
