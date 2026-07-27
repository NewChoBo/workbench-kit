/**
 * Allowlisted IPC helpers for preload scripts.
 * Never forward raw ipcRenderer to the page — only these wrappers leave preload.
 */

export class DisallowedIpcChannelError extends Error {
  readonly channel: string;

  constructor(channel: string) {
    super(`IPC channel "${channel}" is not allowlisted for the preload bridge.`);
    this.name = 'DisallowedIpcChannelError';
    this.channel = channel;
  }
}

export type PreloadInvoke = (channel: string, ...args: unknown[]) => Promise<unknown>;
export type PreloadSubscribe = (
  channel: string,
  listener: (...args: unknown[]) => void,
) => () => void;

export interface CreateAllowlistedInvokeOptions {
  readonly allowedChannels: ReadonlySet<string> | readonly string[];
  readonly invoke: PreloadInvoke;
}

export interface CreateAllowlistedSubscribeOptions {
  readonly allowedChannels: ReadonlySet<string> | readonly string[];
  readonly subscribe: PreloadSubscribe;
}

function toChannelSet(channels: ReadonlySet<string> | readonly string[]): ReadonlySet<string> {
  return channels instanceof Set ? channels : new Set(channels);
}

/** Wrap invoke so only allowlisted channels can be called. */
export function createAllowlistedInvoke(options: CreateAllowlistedInvokeOptions): PreloadInvoke {
  const allowed = toChannelSet(options.allowedChannels);
  return async (channel, ...args) => {
    if (!allowed.has(channel)) {
      throw new DisallowedIpcChannelError(channel);
    }
    return options.invoke(channel, ...args);
  };
}

/** Wrap subscribe so only allowlisted push channels can be observed. */
export function createAllowlistedSubscribe(
  options: CreateAllowlistedSubscribeOptions,
): PreloadSubscribe {
  const allowed = toChannelSet(options.allowedChannels);
  return (channel, listener) => {
    if (!allowed.has(channel)) {
      throw new DisallowedIpcChannelError(channel);
    }
    return options.subscribe(channel, listener);
  };
}
