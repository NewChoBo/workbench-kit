import { describe, expect, it } from 'vitest';

import {
  requireOwnedWindowForSender,
  UntrustedIpcSenderError,
} from './require-owned-window-for-sender.js';

describe('requireOwnedWindowForSender', () => {
  it('returns the owned window for a known sender', () => {
    const mainWindow = { kind: 'main' as const };
    const sender = { id: 1 };

    const resolved = requireOwnedWindowForSender(sender, (candidate) => {
      if (
        typeof candidate === 'object' &&
        candidate !== null &&
        'id' in candidate &&
        (candidate as { id?: number }).id === 1
      ) {
        return mainWindow;
      }
      return null;
    });

    expect(resolved).toBe(mainWindow);
  });

  it('throws UntrustedIpcSenderError for an unknown sender', () => {
    const sender = { id: 99 };

    expect(() =>
      requireOwnedWindowForSender(sender, () => null),
    ).toThrow(UntrustedIpcSenderError);

    try {
      requireOwnedWindowForSender(sender, () => null);
    } catch (error) {
      expect(error).toBeInstanceOf(UntrustedIpcSenderError);
      expect((error as UntrustedIpcSenderError).code).toBe('untrusted_ipc_sender');
    }
  });
});
